var express = require('express')
  , routes = require('./routes')
  , people = require('./routes/people')
  , http = require('http')
  , path = require('path')
  , gravatar = require('gravatar');

var app = express();

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
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//setting up the routes:
app.get('/', routes.index);

/*
TO DO!!!! : In some kind of config file, define an array of 
possible statuses and possible teams. use these to populate the
index.js file. it will make less markup and the app more flexible
*/

//TO DO!!! : Add email column to db. Connect gravitar so it pulls in avatars based on email.
app.get('/punks', function(req, res){
  people.list(req, res)
});

app.get('/punks/statuses', function(req, res){
  people.getStatuses(req, res, function(statuses) {
    res.send(statuses);
  });
});

app.get('/punks/generate', function(req, res){
  console.log('attempting to generate')
  people.generate(req, res)
});

app.get('/punks/:name', function(req, res){
  people.showPunk(req.params.name, function(err, punk) {
    res.send(punk);
  })
});

app.get('/punks/add/:name', function(req, res){
  people.createPunk(req.params.name, res)
});

app.get('/punks/remove/:name', function(req, res){
  people.deletePunk(req.params.name, res)
});

app.post('/punks/update/:name', function(req, res){
  people.update(req.params.name, req.body.punk, res, function(err, name, data){
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

