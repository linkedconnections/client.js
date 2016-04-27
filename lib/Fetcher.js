var HttpConnectionsStream = require('./http/HttpConnectionsStream'),
    HttpEntryPoint = require('./http/HttpEntryPoint'),
    MergeSortStream = require('merge-sort-stream'),
    util = require('util'),
    async = require('async'),
    EventEmitter = require('events');

var Fetcher = function (config, http) {
  EventEmitter.call(this);
  this._config = config;
  this._http = http;
  this._entrypoints = config.entrypoints || [];
  this._connectionsStreams = []; // Holds array of streams
  this._mergeStream = null;
}

util.inherits(Fetcher, EventEmitter);

Fetcher.prototype.close = function () {
  //close all connection streams that are attached to this query
  for (var i in this._connectionsStreams) {
    this._connectionsStreams[i].close();
  }
};

Fetcher.prototype.buildConnectionsStream = function (query, cb) {
  //Get the connections from the Web
  var self = this;
  var connectionsStream = null;
  async.forEachOf(this._entrypoints, function (entryUrl, i, done) {
    var entry = new HttpEntryPoint(entryUrl, self._http)
        .on('request', function (resourceUrl) {self.emit('request', resourceUrl);})
        .on('response', function (resourceUrl) {self.emit('response', resourceUrl);})
        .on('processed', function (resourceUrl) {self.emit('processed', resourceUrl);});

    entry.fetchFirstUrl(query.departureTime).then(function (url) {
      var newConnectionsStream = new HttpConnectionsStream(url, self._http, query.departureTime)
          .on('request', function (resourceUrl) {
            self.emit('request', resourceUrl);
          }).on('response', function (resourceUrl) {
            self.emit('response', resourceUrl);
          }).on('processed', function (resourceUrl) {
            self.emit('processed', resourceUrl);
          });
      if (i === 0) {
        connectionsStream = newConnectionsStream;
        self._connectionsStreams = [newConnectionsStream];
      } else {
        self._connectionsStreams.push(newConnectionsStream);
        connectionsStream = new MergeSortStream(connectionsStream, newConnectionsStream, function (connectionA, connectionB) {
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
