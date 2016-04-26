var Planner = require('csa').BasicCSA,
    HttpFetcher = require('./http/NodeHttpFetcher.js'),
    Fetcher = require('./Fetcher');

var Client = function (config) {
  // Validate config
  this._config = config;
  this._numberOfQueries = 0; //Number of queries being ran
  //Create an HTTP interface, which is the data interface
  this._http = new HttpFetcher(10, config.enableCache || false); // 10 concurrent requests max.
}

Client.prototype.query = function (q, cb) {
  // Create fetcher: will create streams for a specific query
  var fetcher = new Fetcher(this._config, this._http);
  //1. Validate query
  if (q.departureTime) {
    q.departureTime = new Date(q.departureTime);
  } else {
    throw "Date of departure not set";
  }
  if (!q.departureStop) {
    throw "Location of departure not set";
  }
  this._numberOfQueries ++;
  var query = q, self = this;
  query.index = this._numberOfQueries-1;
  
  //2. Use query to configure the data fetchers
  fetcher.buildConnectionsStream(q, function (connectionsStream) {
    //3. fire results using CSA.js and return the stream
    var planner = new Planner(q);
    //When a result is found, stop the stream
    planner.on("result", function () {
      fetcher.close();
    });
    cb(connectionsStream.pipe(planner), fetcher, connectionsStream);
  });
};

if (typeof window !== "undefined") {
  window.lc = {
    Client : Client,
    Fetcher: Fetcher
  };
}

module.exports = Client;
module.exports.Fetcher = Fetcher;
module.exports.HttpFetcher = HttpFetcher;
