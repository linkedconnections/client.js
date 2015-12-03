var jsonld = require('jsonld'),
    UriTemplate = require('uritemplate');

var HttpEntryPoint = function (entryPoint, http) {
  this._http = http;
  this._entryPoint = entryPoint;
}

HttpEntryPoint.prototype.fetchFirstUrl = function (date) {
  return this._http.get(this._entryPoint).then(function (result) {
    var document = JSON.parse(result.body);
    //find how to query stations by analysing the hydra:search property
    return jsonld.promises.frame(document, {
      "@context" : {
        search: "http://www.w3.org/ns/hydra/core#search",
        mapping: "http://www.w3.org/ns/hydra/core#mapping",
        template: "http://www.w3.org/ns/hydra/core#template",
        variable: "http://www.w3.org/ns/hydra/core#variable",
        property: {
          "@id": "http://www.w3.org/ns/hydra/core#property",
          "@type": "@id"
        }
      },
      "@graph" : {
        //"@id" : result.url,//TODO: wait for request/request to fix bug
        "search" : {
          "mapping" : {
            "property":"http://semweb.mmlab.be/ns/linkedconnections#departureTimeQuery"
          } 
        }
      }
    }).then(function (data) {
      if (data["@graph"][0] && data["@graph"][0].search && data["@graph"][0].search.template) {
        var tpl = UriTemplate.parse(data["@graph"][0].search.template);
        var params = {};
        params[data["@graph"][0].search.mapping.variable] = date.toISOString();
        return tpl.expand(params);
      } else {
        throw "couldn't find Linked Connections template";
      }
    }, function (error) {
      console.error("Couldn't find Linked Connections template in " + result.url);
    });
  });
};
module.exports = HttpEntryPoint;
