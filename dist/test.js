const Client = require("../lib/lc-client");
const fs = require('fs');

const entryPoints = {'entrypoints': ["http://belgium.linkedconnections.org/sncb/connections"]};
const planner = new Client(entryPoints);
// const now = new Date(new Date().valueOf());
const now = new Date("2017-07-21T18:34:17+02:00");
const inAnHour = new Date(now.valueOf() + 60 * 60 * 1000);

console.log(now.toLocaleDateString());
console.log(now.toLocaleTimeString());
console.log(inAnHour.toLocaleTimeString());

logOutput = (path, content) => {
    fs.writeFile(path, content, function (err) {
        if (err) return console.log(err);

        console.log(path, ' Logged.');
    });
}

countChanges = (resultSet) => {
    let tripCount = 0;
    let lastTrip = resultSet[0]["gtfs:trip"];
    for (let connection of resultSet) {
        let currTrip = connection["gtfs:trip"];
        if (lastTrip !== currTrip) {
            tripCount++;
        }
        lastTrip = currTrip;
    }
    return tripCount;
};

timeBetweenChanges = (resultSet) => {
    let times = [];
    let lastConn = resultSet[0];
    for (let connection of resultSet) {
        if (lastConn["gtfs:trip"] !== connection["gtfs:trip"]) {
            times.push((connection.departureTime - lastConn.arrivalTime) / 60000);
        }
        lastConn = connection;
    }
    return times;
};

getTravelTime = (resultSet) => {
    let depart = new Date(resultSet[0].departureTime).valueOf();
    let arrival = new Date(resultSet[resultSet.length - 1].arrivalTime).valueOf();
    return new Date(arrival - depart);
};

runQuery = () => {
    let departureStop = "http://irail.be/stations/NMBS/008812005";
    let arrivalStop = "http://irail.be/stations/NMBS/008892007";

    let resultItem = {
        queriedTime: now.toLocaleTimeString(),
        count: 0,
        routes: {}
    };

    // Run timespan query
    // TODO: Make this actually output multiple possibilities instead of the last one
    planner.timespanQuery({
        departureStop: departureStop,
        arrivalStop: arrivalStop,
        latestDepartTime: inAnHour,
        departureTime: now,
        minimumTransferTime: 6 * 60,
        searchTimeOut: 60000
    }, (resultStream, source) => {
        let dataCount = 0;
        let requestCount = 0;
        let responseCount = 0;

        source.on('request', () => {
            requestCount++;
        });

        source.on('response', () => {
            responseCount++;
        });

        resultStream.on('data', (data) => {
            dataCount++;
        });

        resultStream.on('result',  (path) => {
            resultItem.count++;
            resultItem.routes[new Date(path[0]["departureTime"]).toLocaleTimeString()] = {
                arrival: new Date(path[path.length - 1]["arrivalTime"]).toLocaleTimeString(),
                changes: timeBetweenChanges(path),
                type: "timespanCSA",
                path: "path" + resultItem.count
            };
            // logOutput("result.json", JSON.stringify(path));
            logOutput("result.json", JSON.stringify(resultItem));
            logOutput("path" + resultItem.count + ".json", JSON.stringify(path));
            console.log("Depart time: ", new Date(path[0]["departureTime"]).toLocaleTimeString());
            console.log("Total connections processed: ", dataCount);
            console.log("Total requests send: ", requestCount);
            console.log("Total responses gotten: ", responseCount);
            console.log("Total changes: ", countChanges(path));
            console.log("Times between changes: ", timeBetweenChanges(path), " minutes");
            console.log("Total travel time: ", getTravelTime(path).toLocaleTimeString());
        });
    });

    // Run single query
    planner.query({
        departureStop: departureStop,
        arrivalStop: arrivalStop,
        latestDepartTime: inAnHour,
        departureTime: now,
        minimumTransferTime: 6,
        searchTimeOut: 60000
    }, (resultStream, source) => {
        resultItem.count++;
        resultStream.on('result',  (path) => {
            resultItem.routes[new Date(path[0]["departureTime"]).toLocaleTimeString()] = {
                arrival: new Date(path[path.length - 1]["arrivalTime"]).toLocaleTimeString(),
                changes: timeBetweenChanges(path),
                type: "standardCSA"
            };
            logOutput("result.json", JSON.stringify(resultItem));
            logOutput("path" + resultItem.count + ".json", JSON.stringify(path));
        });
    });
};

(() => {
    runQuery();
})()