var jsonld = require('jsonld'),
    UriTemplate = require('uritemplate');

var HttpEntryPoint = function (entryPoint, http) {
  this._http = http;
  this._entryPoint = entryPoint;
}

HttpEntryPoint.prototype.fetchFirstUrl = function (date) {
  console.log('Getting page: ' + this._entryPoint);
  return this._http.get(this._entryPoint).then(function (result) {
    var document = JSON.parse(result.body);
    //find how to query stations by analysing the hydra:search property
    return jsonld.promises.frame(document, {
      "@context" : "http://www.w3.org/ns/hydra/context.jsonld",
//      "@id" : result.url,
      "search" : {
        "mapping" : {
          "property":"http://semweb.mmlab.be/ns/linkedconnections#departureTimeQuery"
        }
      }
    }).then(function (data) {
      if (data["@graph"][0] && data["@graph"][0].search && data["@graph"][0].search.template) {
        var tpl = UriTemplate.parse(data["@graph"][0].search.template);
        var params = {};
        params[data["@graph"][0].search.mapping.variable] = date.toISOString();
        return tpl.expand(params);
      } else {
        console.error(result.url,"framed",data);
        throw "couldn't find Linked Connections template";
      }
    }, function (error) {
      console.error("Couldn't find Linked Connections template in " + result.url);
    });
  });
};
module.exports = HttpEntryPoint;
