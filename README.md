# Linked Connections Client for javascript

Status: _not functional (planning)_

A javascript library to use intermodal route planning advice in the browser or in your nodejs applications.

## Install and use it

Install it:
```bash
npm install lc-client
```

For use on the command line:
```bash
# uses by default the config-example.json which comes with this repo
lcc -c config.json '{}'
```

Use it as a library:
```bash
var Client = require('lc-client');
var planner = new Client({"config":"object"});
var resultStream = planner.query({"query":"object"});
resultStream.on('data', function (path) {
    console.log(path);
});
```

Using it in the browser works in a similar way, by e.g., using browserify to generate a build file that can be used in the browser
```bash
browserify ...
```

## How it works

The Linked Connections client plans routes over Linked Connections. These are hydra-powered hypermedia APIs that describe their things uisng the Linked Connections vocabulary. Furthermore, the objects returned in the document are ordere by departureTime.

The Client will start downloading schedule data from publicly available and discoverable locations on the Web. It will follow links to 

More info can be found at http://linkedconnections.org

## License

The Linked Connections client is written by Pieter Colpaert, Brecht Van de Vyvere and colleagues.

This code is copyrighted by Ghent University – iMinds and released under the MIT license.
