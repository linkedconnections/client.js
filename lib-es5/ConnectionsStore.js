"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var N3Util = require('n3').Util;

var lcClient = require('./lc-client');

var ConnectionsStore =
/*#__PURE__*/
function () {
  function ConnectionsStore(documentIri, triples) {
    _classCallCheck(this, ConnectionsStore);

    this.documentIri = documentIri;
    this.connections = [];
    this.addTriples(triples);
  }

  _createClass(ConnectionsStore, [{
    key: "addTriples",
    value: function addTriples(triples) {
      // Find next page 
      // building block 1: every page should be a hydra:PagedCollection with a next and previous page link
      var nextPage = triples.filter(function (triple) {
        return triple.predicate === 'http://www.w3.org/ns/hydra/core#next';
        /*&& triple.subject === this.documentIri;*/
      });
      this.nextPageIri = null;

      if (nextPage[0] && nextPage[0].object.substr(0, 4) === 'http') {
        this.nextPageIri = nextPage[0].object;
      } // group all entities together and 


      var entities = [];

      for (var i = 0; i < triples.length; i++) {
        var triple = triples[i];

        if (!entities[triple.subject]) {
          entities[triple.subject] = {};
        } //process different object types

        /*if (N3Util.getLiteralType(triple.object) === 'http://www.w3.org/2001/XMLSchema#dateTime') {
          triple.object = new Date(triple.object);
        }
        //process different object types
        else if (N3Util.getLiteralType(triple.object) === 'http://www.w3.org/2001/XMLSchema#integer') {
          triple.object = parseInt(triple.object);
          }*/


        if (triple.predicate === "http://semweb.mmlab.be/ns/linkedconnections#departureTime") {
          triple.predicate = "departureTime";
          triple.object = new Date(N3Util.getLiteralValue(triple.object));
        }

        if (triple.predicate === "http://semweb.mmlab.be/ns/linkedconnections#arrivalTime") {
          triple.predicate = "arrivalTime";
          triple.object = new Date(N3Util.getLiteralValue(triple.object));
        }

        if (triple.predicate === "http://semweb.mmlab.be/ns/linkedconnections#departureStop") {
          triple.predicate = "departureStop";
        }

        if (triple.predicate === "http://semweb.mmlab.be/ns/linkedconnections#arrivalStop") {
          triple.predicate = "arrivalStop";
        }

        if (triple.predicate === "http://vocab.gtfs.org/terms#trip") {
          triple.predicate = "gtfs:trip";
        }

        entities[triple.subject][triple.predicate] = triple.object;
      } // Find all Connections
      // building block 2: every lc:Connection entity is taken from the page and processed


      var keys = Object.keys(entities);
      var connections = [];

      for (var i = 0; i < keys.length; i++) {
        if (entities[keys[i]]["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] && entities[keys[i]]["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] === 'http://semweb.mmlab.be/ns/linkedconnections#Connection') {
          entities[keys[i]]["@id"] = keys[i];
          connections.push(entities[keys[i]]);
        }
      }

      this.connections = connections.sort(function (connectionA, connectionB) {
        return connectionA.departureTime.valueOf() - connectionB.departureTime.valueOf();
      });
    }
  }, {
    key: "getNextPageIri",
    value: function getNextPageIri() {
      return this.nextPageIri;
    }
  }, {
    key: "getConnections",
    value: function getConnections() {
      return this.connections;
    }
  }]);

  return ConnectionsStore;
}();

module.exports = ConnectionsStore;