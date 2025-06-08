var margin = { top: 100, right: 50, bottom: 50, left: 50 },
  width = 1800 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom,
  boxWidth = 140,
  boxHeight = 50;
(boxHSpace = 200), (boxVSpace = 70), (links = []);

var svg = d3
  .select("body")
  .attr("bgcolor", "#2c2c2c")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .call(
    d3.behavior.zoom().on("zoom", function () {
      svg.attr(
        "transform",
        "translate(" +
          d3.event.translate +
          ")" +
          " scale(" +
          d3.event.scale +
          ")"
      );
    })
  )
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var datas;

datas = setPositions(buildDataAssocArray(getData()));

var node = svg.selectAll(".node").data(d3.entries(datas)).enter().append("g");
function dragmove(d) {
  var x = d3.event.x;
  var y = d3.event.y;

  d3.select(this).attr("transform", "translate(" + x + "," + y + ")");

  datas[d.key].dx = d3.event.x;
  datas[d.key].dy = d3.event.y;
  link.attr("d", connect);
}

// Define drag beavior
var drag = d3.behavior
  .drag()
  .on("drag", dragmove)
  .origin(function () {
    var t = d3.transform(d3.select(this).attr("transform"));
    return { x: t.translate[0], y: t.translate[1] };
  });

node.call(drag).on("click", click);

var selected;
function click() {
  if (!selected) {
    selected = this;
    d3.select(selected.childNodes[0]).style("stroke", "white");
  } else {
    d3.select(selected.childNodes[0]).style("stroke", "black");
    selected = this;
    d3.select(selected.childNodes[0]).style("stroke", "white");
  }
}

node.on("mousedown", function () {
  d3.event.stopPropagation();
});

node
  .append("rect")
  .attr("width", boxWidth)
  .attr("height", boxHeight)
  .attr("fill", "tan")
  .attr("x", function (d) {
    return d.value.x - 70;
  })
  .attr("y", function (d) {
    return height - d.value.y - 40;
  })
  .style("cursor", "pointer");

node
  .append("text")
  .attr("font-size", "16px")
  .attr("fill", "black")
  .attr("x", function (d) {
    return d.value.x;
  })
  .attr("y", function (d) {
    return height - d.value.y - 15;
  })
  .style("text-anchor", "middle")
  .text(function (d) {
    return d.value.name;
  })
  .style("cursor", "pointer");

var link = svg
  .selectAll(".link")
  .data(getLinks())
  .enter()
  .insert("path", "g")
  .attr("fill", "none")
  .attr("stroke", "#000")
  .attr("stroke", "#000")
  .attr("shape-rendering", "crispEdges")
  .attr("d", connect);

function connect(d, i) {
  var dsx = d.source.dx ? d.source.dx : 0;
  var dsy = d.source.dy ? d.source.dy : 0;
  var dtx = d.target.dx ? d.target.dx : 0;
  var dty = d.target.dy ? d.target.dy : 0;
  return (
    "M" +
    (d.source.x + dsx) +
    "," +
    (height - d.source.y + dsy) +
    //                 + "V" + (height - (3*(d.source.y-dsy) + 4*(d.target.y - dty))/7)
    "V" +
    (height - (3 * (d.source.y - dsy) + 4 * (d.target.y - dty)) / 7) +
    "H" +
    (d.target.x + dtx) +
    "V" +
    (height - (d.target.y - dty))
  );
}
function getLinks() {
  return links;
}

function setPositions(datas) {
  var fams = getFamily();

  var x = 200,
    y = 100;

  fams.forEach(function (item, i, arr) {
    item.childs.forEach(function (child, i1, arr1) {
      console.log(child);
      datas[child].x = x;
      datas[child].y = y;
      links.push({ source: datas[child], target: datas[item.husb] });
      links.push({ source: datas[child], target: datas[item.wife] });
    });

    x += 50;
    y += 50;

    datas[item.husb].x = x - 100;
    datas[item.husb].y = y + 100;
    datas[item.wife].x = x + 100;
    datas[item.wife].y = y + 100;

    x += 50;
    y += 50;
  });

  return datas;
}

function getFamily() {
  return [
    {
      husb: "003",
      wife: "002",
      childs: ["001"],
    },
    {
      husb: "005",
      wife: "004",
      childs: ["002"],
    },
    {
      husb: "007",
      wife: "006",
      childs: ["003"],
    },
    {
      husb: "012",
      wife: "013",
      childs: ["006"],
    },
    {
      husb: "015",
      wife: "016",
      childs: ["017"],
    },
  ];
}

function buildDataAssocArray(adatas) {
  var datas = adatas;
  var dArray = [];
  datas.forEach(function (item, i, arr) {
    item.x = 0;
    item.y = 0;
    dArray[item.id] = item;
  });
  return dArray;
}

//console.log(buildDataAssocArray());

function getData() {
  return [
    {
      id: "001",
      name: "Алтунин Василий",
      mother: "002",
      father: "003",
      child: null,
    },
    {
      id: "002",
      name: "Алтунина Елена",
      mother: "004",
      father: "005",
      child: "001",
    },
    {
      id: "003",
      name: "Алтунин Владимир",
      mother: "006",
      father: "007",
      child: "001",
    },
    {
      id: "004",
      name: "Зайцева Лидия",
      mother: null,
      father: null,
      child: "002",
    },
    {
      id: "005",
      name: "Зайцев Анатолий",
      mother: null,
      father: null,
      child: "002",
    },
    {
      id: "006",
      name: "Алтунина Зинаида",
      mother: "013",
      father: "012",
      child: "003",
    },
    {
      id: "007",
      name: "Алтунин Иван",
      mother: null,
      father: null,
      child: "003",
    },
    {
      id: "012",
      name: "Бурцев Иван",
      mother: null,
      father: null,
      child: "003",
    },
    {
      id: "013",
      name: "Девятова Александра",
      mother: null,
      father: null,
      child: "003",
    },
    {
      id: "014",
      name: "Наталия Зайцева",
      mother: "004",
      father: "005",
      child: "000",
    },
    {
      id: "015",
      name: "Александр Зайцев",
      mother: "004",
      father: "005",
      child: "017",
    },
    {
      id: "016",
      name: "Евгения Ануфриева",
      mother: null,
      father: null,
      child: "017",
    },
    {
      id: "017",
      name: "Федор Зайцев",
      mother: "016",
      father: "015",
      child: "000",
    },
  ];
}
