var jQuery = require('jQuery');
var _ = require("underscore");
var gravatar = require('gravatar');
var dbConfig = require("../config/dbConfig.js");
var db = require("mongojs").connect(dbConfig.databaseUrl, dbConfig.collections);

var people = exports;

exports.list = function(req, res){
  db.punks.find(function(err, docs) {
    res.send(docs);
  });
};

exports.generate = function(req, res){
  var people = dbConfig.people;
  var teams = dbConfig.teams;

  _.each(people, function(person) {
    personDefaults(person);
    console.log(person);
  });

  db.punks.save(people, function(err, saved) {
    if( err || !saved ) console.log("There was a problem");
    else console.log("...");
  });

  res.send('Generating your people from the config/settings.js file')
};

exports.personDefaults = function(person) {
  person.team = 'default';
  person.hardStatus = 'Available';
  person.softStatus = 'Hello World!';
  
};

exports.findPunk = function(name, callback) {
  db.punks.findOne({name:name}, function(err, doc) {
    console.log('did a find');
    if( err ) {
      console.log('error');
      console.log(err);
      return callback(err);
    } else {
      console.log('sending a document');
      console.log(doc);
      return callback(null, doc);
    }
  });
}

exports.getStatuses = function(req, res, callback) {
  callback(dbConfig.hardStatuses);
}

exports.createPunk = function(name, callback) {
  var person = dbConfig.schema.punk;
  person.name = name;
  person.email = name + '@' + dbConfig.domain;
  person.imgUrl = gravatar.url( person.email, {s: '60', r: 'pg', d: 'mm'}, true);
  people.personDefaults(person);

  console.log("CALLBACK");
  console.log(callback);
  db.punks.save(person, callback);
}

exports.deletePunk = function(name) {
  db.punks.remove({name: name}, function(err, saved) {
    if( err || !saved ) console.log("There was a problem");
    else console.log("punk "+name+" was deleted, I think");
  });
}

exports.update = function(name, punk, res, callback) {
  db.punks.update({name:name}, {$set: punk}, function(err){
    if( err ) {
      console.log(err);
    } else {
      callback(null, name, punk);
    }
  });
}
