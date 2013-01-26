var express = require('express')
  , http = require('http')
  , path = require('path')
  , gravatar = require('gravatar')
  , passport = require('passport')
  , minimatch = require('minimatch')
  , crypto = require('crypto')
  , _ = require('underscore');

var settings = require('./config.js');

// Global db object so we can have more than one model .js file sharing the db

// The list of collection names is not really configuration file stuff as your app will
// not work without those we expect, so hardcode those here. -Tom
var db = require("mongojs").connect(settings.db.url, ['punks', 'chats']);

var people = require('./model/people')(settings.db, db);
var chats = require('./model/chats')(settings.db, db);

var app = express();

// Part of user authentication for socket.io stuff
var namesBySocketKey = {};

// Useful for private messaging
var socketsByName = {};

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

// Main page, with initial load of punks and recent chats. Use
// middleware functions to pull all that data gracefully without 
// deeply nested callbacks. 

app.get('/', 
  function(req, res, next) {
    people.find(function(err, docs) {
      req.punks = docs;
      next();
    });
  },
  function(req, res, next) {
    chats.find(function(err, docs) {
      req.chats = docs;
      next();
    });
  },
  function(req, res) {
    res.render('index', { title: 'Punks', me: req.user, socketKey: req.session.socketKey, punks: req.punks, statuses: settings.hardStatuses, chats: req.chats 
    });
  }
);

app.get('/punks', function(req, res) {
  people.find(function(err, docs) {
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
  people.findOne(req.params.name, function(err, punk) {
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
    emitToAll('update', data);
  });
});

//fire up the server with socket io attached. set it to listen to the port specified above
var server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// Listen for connections
io.sockets.on('connection', function (socket) {
  console.log('socket connection');
  socket.on('auth', function(data) {
    var socketKey = data.socketKey;
    console.log('auth message');
    if (namesBySocketKey[socketKey]) {
      console.log('key is good');
      // This user is now authenticated for this socket
      socket.name = namesBySocketKey[socketKey];
      // All sockets associated with an authenticated user
      socketsByName[socket.name] = socket;
      // Now we can accept other incoming messages
      socket.on('chat', function(chat) {
        // Save the chat in the db, then rebroadcast it to logged-in users.
        chats.create(socket.name, chat.room, chat.what, function(err, chat) {
          emitToAll('chat', chat);
        });
      });
    } else {
      console.log('key is not good');
      // I don't know you buddy!
      socket.disconnect();
    }
  });
});

// Send to every authenticated socket.
//
// "Why don't you use io.sockets.emit to broadcast?" Because that would
// send stuff to sockets that haven't authenticated yet. -Tom

function emitToAll(message, data) {
  _.each(socketsByName, function(socket) {
      socket.emit(message, data);
  });
}

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
    people.findOne(req.user.name, function(err, person) {
      if (person) {
        return after();
      }
      console.log('calling create');
      people.create(req.user.name, function(err, person) {
        console.log('callback of create');
        if (!err) {
          return after();
        } else {
          throw err;
        }
      });
      // Stash an identifier in the session that we will
      // accept later to associate this user with a socket.
      // This is necessary because socket.io can't always
      // see session cookies (read up on what happens when
      // the flash transport is used). The workarounds are
      // all pretty grim, I like this better
      function after() {
        if (!req.session.socketKey) {
          req.session.socketKey = makeId();
          console.log('established socket key ' + req.session.socketKey);
          namesBySocketKey[req.session.socketKey] = req.user.name;
        }
        return next();
      }
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
    if (req.user) {
      delete socketsByName[req.user.name];
      delete namesBySocketKey[req.session.socketKey];
      delete req.session.socketKey;
    }
    req.logOut();
    res.render('loggedOut', {  });
  });
}

// Make a really really random identifier

function makeId() {
  var buf = crypto.randomBytes(16);
  return buf.toString('hex');
}

