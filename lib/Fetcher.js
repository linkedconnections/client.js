var HttpFetcher = require('./http/HttpFetcher'),
    HttpConnectionsStream = require('./http/HttpConnectionsStream');

var Fetcher = function (config) {
  this._config = config;
  this.http = new HttpFetcher(20); // 20 concurrent requests max.
}

Fetcher.prototype.buildConnectionsStream = function (query) {
  //Get the connections from the Web
  var url = 'http://localhost:8080/connections?departureTime=' + query.departureTime.toISOString().replace(':00\.000Z','');
  var stream = new HttpConnectionsStream(url, this.http);
  return stream;  
};

module.exports = Fetcher;
