var Readable = require('stream').Readable,
    jsonld = require('jsonld'),
    moment = require('moment'),
    util = require('util');

//This class fetches 1 stream of Connections from a Connections Stream Server
//A jsonld-stream is generated
var HttpConnectionsStream = function (starturl, http, departureTime) {
  Readable.call(this, {objectMode: true});
  this._url = starturl;
  this._http = http; //http fetcher with a limited amount of concurrent requests
  this._connections = [];
  this["@context"] = {
    "lc" : "http://semweb.mmlab.be/ns/linkedconnections#",
    "Connection" : "http://semweb.mmlab.be/ns/linkedconnections#Connection",
    "gtfs" : "http://vocab.gtfs.org/terms#",
    "arrivalTime" : "http://semweb.mmlab.be/ns/linkedconnections#arrivalTime",
    "arrivalStop" : {
      "@id": "http://semweb.mmlab.be/ns/linkedconnections#arrivalStop",
      "@type": "@id"
    },
    "departureTime" : "http://semweb.mmlab.be/ns/linkedconnections#departureTime",
    "departureStop" : {
      "@id": "http://semweb.mmlab.be/ns/linkedconnections#departureStop",
      "@type": "@id"
    },
    "hydra" : "http://www.w3.org/ns/hydra/core#"
  };
  this._isFirstPage = true;
  this._starturl = starturl;
  this._departureTime = moment(departureTime);
};

util.inherits(HttpConnectionsStream, Readable);

HttpConnectionsStream.prototype.close = function () {
  this.push(null);
};

HttpConnectionsStream.prototype._fetchNextPage = function () {
  var self = this;
  if (self._isFirstPage && self._url != self._starturl) {
    self._isFirstPage = false;
  }
  self.emit('request', self._url);
  return this._http.get(this._url).then(function (result) {
    self.emit('response', self._url);
    var document = JSON.parse(result.body);
    //find next page and all connection by framing the pages according to our own context
    self._url = document.nextPage;
    return document["@graph"];
  }, function (error) {
    //we have received an error, let's close the stream and output the error
    console.error("Error: ", error);
    self.push(null);
  });
};

HttpConnectionsStream.prototype._pushNewConnection = function (connection) {
  if (connection["departureTime"]) {
    connection["departureTime"] = new Date(connection["departureTime"]);
  }
  if (connection["arrivalTime"]) {
    connection["arrivalTime"] = new Date(connection["arrivalTime"]);
  }
  this.push(connection);
}

HttpConnectionsStream.prototype._read = function () {
  if (this._connections.length === 0) {
    var self = this;
    this._fetchNextPage().then(function (connections) {
      if (connections.length === 0) {
        self._read();
      } else {
        self._connections = connections;
        var c = self._connections.shift();
        if (self._isFirstPage) {
          while (self._connections.length > 0 && moment(c["departureTime"]).isBefore(self._departureTime)) {
            c = self._connections.shift();
          }
        }
        self._pushNewConnection(c);
      }
    });
  } else {
    this._pushNewConnection(this._connections.shift());
  }
};

module.exports = HttpConnectionsStream;
