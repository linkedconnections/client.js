#!/usr/bin/node

var Client = require('../lib/lc-client.js'),
    path = require('path'),
    fs = require('fs'),
    program = require('commander');

console.error("Linked Connection Client - use --help to discover more functions");

program
  .version('0.1.0')
  .option('-c --config [file]', 'specify config file')
  .parse(process.argv);

var configFile = program.config || path.join(__dirname, '../config-example.json'),
    config = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf8' }))

var client = new Client(config);
client.query({from: "stops:32735" , to: "stops:32736", departureTime: "2013-12-15T08:00"}).on('data', function (data) {
  console.log(data);
});
