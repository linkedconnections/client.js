var ConnectionsStream = require('./ConnectionsFetcher'),
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
    var newConnectionsStream = new ConnectionsStream(entryUrl, self._http, query.departureTime);
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
    cb(connectionsStream);
  });
};

module.exports = Fetcher;
