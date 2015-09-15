var Planner = require('csa'),
    Fetcher = require('./Fetcher');

var Client = function (config) {
  // Validate config
  this._config = config;
  // Create fetcher
  this._fetcher = new Fetcher(this._config);
}

Client.prototype.query = function (q) {
  //1. Validate query
  if (q.departureTime) {
    q.departureTime = new Date(q.departureTime);
  } else {
    throw "Date of departure not set";
  }
  if (!q.from) {
    throw "Location of departure not set";
  }
  if (!q.to) {
    throw "Date of departure not set";
  }
  var query = q;
  
  //2. Use query to configure the data fetchers
  var connectionsStream = this._fetcher.buildConnectionsStream(q);
  //3. fire results using CSA.js and return the stream
  var planner = new Planner({
    departureStop: q.from,
    arrivalStop: q.to,
    departureTime: q.departureTime
  });
  return connectionsStream.pipe(planner);
};

module.exports = Client;
