var _ = require("underscore");

module.exports = function(options, db) {
  return new Chats(options, db);
}

function Chats(options, db) {
  var self = this;

  // Say something.
  self.create = function(who, room, what, callback) {
    var chat = {
      who: who,
      room: room,
      what: what,
      when: new Date()
    };
    db.chats.save(chat, callback);
  }

  // Invokes the callback with an error if any, then with
  // an array of all chats between the Date objects 
  // options.from and options.to. For simplicity we send
  // chats for all rooms and let the client decide which
  // rooms are currently interesting.
  //
  // If options.from is missing, the start of the
  // current day is assumed. If options.to is missing,
  // chats through the present time are assumed. 
  //
  // If options.fromExclusive is true, chats from exactly
  // options.from are not matched. If options.toExclusive
  // is true, chats from exactly options.to are not matched.
  //
  // Since two people may speak in the same millisecond and
  // you may not get both of those chats right away,
  // clients should be prepared to ignore chats
  // they have already displayed and look for those
  // that they haven't.

  self.find = function(options, callback) {
    console.log('in find');
    if (!callback) {
      callback = options;
    }
    if (!options.from) {
      var now = new Date();
      options.from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }    
    if (!options.to) {
      var now = new Date();
      options.to = now;
    }
    var gt = options.fromExclusive ? '$gt' : '$gte';
    var query = { };
    var gtClause = {};
    var ltClause = {};
    if (options.fromExclusive) {
      gtClause = { when: { $gt: options.from }};
    } else {
      gtClause = { when: { $gte: options.from }};
    }
    if (options.toExclusive) {
      ltClause = { when: { $lt: options.to }};
    } else {
      ltClause = { when: { $lte: options.to }};
    }
    var query = { $and: [gtClause, ltClause] };
    console.log('LOGGING QUERY');
    console.log(JSON.stringify(query));
    return db.chats.find(query, callback);
  }  
}
