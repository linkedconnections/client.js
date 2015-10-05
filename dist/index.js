$("#submit").on("click", function () {
  
  $("#path").html("Thinking...");
  
  var start = $("#selectfrom").val();
  var destination = $("#selectto").val();

  var planner = new lc.Client({entrypoints: ["http://belgianrail.linkedconnections.org/connections"]} );
  
  var departure = new Date($("#departureTime").val());
  planner.query({
    "departureStop": start,
    "arrivalStop": destination,
    "departureTime": departure
  }, function (stream) {
    stream.on('data', function (path) {
      console.log(path);
      $("#path").html("");
      if (path) {
        path.forEach(function (connection) {
          $("#path").append(connection.departureTime.toISOString() + " at " + connection.departureStop + " To arrive in " + connection.arrivalStop + " at " +  connection.arrivalTime.toISOString() + "<br/>");
        });
        stream.end();
      }
      var duration = ((path[path.length-1].arrivalTime.getTime() - path[0].departureTime.getTime())/60000 );
      $("#path").append("Duration of the journey is: " + duration + " minutes");
      
    });
    stream.on('error', function (error) {
      console.error(error);
    });
    stream.on('end', function () {
      console.log('end of stream');
    });
  });
});
