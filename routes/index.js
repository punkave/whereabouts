var dbConfig = require("../config/dbConfig.js");
var db = require("mongojs").connect(dbConfig.databaseUrl, dbConfig.collections);

exports.index = function(req, res) {
  console.log(req.user);
  db.punks.find(function(err, docs) {
    res.render('index', { title: 'Punks', me: req.user, punks: docs, statuses: dbConfig.hardStatuses });
  });
}
