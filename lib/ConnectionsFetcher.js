const Readable = require('stream').Readable;
const UriTemplate = require('uritemplate');
const N3Util = require('n3').Util;
const ConnectionsStore = require('./ConnectionsStore');
class ConnectionsFetcher extends Readable {

  constructor (starturl, ldfetch, departureTime) {
    super({objectMode: true});
    this._discoveryPhase = true;
    this.ldfetch = ldfetch;
    this.departureTime = departureTime;
    this.starturl = starturl;
    this.store;
  }

  close () {
    this.push(null);
  }
  
  _read () {
    if (this._discoveryPhase) {
      //Building block 1: a way to find a first page
      this.ldfetch.get(this.starturl).then(response => {
        console.log('--------------------------Discovery LC-Fragment retrieved---------------------------------');
        //the current page needs to be discoverable
        //Option 1: the lc:departureTimeQuery
        // → through a hydra:search → hydra:template
        // Need to check whether this is our building block: hydra:search → hydra:mapping → hydra:property === lc:departureTimeQuery

        //filter once all triples with these predicates
        var metaTriples = response.triples.filter(triple => {
          return triple.predicate === 'http://www.w3.org/ns/hydra/core#search' || triple.predicate === 'http://www.w3.org/ns/hydra/core#mapping' || triple.predicate === 'http://www.w3.org/ns/hydra/core#template' || triple.predicate === 'http://www.w3.org/ns/hydra/core#property' || triple.predicate === 'http://www.w3.org/ns/hydra/core#variable';
        });
        var searchUriTriples = metaTriples.filter(triple => {
          return triple.predicate === 'http://www.w3.org/ns/hydra/core#search'; /*&& triple.subject === response.url;*/
        });
        //look for all search template for the mapping
        for (var i = 0; i < searchUriTriples.length; i ++) {
          var searchUri = searchUriTriples[i].object;

          //search for the lc:departureTimeQuery URI
          var mappings = metaTriples.filter(triple => {
            return triple.subject === searchUri && triple.predicate === 'http://www.w3.org/ns/hydra/core#mapping';
          });
          
          var mappingsUri = mappings[0].object;
          
          /*for (var j = 0; j < mappings.length; j++) {
            var mapping = metaTriples.filter(triple => {
              return triple.subject === mappings[j].object;
            });
            
          }*/
          //TODO: filter on the right subject          
          var template = N3Util.getLiteralValue(metaTriples.filter(triple => {
            return triple.subject === searchUri && triple.predicate === 'http://www.w3.org/ns/hydra/core#template';
          })[0].object);
          var tpl = UriTemplate.parse(template);
          var params = {};
          params["departureTime"] = this.departureTime.toISOString();
          var url = tpl.expand(params);
          this.ldfetch.get(url).then(response => {
            console.log('--------------------------New LC-Fragment retrieved---------------------------------');
            this.store = new ConnectionsStore(response.url, response.triples);
            this.push(this.store.connections.shift());
          }, error => {
            console.error(error);
          });
        }
        //Option 2: TODO: rangeGate and rangeFragments (multidimensional interfaces -- http://w3id.org/multidimensional-interface/spec)
        //Not yet implemented
      });
      this._discoveryPhase = false;
    } else {
      //readConnection if still more available
      if (this.store.connections.length > 0) {
        this.push(this.store.connections.shift());
      } else {
        //fetch new page
        this.ldfetch.get(this.store.nextPageIri).then(response => {
          console.log('--------------------------New LC-Fragment retrieved---------------------------------');
          this.store = new ConnectionsStore(response.url, response.triples);
          var connection = this.store.connections.shift();
          this.push(connection);
        }, error => {
          this.push(null, error);
        });
      }
    }
  }
}

module.exports = ConnectionsFetcher;
