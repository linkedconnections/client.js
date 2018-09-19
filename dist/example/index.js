$("#submit").on("click", function () {
  
  $("#path").html("Thinking...");
  
  var start = $("#selectfrom").val();
  var destination = $("#selectto").val();

  var planner = new lc.Client({entrypoints: ["https://belgium.linkedconnections.org/delijn/Oost-Vlaanderen/connections"]} );
  
  var departureTime = new Date($("#departureTime").val());
  var latestDepartureTime = new Date(departureTime.getTime() + (2 * 3600 * 1000));

  planner.timespanQuery({
    "departureStop" : start,
    "arrivalStop" : destination,
    "departureTime" : departureTime,
    "latestDepartTime": latestDepartureTime,
    "searchTimeOut" : 90000,
  }, function (stream, source) {
    stream.on('result', function (path) {
      $("#path").html("");
      if (path) {
        path.forEach(function (connection) {
          $("#path").append(connection.departureTime.toISOString() + " at " + connection.departureStop + " To arrive in " + connection.arrivalStop + " at " +  connection.arrivalTime.toISOString() + "<br/>");
        });
        source.close();
      }
      var duration = ((path[path.length-1].arrivalTime.getTime() - path[0].departureTime.getTime())/60000 );
      $("#path").append("Duration of the journey is: " + duration + " minutes");
    });
    stream.on('data', function (connection) {
      console.log(connection);
    });
    stream.on('error', function (error) {
      console.error(error);
    });
    stream.on('end', function () {
      console.log('end of stream');
    });
  });
});
