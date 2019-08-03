async function loadData(setName) {
  var data = await d3.csv(`${setName}.csv`);
  return data.map(d => ({"Time": new Date(d.Updated), "Delay": d.Flow-0}))
}

async function test() {
  var data = await loadData("Prescott");
  window.data = data;
  drawCalendar(data);
  var dayData = filterDate(data, new Date("2013-05-21"));
  window.dayData = dayData;
  dailyPlot(dayData);
}

function drawCalendar(data){
  const cellSize = 17;
  const width = 964;
  const height = cellSize * 9;
  const timeWeek = d3.timeSunday;
  const countDay = d => d.getDay();
  const format = d3.format("d");
  const formatDate = d3.timeFormat("%x");
  const formatDay = d => "SMTWTFS"[d.getDay()]
  const formatMonth = d3.timeFormat("%b");
  function color(...args){
    return d3.scaleSequential(d3.interpolateReds).domain([0, 450])(...args);
  }

  function pathMonth(t) {
    const n = 7;
    const d = Math.max(0, Math.min(n, countDay(t)));
    const w = timeWeek.count(d3.timeYear(t), t);
    return `${d === 0 ? `M${w * cellSize},0`
      : d === n ? `M${(w + 1) * cellSize},0`
      : `M${(w + 1) * cellSize},0V${d * cellSize}H${w * cellSize}`}V${n * cellSize}`;
  }

  const years = d3.nest()
    .key(d => d.Time.getFullYear())
    .key(d => toDate(d.Time).getTime())
    .rollup(v => ({
      "values": v,
      "max": d3.max(v, d=>d.Delay)
    }))
    .object(data);
  window.years = years;

  const svg = d3.select("#calendar");

  const year = svg.selectAll("g")
    .data(Object.keys(years))
    .join("g")
      .attr("transform", (d, i) => `translate(40,${height * i + cellSize * 1.5})`);
  window.year = year;

  year.append("text")
    .attr("x", -5)
    .attr("y", -5)
    .attr("font-weight", "bold")
    .attr("text-anchor", "end")
    .text(d=>d);

  year.append("g")
      .attr("text-anchor", "end")
    .selectAll("text")
    .data(d3.range(7).map(i => new Date(1995, 0, i)))
    .join("text")
      .attr("x", -5)
      .attr("y", d => (countDay(d) + 0.5) * cellSize)
      .attr("dy", "0.31em")
      .text(formatDay);

  year.append("g")
    .selectAll("rect")
    .data(d => Object.entries(years[d]).map(v=>([new Date(v[0]-0), v[1]])))
    .join("rect")
      .attr("width", cellSize - 1)
      .attr("height", cellSize - 1)
      .attr("x", d => {
        return timeWeek.count(d3.timeYear(d[0]), d[0]) * cellSize + 0.5;
      })
      .attr("y", d => {
        return countDay(d[0]) * cellSize + 0.5;
      })
      .attr("fill", d => color(d[1].max))
      .on("click", d => dailyPlot(d[1].values))
    .append("title")
      .text(d => `${formatDate(d[0])}: ${format(d[1].max)}`);

  const month = year.append("g")
    .selectAll("g")
    .data(d => {
      var days = Object.keys(years[d]);
      var lastDay = new Date(days[0]-0);
      var firstDay = new Date(days[days.length-1]-0);
      return d3.timeMonths(firstDay, lastDay);
    })
    .join("g");

  month.filter((d, i) => i).append("path")
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("d", pathMonth);

  month.append("text")
      .attr("x", d => timeWeek.count(d3.timeYear(d), timeWeek.ceil(d)) * cellSize + 2)
      .attr("y", -5)
      .text(formatMonth);
}

function dailyPlot(dayData){
  dayData.sort((a,b)=>a.Time.getTime() - b.Time.getTime());
  var svg = d3.select("#dailyPlot").html("");

  var margin = 50;
  var g = svg.append("g").attr("transform", `translate(${margin}, ${margin})`);
  var w = svg.attr("width") - 2*margin;
  var h = svg.attr("height") - 2*margin;

  var minDate = d3.min(dayData, d=>d.Time);
  var xmin = toDate(minDate);
  var xmax = new Date(minDate.getTime());
  xmax.setHours(23,59,59,999);
  var x = d3.scaleTime().domain([xmin, xmax]).range([0, w]);
  var y = d3.scaleLinear().domain([0, 450]).range([h, 0]);
  window.y = y;

  svg.append("g").attr("transform", `translate(${margin}, ${margin})`).call(d3.axisLeft(y));
  svg.append("g").attr("transform", `translate(${margin}, ${margin+h})`).call(d3.axisBottom(x));
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0)
    .attr("x", -margin-(h / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Delay(min)");
  svg.append("text")
    .attr("transform", `translate(${w/2 + margin}, ${h + margin + 40})`)
    .style("text-anchor", "middle")
    .text("Time");

  var formatTime = d3.timeFormat("%H:%M:%S");
  // Define the div for the tooltip
  var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  g.selectAll("circle")
    .data(dayData)
    .join("circle")
      .attr("r", 5)
      .attr("cx", d => x(d.Time))
      .attr("cy", h)
      .on("mouseover", function(d) {
        console.log(`Mouseover on ${d}`);
        div.html(`Time: ${formatTime(d.Time)}<br/>Delay: ${d.Delay} min`)
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 28) + "px");
        div.style("opacity", .9);
      })
//      .on("mouseout", function(d) {
//        div.style("opacity", 0);
//      })
    .transition()
      .duration(2000)
      .attr("cy", d => y(d.Delay))

  var line = d3.line()
    .x(d => x(d.Time))
    .y(d => y(d.Delay))
    .curve(d3.curveMonotoneX)

  var path = g.append("path")
    .classed("linePlot", true)
    .attr("d", line(dayData))
    .lower()

  var totalLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
}

function filterDate(data, date){
  var target = toDate(date).getTime();
  return data.filter(d => toDate(d.Time).getTime()==target);
}

function toDate(time){
  var d = new Date(time.getTime());
  d.setHours(0,0,0,0);
  return d;
}