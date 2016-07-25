var jsonld = require('jsonld'),
    UriTemplate = require('uritemplate'),
    EventEmitter = require('events'),
    util = require('util');

var HttpEntryPoint = function (entryPoint, http) {
  EventEmitter.call(this);
  this._http = http;
  this._entryPoint = entryPoint;
}

util.inherits(HttpEntryPoint, EventEmitter);

HttpEntryPoint.prototype.fetchFirstUrl = function (date) {
  var self = this;
  self.emit('request', self._entryPoint);
  return this._http.get(this._entryPoint).then(function (result) {
    self.emit('response', self._entryPoint);
    var document = JSON.parse(result.body);
    //find how to query stations by analysing the hydra:search property
    var data = document;
    self.emit('processed', self._entryPoint);
    if (data && data.search && data.search.template) {
      var tpl = UriTemplate.parse(data.search.template);
      var params = {};
      params[data.search.mapping.variable] = date.toISOString();
      return tpl.expand(params);
    } else {
      throw "couldn't find Linked Connections template";
    }
  });
};
module.exports = HttpEntryPoint;
