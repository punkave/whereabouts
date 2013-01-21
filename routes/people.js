var jQuery = require('jQuery');
var _ = require("underscore");
var gravatar = require('gravatar');
var dbConfig = require("../config/dbConfig.js");
var db = require("mongojs").connect(dbConfig.databaseUrl, dbConfig.collections);

exports.list = function(req, res){
  db.punks.find(function(err, docs) {
    res.send(docs);
  });
};

exports.generate = function(req, res){
  var people = dbConfig.people;
  var teams = dbConfig.teams;

  _.each(people, function(index) {
    index.imgUrl = gravatar.url( index.email, {s: '60', r: 'pg', d: '404'});
    index.team = 'default';
    index.hardStatus = 'Available';
    index.softStatus = 'Hello World!';
    console.log(index);
  });

  db.punks.save(people, function(err, saved) {
    if( err || !saved ) console.log("There was a problem");
    else console.log("...");
  });

  res.send('Generating your people from the config/settings.js file')
};

exports.showPunk = function(name, callback) {
  db.punks.find({name:name}, function(err, doc) {
    if( err ) {
      console.log(err);
    } else {
      callback(null, doc);
    }
  });
}

exports.getStatuses = function(req, res, callback) {
  callback(dbConfig.hardStatuses);
}

exports.createPunk = function(name, res) {
  this.punk = dbConfig.schema.punk;
  this.punk.name = name;
  res.send(this.punk);

  db.punks.save(this.punk, function(err, saved) {
    if( err || !saved ) console.log("There was a problem");
    else console.log("punk "+name+" was saved, I think");
  });
}

exports.deletePunk = function(name) {
  db.punks.remove({name: name}, function(err, saved) {
    if( err || !saved ) console.log("There was a problem");
    else console.log("punk "+name+" was deleted, I think");
  });
}

exports.update = function(name, punk, res, callback) {
  db.punks.find({name:name}, function(err, doc) {
    db.punks.update({name:name}, {$set: punk}, function(err){
      if( err ) {
        console.log(err);
      } else {
        callback(null, name, punk);
      }
    });
  });
}
