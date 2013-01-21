var settings = require('./settings.js');

//database name
exports.databaseUrl = "pkstatus";
// collections name
exports.collections = ["punks"];

// schema
exports.schema = {
  punk : {
    name: 'default',
    fullName: 'John Doe',
    email: 'test@example.com',
    imgUrl: '/images/default-portrait.png',
    team: 'default',
    hardStatus: 'Available',
    softStatus: 'Hello World!'
  }
}


exports.hardStatuses = settings.hardStatuses;
exports.people = settings.people;
exports.teams = settings.teams