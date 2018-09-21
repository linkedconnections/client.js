"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Readable = require('stream').Readable;

var UriTemplate = require('uritemplate');

var N3Util = require('n3').Util;

var ConnectionsStore = require('./ConnectionsStore');

var ConnectionsFetcher =
/*#__PURE__*/
function (_Readable) {
  _inherits(ConnectionsFetcher, _Readable);

  function ConnectionsFetcher(starturl, ldfetch, departureTime) {
    var _this;

    _classCallCheck(this, ConnectionsFetcher);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ConnectionsFetcher).call(this, {
      objectMode: true
    }));
    _this._discoveryPhase = true;
    _this.ldfetch = ldfetch;
    _this.departureTime = departureTime;
    _this.starturl = starturl;
    _this.store;
    return _this;
  }

  _createClass(ConnectionsFetcher, [{
    key: "close",
    value: function close() {
      this.push(null);
    }
  }, {
    key: "_read",
    value: function _read() {
      var _this2 = this;

      if (this._discoveryPhase) {
        //Building block 1: a way to find a first page
        this.ldfetch.get(this.starturl).then(function (response) {
          //the current page needs to be discoverable
          //Option 1: the lc:departureTimeQuery
          // → through a hydra:search → hydra:template
          // Need to check whether this is our building block: hydra:search → hydra:mapping → hydra:property === lc:departureTimeQuery
          //filter once all triples with these predicates
          var metaTriples = response.triples.filter(function (triple) {
            return triple.predicate === 'http://www.w3.org/ns/hydra/core#search' || triple.predicate === 'http://www.w3.org/ns/hydra/core#mapping' || triple.predicate === 'http://www.w3.org/ns/hydra/core#template' || triple.predicate === 'http://www.w3.org/ns/hydra/core#property' || triple.predicate === 'http://www.w3.org/ns/hydra/core#variable';
          });
          var searchUriTriples = metaTriples.filter(function (triple) {
            return triple.predicate === 'http://www.w3.org/ns/hydra/core#search' && triple.subject === response.url;
          }); //look for all search template for the mapping

          for (var i = 0; i < searchUriTriples.length; i++) {
            var searchUri = searchUriTriples[i].object; //search for the lc:departureTimeQuery URI

            var mappings = metaTriples.filter(function (triple) {
              return triple.subject === searchUri && triple.predicate === 'http://www.w3.org/ns/hydra/core#mapping';
            });
            var mappingsUri = mappings[0].object;
            /*for (var j = 0; j < mappings.length; j++) {
              var mapping = metaTriples.filter(triple => {
                return triple.subject === mappings[j].object;
              });
              
            }*/
            //TODO: filter on the right subject          

            var template = N3Util.getLiteralValue(metaTriples.filter(function (triple) {
              return triple.subject === searchUri && triple.predicate === 'http://www.w3.org/ns/hydra/core#template';
            })[0].object);
            var tpl = UriTemplate.parse(template);
            var params = {};
            params["departureTime"] = _this2.departureTime.toISOString();
            var url = tpl.expand(params);

            _this2.ldfetch.get(url).then(function (response) {
              _this2.store = new ConnectionsStore(decodeURIComponent(response.url), response.triples);

              _this2.push(_this2.store.connections.shift());
            }, function (error) {
              console.error(error);
            });
          } //Option 2: TODO: rangeGate and rangeFragments (multidimensional interfaces -- http://w3id.org/multidimensional-interface/spec)
          //Not yet implemented

        });
        this._discoveryPhase = false;
      } else {
        //readConnection if still more available
        if (this.store.connections.length > 0) {
          this.push(this.store.connections.shift());
        } else {
          //fetch new page
          this.ldfetch.get(this.store.nextPageIri).then(function (response) {
            _this2.store = new ConnectionsStore(response.url, response.triples);

            var connection = _this2.store.connections.shift();

            _this2.push(connection);
          }, function (error) {
            _this2.push(null, error);
          });
        }
      }
    }
  }]);

  return ConnectionsFetcher;
}(Readable);

module.exports = ConnectionsFetcher;