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

var configFile = program.config || path.join(__dirname, '../config-example.json'),
  config = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8' }))

if (!q) {
  console.error('Please provide a query as a string or a path towards a query file in JSON');
  process.exit();
}

let options = { headers: { 'Accept-Datetime': '2017-08-21T10:00:00.000Z' } };
config.options = options;

let depTime = new Date(q.departureTime);
depTime.setHours(depTime.getHours() + 3);
q['latestDepartTime'] = depTime;
q['minimumTransferTime'] = 6 * 60;
q['searchTimeOut'] = 300000;

console.log(JSON.stringify(q));

var client = new Client(config),
  count = 0,
  countTotal = 0,
  totalBytesTransfered = 0;

client._http.on('downloaded', function (download) {
  totalBytesTransfered += download.totalBytes;
});

//client.timespanQuery(q, function (stream, source, connectionsStream) {
client.timespanQuery(q, function (stream, source, connectionsStream) {
  console.log('Querying ' + config.entrypoints.length + ' data source(s).');
  var httpStartTimes = {};
  var httpResponseTimes = {};
  var paths = [];
  
  source.on('request', function (url) {
    httpStartTimes[url] = new Date();
  });
  source.on('redirect', function (obj) {
    httpStartTimes[obj.to] = httpStartTimes[obj.from];
    //console.log('Redirect from: ' + obj.from + ' to: ' + obj.to);
  });
  source.on('response', function (url) {
    httpResponseTimes[url] = new Date() - httpStartTimes[url];
    console.log('GET', url, '-', httpResponseTimes[url], 'ms');
  });
  connectionsStream.on('data', function (data) {
    countTotal++;
  });
  stream.on('data', function () {
    count++;
  });
  stream.on('result', function (path) {
    paths.push(path);
    path.forEach(function (connection) {
      console.log(connection.departureTime.toISOString() + " at " + connection.departureStop + " To arrive in " + connection.arrivalStop + " at " + connection.arrivalTime.toISOString());
      if (connection["gtfs:trip"]) {
        console.log(" with trip id " + JSON.stringify(connection["gtfs:trip"]));
      }
      if (connection["gtfs:headsign"]) {
        console.log(" with headsign " + JSON.stringify(connection["gtfs:headsign"]));
      }
    });
    var duration = ((path[path.length - 1].arrivalTime.getTime() - path[0].departureTime.getTime()) / 60000);
    console.log("Duration of the journey is: " + duration + " minutes");
    console.log("To calculate, we have built a minimum spanning tree with " + count + " connections, while we relaxed " + countTotal + " connections in total.");
    var sumResponseTimes = 0;
    for (var url in httpResponseTimes) {
      sumResponseTimes += httpResponseTimes[url];
    }
    console.log("Downloading data over HTTP adds up to", sumResponseTimes, "ms");
    console.log(Math.round(totalBytesTransfered / (1024 * 1024) * 100) / 100 + "MB transfered while answering this query");
  });
  /*stream.on('end', () => {
    console.log('**********************RESULTS: \n');
    paths.forEach((path) => {
      console.log('-------------------------------------------')
      console.log(JSON.stringify(path));
    });
  });*/
  stream.on('error', function (error) {
    console.error(error);
  });
});
