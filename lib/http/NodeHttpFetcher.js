/*! @license ©2013 Ruben Verborgh, 2016 Pieter Colpaert - Data Science Lab / iMinds / Ghent University */
/** A HttpFetcher downloads documents through HTTP. The NodeHttpFetcher implements this for nodejs useage (for the browser, check out BrowserHttpFetcher.js) */

var q = require('q'),
    http = require('follow-redirects/http'),
    util = require('util'),
    URLParser = require('url'),
    zlib = require('zlib');
    EventEmitter = require('events');

// Creates a new HttpFetcher
function HttpFetcher(maxParallel) {
  EventEmitter.call(this);
  this._queue = [];    // Queue of request execution functions
  this._active = {};   // Hash of active requests
  this._pending = 0;   // The number of currently active requests
  this._maxParallel = maxParallel || 10; // Only execute this many requests in parallel
}

util.inherits(HttpFetcher, EventEmitter);

// Returns a promise for the HTTP GET request's result
HttpFetcher.prototype.get = function (url) {
  return this.request(url, 'GET');
};

// Returns a promise for the HTTP request's result
HttpFetcher.prototype.request = function (url, methodName) {
  this.emit('request', url);
  var method = methodName || 'GET', requestId = methodName + url;
  // First check whether the request was already pending
  if (requestId in this._active)
    return this._active[requestId].result;
  // If not, prepare to make a request
  var self = this, deferred = q.defer();

  // Request execution function
  function execute() {
    // Check whether the request is pending in the meantime
    if (requestId in self._active)
      return deferred.resolve(self._active[requestId].result);
    // If not, start the request
    var parsedUrl = URLParser.parse(url);
    var headers = { 'Accept': 'application/ld+json;q=1.0',
                    'User-Agent' : 'lc-client command line interface',
                    'Accept-Encoding': 'gzip, deflate'
                  },
        settings = { hostname: parsedUrl.host, path: parsedUrl.path, headers: headers, timeout: 5000, method: method},
        activeRequest = http.request(settings, function (res) {
          var encoding = res.headers['content-encoding']
          var responseStream = res;
          if (encoding && encoding == 'gzip') {
            responseStream = res.pipe(zlib.createGunzip());
          } else if (encoding && encoding == 'deflate') {
            responseStream = res.pipe(zlib.createInflate())
          }
          var responseBody = '';
          var chunks = [];
          responseStream.on('data', function (chunk) {
            chunks.push(chunk);
          });
          res.on('error', function (error) {
            onResponse(error);
          });
          responseStream.on('end', function () {
            onResponse(null, res, chunks.join(''));
          })
        });
    
    activeRequest.on('error', function (e) {
      deferred.reject(e.message);
    });
    activeRequest.end();
    // Mark the request as active
    self._active[requestId] = { request: activeRequest, result: deferred.promise };
    self._pending++;
  }

  // Response callback
  function onResponse(error, response, body) {
    var responseUrl;
    // Walkaround for https://github.com/olalonde/follow-redirects/issues/32
    if (response.fetchedUrls.length > 1) {
      responseUrl = response.fetchedUrls[0];
    } else {
      responseUrl = url;
    }
    console.log(responseUrl);
    // Remove the request from the active list
    delete self._active[requestId];
    self._pending--;
    self.emit('response', url);
    // Schedule a possible pending call
    var next = self._queue.shift();
    if (next) {
      process.nextTick(next);
    }

    // Return result through the deferred
    if (error) {
      if (error.code === "ETIMEDOUT") {
        console.error("retrying: " + url);
        return deferred.resolve(self.get(url));
      } else {
        return deferred.reject(new Error(error));
      }
    }
    if (response.statusCode >= 500) {
      return deferred.reject(new Error('Request failed: ' + url));
    }
    var contentType = /^[^;]+/.exec(response.headers['content-type'] || 'text/html')[0];
    // for the url, take the last redirect url that can be found if there was a redirect
    deferred.resolve({ url: responseUrl, type: contentType, body: body, status: response.statusCode });
  }

  // Execute if possible, queue otherwise
  if (this._pending < this._maxParallel)
    execute();
  else
    this._queue.push(execute);

  return deferred.promise;
};

// Cancels all pending requests
HttpFetcher.prototype.cancelAll = function () {
  for (var id in this._active)
    this._active[id].request.abort();
  this._active = {};
  this._queue = [];
};

module.exports = HttpFetcher;
