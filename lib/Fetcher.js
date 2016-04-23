var HttpFetcher = require('./http/NodeHttpFetcher.js'),
    HttpConnectionsStream = require('./http/HttpConnectionsStream'),
    HttpEntryPoint = require('./http/HttpEntryPoint'),
    MergeSortStream = require('merge-sort-stream'),
    util = require('util'),
    async = require('async'),
    EventEmitter = require('events');

var Fetcher = function (config) {
  EventEmitter.call(this);
  this._config = config;
  this._entrypoints = config.entrypoints || [];
  this.http = new HttpFetcher(10, config.enableCache || false); // 10 concurrent requests max.
  var self = this;
  this.http.on('request', function (url) {
    self.emit('request', url);
  });
  this.http.on('response', function (url) {
    self.emit('response', url);
  });
  this._connectionsStreams = []; // Holds array of streams
  this._mergeStream = null;
}

util.inherits(Fetcher, EventEmitter);

Fetcher.prototype.close = function (query) {
  for (var i in this._connectionsStreams) {
    this._connectionsStreams[i].close();
  }
};

Fetcher.prototype.buildConnectionsStream = function (query, cb) {
  //Get the connections from the Web
  var self = this;
  var connectionsStream = null;
  async.forEachOf(this._entrypoints, function (entryUrl, i, done) {
    new HttpEntryPoint(entryUrl, self.http)
      .fetchFirstUrl(query.departureTime)
      .then(function (url) {
        if (i === 0) {
          connectionsStream = new HttpConnectionsStream(url, self.http, query.departureTime);
          self._connectionsStreams.push(connectionsStream);
        } else {
          var cS = new HttpConnectionsStream(url, self.http, query.departureTime);
          self._connectionsStreams.push(cS);
          connectionsStream = new MergeSortStream(connectionsStream, cS, function (connectionA, connectionB) {
            return connectionB.departureTime - connectionA.departureTime;
          });
        }
        done();
      }, function (error) {
        console.error(error);
      });
  }, function (error) {
    cb(connectionsStream);
  });
};

module.exports = Fetcher;
