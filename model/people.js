var _ = require("underscore");
var gravatar = require('gravatar');

module.exports = function(options, db) {
  return new People(options, db);
}

function People(options, db) {
  var self = this;

  // Not currently used, gmail is authoritative about who is a punk
  // self.generate = function(callback){
  //   var people = options.people;
  //   var teams = options.teams;

  //   _.each(people, function(person) {
  //     self.addDefaults(person);
  //     console.log(person);
  //   });

  //   db.punks.save(people, function(err, saved) {
  //     if( err || !saved ) {
  //       return callback(err ? err : 'no users');
  //     }
  //     // All good
  //     return callback(null);
  //   });
  // };

  // Populate a person object with standard stuff.
  // You should set person.name and person.email first

  self.addDefaults = function(person) {
    person.team = 'default';
    person.hardStatus = 'Available';
    person.softStatus = 'Hello World!';
    person.imgUrl = gravatar.url( person.email, {s: '60', r: 'pg', d: '404'});
  };

  // Find ALL the punks
  self.find = function(callback) {
    return db.punks.find(callback);
  }

  // Find one punk by username
  self.findOne = function(name, callback) {
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

  self.create = function(name, callback) {
    var person = { };
    person.name = name;
    person.email = name + '@' + options.domain;
    self.addDefaults(person);

    console.log("CALLBACK");
    console.log(callback);
    db.punks.save(person, callback);
  }

  self.remove = function(name) {
    db.punks.remove({name: name}, function(err, saved) {
      if( err || !saved ) console.log("There was a problem");
      else console.log("punk "+name+" was deleted, I think");
    });
  }

  self.update = function(name, punk, callback) {
    db.punks.update({name:name}, {$set: punk}, function(err) {
      if( err ) {
        return callback(err);
      } else {
        return callback(null, name, punk);
      }
    });
  }

}
