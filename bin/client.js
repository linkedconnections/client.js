#!/usr/bin/node

var Client = require('../lib/lc-client.js'),
    path = require('path'),
    fs = require('fs'),
    program = require('commander');

console.error("Linked Connections Client use --help to discover more functions");

var q;

program
  .version('0.1.0')
  .option('-c --config [file]', 'specify config file')
  .arguments('<query>')
  .action(function (query) {
    try {
      query = fs.readFileSync(query, { encoding: 'utf8' });
    } catch (error) {
      console.error(error);
    }
    q = JSON.parse(query);
  })
  .parse(process.argv);

var configFile = program.config || path.join(__dirname, '../config.json'),
    config = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8' }))

if (!q) {
  console.error('Please provide a query as a string or a path towards a query file in JSON');
  process.exit();
}

var client = new Client(config),
    count = 0,
    countTotal = 0,
    totalBytesTransfered = 0;

client._http.on('downloaded', function (download) {
  totalBytesTransfered += download.totalBytes;
});

client.query(q, function (stream, source, connectionsStream) {
  console.log('Querying ' + config.entrypoints.length + ' data source(s).');
  var httpStartTimes = {};
  var httpResponseTimes = {};
  source.on('request', function (url) {
    httpStartTimes[url] = new Date();
  });
  source.on('response', function (url) {
    httpResponseTimes[url] = new Date() - httpStartTimes[url];
    console.log('GET', url, '-', httpResponseTimes[url] , 'ms');
  });
  connectionsStream.on('data', function (data) {
    countTotal++;
  });
  stream.on('data', function () {
    count++;
  });
  stream.on('result', function (path) {
    path.forEach(function (connection) {
      console.log(connection.departureTime.toISOString() + " at " + connection.departureStop + " To arrive in " + connection.arrivalStop + " at " +  connection.arrivalTime.toISOString());
      if (connection["gtfs:trip"]) {
        console.log(" with trip id " + JSON.stringify(connection["gtfs:trip"]));
      }
      if (connection["gtfs:headsign"]) {
        console.log(" with headsign " + JSON.stringify(connection["gtfs:headsign"]));
      }
    });
    var duration = ((path[path.length-1].arrivalTime.getTime() - path[0].departureTime.getTime())/60000 );
    console.log("Duration of the journey is: " + duration + " minutes");
    console.log("To calculate, we have built a minimum spanning tree with " + count + " connections, while we relaxed " + countTotal + " connections in total.");
    var sumResponseTimes = 0;
    for (var url in httpResponseTimes) {
      sumResponseTimes += httpResponseTimes[url];
    }
    console.log("Downloading data over HTTP adds up to", sumResponseTimes, "ms");
    console.log(Math.round(totalBytesTransfered/(1024*1024)*100)/100 + "MB transfered while answering this query");
  });
  stream.on('error', function (error) {
    console.error(error);
  });
});
