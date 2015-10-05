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

var client = new Client(config);
client.query(q, function (stream) {
  stream.on('data', function (data) {
    console.log(data);
  });
  stream.on('error', function (error) {
    console.error(error);
  });
});
