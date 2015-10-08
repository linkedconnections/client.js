var HttpFetcher = require('./http/HttpFetcher'),
    HttpConnectionsStream = require('./http/HttpConnectionsStream'),
    HttpEntryPoint = require('./http/HttpEntryPoint');

var Fetcher = function (config) {
  this._config = config;
  this._entrypoints = [];
  for (var k in config.entrypoints) {
    this._entrypoints.push(config.entrypoints[k]);
  }
  this.http = new HttpFetcher(20); // 20 concurrent requests max.
  this._connectionsStream = {};
}

Fetcher.prototype.close = function () {
  this._connectionsStream.close();
};

Fetcher.prototype.buildConnectionsStream = function (query, cb) {
  //Get the connections from the Web
  var self = this;
  var entry = new HttpEntryPoint(this._entrypoints[0], this.http);
  entry.fetchFirstUrl(query.departureTime).then(function (url) {
    self._connectionsStream = new HttpConnectionsStream(url, self.http);
    cb(self._connectionsStream);
  }, function (error) {
    console.error(error);
  });
};

module.exports = Fetcher;
