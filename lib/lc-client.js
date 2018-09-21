var Planner = require('csa').BasicCSA,
  TimespanPlanner = require('csa').TimespanCSA,
  LDFetch = require('ldfetch'),
  N3Util = require('n3').Util,
  Fetcher = require('./Fetcher');

var Client = function (config) {
  // Validate config
  this._config = config;
  this._numberOfQueries = 0; //Number of queries being ran
  //Create an HTTP interface, which is the data interface
  this._options = config.options || {};
  this._http = new LDFetch(this._options);
  this._stopsData = [];
  this._stopsEntrypoints = config.stops || [];
}

Client.prototype.queryConstructor = function (q, cb, type) {
  // Create fetcher: will create streams for a specific query
  var fetcher = new Fetcher(this._config, this._http);
  //1. Validate query
  if (q.departureTime) {
    q.departureTime = new Date(q.departureTime);
  } else {
    throw "Date of departure not set";
  }
  if (!q.departureStop) {
    throw "Location of departure not set";
  }
  this._numberOfQueries++;
  var query = q, self = this;
  query.index = this._numberOfQueries - 1;

  //2. Use query to configure the data fetchers
  fetcher.buildConnectionsStream(q, connectionsStream => {
    // Create a transferTimeFetcher to handle vehicle switches
    let transferTimeFetcher = () => { };
    transferTimeFetcher.get = (previousConnection, connection) => {
      return new Promise(function (fulfill) {
        if (previousConnection && connection) {
          if (q.minimumTransferTime) {
            return fulfill(q.minimumTransferTime);
          }
          return fulfill(360);
        }
        return fulfill(0);
      });
    };

    //3. fire results using CSA.js and return the stream
    var planner;

    // Adds timeout for server/network/data issues
    var timeout = null;
    if (q.searchTimeOut) {
      timeout = setTimeout(function () {
        fetcher.close();

        // TODO: add a proper way of closing the planner instance
        planner = null;
        delete planner;

        console.log("Connections search timed out");
      }, q.searchTimeOut);
    }

    if (type === "timespan") {
      new TimespanPlanner(q, transferTimeFetcher).then((instance) => {
        planner = instance

        //When a result is found, stop the stream
        planner.once("end", function () {
          console.log("END THE STREAM");

          fetcher.close();
        });
      });
    } else {
      let walkingSpeed = 5.0; // 5.0 m/s, maybe a bit fast for walking
      getStopsData(this._stopsData, this._stopsEntrypoints, this._http).then(() => {
        console.log("All stop data is fetched, starting planner...");
        new Planner(q, transferTimeFetcher, walkingSpeed, this._stopsData).then((instance) => {
          planner = instance;

          //When a result is found, stop the stream
          planner.once("result", function () {
            fetcher.close();

            planner = null;
            delete planner;
          });

          planner.on("data", function () {
            // console.log("data received")
            if (timeout) {
              clearTimeout(timeout);
            }
          });

          cb(connectionsStream.pipe(planner), this._http, connectionsStream);
        });
      });
    }
  });
};

Client.prototype.query = function (q, cb) {
  this.queryConstructor(q, cb, "query");
};

Client.prototype.timespanQuery = function (q, cb) {
  this.queryConstructor(q, cb, "timespan");
};

if (typeof window !== "undefined") {
  window.lc = {
    Client: Client,
    Fetcher: Fetcher
  };
}

function getStopsData(stopsData, stopsEntrypoints, http) {
  let stopsPromises = [];
  for (url of stopsEntrypoints) {
    let promise = http.get(url).then(response => {
      for (let triple of response.triples) {
        let stop = {};
        if (!stopsData[triple.subject]) {
          stopsData[triple.subject] = {
            "@id": triple.subject // easy access to the URI of the stop in CSA
          };
        }
        if (triple.predicate === "http://xmlns.com/foaf/0.1/name") {
          triple.predicate = "name";
        }
        if (triple.predicate === "http://www.w3.org/2003/01/geo/wgs84_pos#long") {
          triple.predicate = "longitude";
          if (N3Util.getLiteralType(triple.object) === 'http://www.w3.org/2001/XMLSchema#double') {
            triple.object = parseFloat(N3Util.getLiteralValue(triple.object));
          }
        }
        if (triple.predicate === "http://www.w3.org/2003/01/geo/wgs84_pos#lat") {
          triple.predicate = "latitude";
          if (N3Util.getLiteralType(triple.object) === 'http://www.w3.org/2001/XMLSchema#double') {
            triple.object = parseFloat(N3Util.getLiteralValue(triple.object));
          }
        }
        if (triple.predicate === "http://purl.org/dc/terms/alternative") {
          triple.predicate = "alternative";
        }
        if (triple.predicate === "http://semweb.mmlab.be/ns/stoptimes#avgStopTimes") {
          triple.predicate = "avgStopTimes";
        }
        if (triple.predicate === "http://www.geonames.org/ontology#parentCountry") {
          triple.predicate = "country";
        }
        if (triple.predicate === "http://schema.org/areaServed") {
          triple.predicate = "operationZone";
        }
        stopsData[triple.subject][triple.predicate] = triple.object;
      }
    }, error => {
      console.error(error);
    });
    stopsPromises.push(promise);
  }

  // Return a super Promise to let the user wait until all stop data is downloaded
  return Promise.all(stopsPromises);
}

module.exports = Client;
module.exports.Fetcher = Fetcher;