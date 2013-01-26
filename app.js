var express = require('express')
  , http = require('http')
  , path = require('path')
  , gravatar = require('gravatar')
  , passport = require('passport')
  , minimatch = require('minimatch');

var settings = require('./config/settings.js');

var db = require("mongojs").connect(settings.db.url, settings.db.collections);

var people = require('./model/people')(settings.db, db);

var app = express();

// TODO: this needs to be part of a global config file,
// but right now only the people module can see a 
// config file. Some refactoring is needed around that.
// validUser can be determined from dbConfig.domain but
// we don't see that in this file right now

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
  // AFTER static
  configurePassport();
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//setting up the routes:

app.get('/', function(req, res) {
  db.punks.find(function(err, docs) {
    res.render('index', { title: 'Punks', me: req.user, punks: docs, statuses: settings.hardStatuses });
  });
});

app.get('/punks', function(req, res) {
  db.punks.find(function(err, docs) {
    res.send(docs);
  });
});

app.get('/punks/statuses', function(req, res) {
  res.send(settings.hardStatuses);
});

// gmail says who the valid punks are. Log in and 
// you show up thereafter

// app.get('/punks/generate', function(req, res) {
//   console.log('attempting to generate');
//   people.generate(function(err) {
//      res.send('Hooray');
//   });
// });

app.get('/punks/:name', function(req, res){
  people.find(req.params.name, function(err, punk) {
    res.send(punk);
  })
});

// Do these make sense? Google Auth decides who is a
// valid user, not us. And we'd need to secure it. -Tom

// app.get('/punks/add/:name', function(req, res){
//   people.createPunk(req.params.name, res)
// });

// app.get('/punks/remove/:name', function(req, res){
//   people.deletePunk(req.params.name, res)
// });

app.post('/punks/update/:name', function(req, res) {
  // Secure updates by username. TODO: api keys as an
  // alternative, for bots?
  if (req.user.name !== req.params.name) {
    res.statusCode = 403;
    return res.send('That\'s not you!');
  }
  people.update(req.params.name, req.body.punk, function(err, name, data) {
    data.name = name;
    app.socket.emit('update', data);
  });
});

//fire up the server with socket io attached. set it to listen to the port specified above
var server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// turn on the socket...
io.sockets.on('connection', function (socket) {
  app.socket = socket;
});

// Set up user authentication
function configurePassport()
{
  var auth = settings.auth;
  var GoogleStrategy = require('passport-google').Strategy;
  passport.use(new GoogleStrategy(
    auth.google,
    function(identifier, profile, done) {
      // Create a user object from the most useful bits of their profile.
      // With google their email address is their unique id.
      // Since we're building a status board for a domain
      // we can take 'name' from the part before the @.

      var matches = profile.emails[0].value.match(/^(.*)?\@/);
      var name = matches[1];
      var user = { 
        email: profile.emails[0].value,
        name: name,
        displayName: profile.displayName 
      };
      return done(null, user);
    }
  ));

  // It's up to us to tell Passport how to store the current user in the session, and how to take
  // session data and get back a user object. We could store just an id in the session and go back
  // and forth to the complete user object via MySQL or MongoDB lookups, but since the user object
  // is small, we'll save a round trip to the database by storign the user
  // information directly in the session in JSON string format.

  passport.serializeUser(function(user, done) {
    done(null, JSON.stringify(user));
  });

  passport.deserializeUser(function(json, done) {
    var user = JSON.parse(json);
    if (user) {
      return done(null, user);
    } else {
      return done(new Error("Bad JSON string in session"), null);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Global middleware must appear before ANY routes in order
  // to work. This middleware makes sure you're supposed
  // to be here. URLs starting with /auth/
  // are exempt to avoid chicken and egg problems

  app.use(function(req, res, next) {
    if (minimatch(req.url, '/auth/**')) {
      return next();
    }
    if (!req.user) {
      return res.redirect('/auth/google');
    }
    if (!minimatch(req.user.email, auth.validUser)) {
      res.statusCode = 403;
      return res.send('That gmail address is not in the correct domain.');
    }
    // A valid user, are they in the db yet?
    // If not get their defaults set up so they
    // become visible
    console.log('finding punk');
    people.find(req.user.name, function(err, person) {
      if (person) {
        return next();
      }
      console.log('calling create');
      people.create(req.user.name, function(err, person) {
        console.log('callback of create');
        if (!err) {
          return next();
        }
      });
    });
  });

  // Borrowed from http://passportjs.org/guide/google.html

  // Redirect the user to Google for authentication.  When complete, Google
  // will redirect the user back to the application at
  // /auth/twitter/callback
  app.get('/auth/google', passport.authenticate('google'));

  // Twitter will redirect the user to this URL after approval.  Finish the
  // authentication process by attempting to obtain an access token.  If
  // access was granted, the user will be logged in.  Otherwise,
  // authentication has failed.
  app.get('/auth/google/callback', 
    passport.authenticate('google', 
      { 
        successRedirect: '/',
        failureRedirect: '/' 
      }
    )
  );

  app.get('/auth/logout', function(req, res)
  {
    console.log('logging out');
    req.logOut();
    res.render('loggedOut', {  });
  });
}
