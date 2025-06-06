function ticked() {
  labels
    .attr("x", function (d) {
      returnd.x;
    })
    .attr("y", function (d) {
      return d.y;
    });
}
var repelForce = d3
  .forceManyBody()
  .strength(-140)
  .distanceMax(80)
  .distanceMin(20);
var attractForce = d3
  .forceManyBody()
  .strength(100)
  .distanceMax(100)
  .distanceMin(100);
var simulation = d3
  .forceSimulation(label_array)
  .alphaDecay(0.15)
  .force("attractForce", attractForce)
  .force("repelForce", repelForce)
  .on("tick", ticked);

var links = svg
  .selectAll(".link")
  .data(anchor_array)
  .enter()
  .append("line")
  .attr("class", "link")
  .attr("x1", function (d) {
    return d.x;
  })
  .attr("y1", function (d) {
    return d.y;
  })
  .attr("x2", function (d) {
    return d.cx + 27;
  })
  .attr("y2", function (d) {
    return d.cy + 27;
  })
  .attr("stroke-width", 0.6)
  .attr("stroke", "gray")
  .attr("id", function (d) {
    d.textId = "text" + d.id;
    d.lineId = "line" + d.id;
    return "line" + d.id;
  });

  function simulationEnd() {
    links.attr("x1", function (d) {
          letbbox = (document.getElementById(d.textId) asany).getBBox();
          return bbox.x + (bbox.width / 2);
    })
    .attr("y1", function (d) {
            letbbox = (document.getElementById(d.textId) asany).getBBox();
             return bbox.y + bbox.height;
    });
 
 }
 
 varrepelForce = d3.forceManyBody().strength(-140).distanceMax(80).distanceMin(20);
 varattractForce = d3.forceManyBody().strength(100).distanceMax(100).distanceMin(100);
 varsimulation = d3.forceSimulation(label_array)
                   .alphaDecay(0.15)
                   .force("attractForce", attractForce)
                   .force("repelForce", repelForce)
                   .on("tick", ticked)
                   .on("end", simulationEnd);