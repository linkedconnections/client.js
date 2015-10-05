var Planner = require('csa'),
    Fetcher = require('./Fetcher');

var Client = function (config) {
  // Validate config
  this._config = config;
  // Create fetcher
  this._fetcher = new Fetcher(this._config);
}

Client.prototype.query = function (q, cb) {
  //1. Validate query
  if (q.departureTime) {
    q.departureTime = new Date(q.departureTime);
  } else {
    throw "Date of departure not set";
  }
  if (!q.departureStop) {
    throw "Location of departure not set";
  }
  if (!q.arrivalStop) {
    throw "Location of arrival not set";
  }
  var query = q;
  
  //2. Use query to configure the data fetchers
  this._fetcher.buildConnectionsStream(q, function (connectionsStream) {
    //3. fire results using CSA.js and return the stream
    var planner = new Planner({
      departureStop: q.departureStop,
      arrivalStop: q.arrivalStop,
      departureTime: q.departureTime
    });
    cb(connectionsStream.pipe(planner));
  });
};

if (typeof window !== "undefined") {
  window.lc = {
    Client : Client
  };
}

module.exports = Client;
