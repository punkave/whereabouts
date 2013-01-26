// Load the actual configuration file

module.exports = settings = require('./config/settings.js');

// Push down any app level settings the model layer should also know about,
// do any other massaging of the configuration that is convenient to do
// before it is accessed by other code

settings.db.domain = settings.domain;
