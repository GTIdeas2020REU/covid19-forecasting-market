import * as d3 from 'd3'

export const cleanConfirmedData = (data, dates) => {
  var result = {};
  for (var i = 0; i < dates.length; i++) {
    result[dates[i]] = data[dates[i]];
  }
  return result;
};

export const organizeData = (data) => {
  var orgs = Object.keys(data);
  var results = [];
  for (var i = 0; i < orgs.length; i++) {
    var forecast = data[orgs[i]];
    var dates = forecast.target_end_date;
    var values = forecast.value;

    var result = {};
    dates.forEach((key, i) => result[key] = values[i]);
    results.push(result);
  }

  return [results, orgs];
}

export const cleanForecastData = (data) => {
  let orgs = Object.keys(data);
  let cleaned = []
  orgs.forEach(org => {
    let rawData = data[org];
    let dates = rawData.target_end_date;
    let values = rawData.value;
    let cleanedData = {}
    dates.forEach((date, i) => cleanedData[date] = values[i])
    cleaned.push({
      "name": org,
      "data": cleanedData
    })
  })
  return cleaned;
}


function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


export const getDates = () => {
  var current = new Date(2020, 2, 28);
  var end = new Date();
  var dateArray = [];
  while (current <= end) {
      dateArray.push(new Date(current).toISOString().slice(0,10));
      current = addDays(current, 1);
  }
  return dateArray;
}

export const clamp = (a, b, c) => { 
  return Math.max(a, Math.min(b, c)) 
}

export const formatValue = (value) => {
  return value.toLocaleString("en", {
    style: "currency",
    currency: "USD"
  });
}
export const callout = (g, value) => {
  if (!value) return g.style("display", "none");

  g
      .style("display", null)
      .style("pointer-events", "none")
      .style("font", "10px sans-serif");

  const path = g.selectAll("path")
    .data([null])
    .join("path")
      .attr("fill", "white")
      .attr("stroke", "black");

  const text = g.selectAll("text")
    .data([null])
    .join("text")
    .call(text => text
      .selectAll("tspan")
      .data((value + "").split(/\n/))
      .join("tspan")
        .attr("x", 0)
        .attr("y", (d, i) => `${i * 1.1}em`)
        .style("font-weight", (_, i) => i ? null : "bold")
        .text(d => d));

  const {x, y, width: w, height: h} = text.node().getBBox();

  text.attr("transform", `translate(${-w / 2},${15 - y})`);
  path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
}

export const sortDictByDate = (data) => {
  var sortedDict = {};
  const sortedDates = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
  sortedDates.map(d => {
    const dateObj = d3.timeParse("%Y-%m-%d")(d);
    sortedDict[dateObj] = data[d]
  })
  return sortedDict;
}
//pass in list of string dates, return string dates y-m-d
export const sortStringDates = (data) => {
  var sortedDates = data.sort((a, b) => new Date(a) - new Date(b));
  sortedDates = sortedDates.map(d => d3.timeParse("%Y-%m-%d")(d));
  return sortedDates;
}

export const getMostRecentPrediction = (data) => {
  if (Object.keys(data).length === 0) return null;
  const sortedDates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
  const mostRecentDate = sortedDates[0];
  return data[mostRecentDate]
}

export const reformatData = (data) => {
  return Object.keys(data).map(key => ({
    date: d3.timeParse("%Y-%m-%d")(key),
    value: data[key]
}));
}

export const reformatPredData = (data) => {
  return data.map(d => ({
      date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
      value: d.value,
      defined: d.defined
      })
  );
}
//returns y coordinate at given x 
/*export const findYatX = (x, path) => {
  if (x > path.getTotalLength()) {return null}
  const getXY = (len) => {
      var point = path.getPointAtLength(len);
      return [point.x, point.y];
  }
  var start = 0;
  var end = path.getTotalLength();
  var result = 0;
  while (start < end) { 
    var mid = (start + end) / 2;
    var currPoint = getXY(mid);
    var currPointX = currPoint[0];
    if (x < currPointX) {
      end = mid - 0.01; //does it have to be 0.01?
    }
    else if (x > currPointX) {
      start = mid + 0.01;
    }
    else {
      console.log(currPointX);
      result = currPoint[1];
      break;
    }
  }
  if (result == 0) {
    console.log(start, end);
    return getXY(start)[1];
  }
  return result;
}*/

export const findYatX = (x, path, startX) => {
  const getXY = (len) => {
      var point = path.getPointAtLength(len);
      return [point.x, point.y, len];
  }
  var start = startX;
  var end = path.getTotalLength();
  var result = 0;
  while (start < end) { 
    var mid = (start + end) / 2;
    var currPoint = getXY(mid);
    var currPointX = currPoint[0];
    if (x < currPointX) {
      end = mid - 0.001; //does it have to be 0.01?
    }
    else if (x > currPointX) {
      start = mid + 0.001;
    }
    else {
      result = currPoint;
      break;
    }
  }
  if (result === 0) {
    result = getXY(start);
  }
  return result;
}

//for confirmedData, forecastData, aggregateData
export const getAllDataPoints = (pathNode, xAxis, yAxis, startDate, endDate) => {
  var data = [];
  var date = startDate;
  var startX = 0;
  while (+date <= +endDate) {
    var x = xAxis(date);
    var point = findYatX(x, pathNode, startX);
    data.push({
      date: date,
      value: yAxis.invert(point[1])
    });
    startX = point[2];
    date = d3.timeDay.offset(date, 1);
  }
  return data;
}
export const getDataPointsFromPath = (predictionData, pathNode, xAxis, yAxis, lastPredDate) => {
  var date = predictionData[0].date;
  var startX = 0;
  for (var i = 0; i < predictionData.length; i++) {
    if (+predictionData[i].date > +lastPredDate) {
      break;
    }
    if (predictionData[i].defined === 0) {
      date = predictionData[i].date;
      var point = findYatX(xAxis(date), pathNode, startX);
      predictionData[i].defined = true;
      predictionData[i].value = yAxis.invert(point[1]);
      startX = point[2];
    }
  }
  return predictionData;
}

export const cleanData = (data, predStartDate, value) => {
  var idxOfStartDate = d3.bisector(f => f.date).left(data, predStartDate);
  if (data.length > 0 && +data[idxOfStartDate].date === +predStartDate) {
    data[idxOfStartDate].value = value;
  }
  else {
    data.splice(idxOfStartDate, 0, {
        date: predStartDate,
        value: value
    });
  } 
  return data.splice(idxOfStartDate, data.length);
}

export const getLastValue = (data) => {
  return data[data.length - 1].value;
}

export const getLastDate = (data) => {
  return data[data.length - 1].date;
}

export const color = (names) => {
  d3
    .scaleOrdinal()
    .domain(names)
    .range(d3.schemeTableau10);
}

export const createDefaultPrediction = (predStartDate, predEndDate) => {
  var defaultData = [];
  var currDate = predStartDate;
  //var defined = true;
  //var value = confirmedData[confirmedData.length - 1].value;
  
  //create defaultPredictionData
  while(+currDate <= +predEndDate) {
      defaultData.push({date: currDate, value: 0, defined: 0});
      currDate = d3.timeDay.offset(currDate, 1);
  }
  return defaultData;
}

export const cleanPrediction = (data, predStartDate, predEndDate, confirmedLastVal) => {
  if (+data[0].date !== +predStartDate) {
    console.log("needs to be reformatted")
    data = reformatPredData(data);
    var currDate = d3.timeDay.offset(getLastDate(data), 1);
    data = data.concat(createDefaultPrediction(currDate, predEndDate));
  }
  data = data.filter(d => (+d.date >= +predStartDate) && (+d.date <= +predEndDate));
  data[0].value = confirmedLastVal;
  data[0].defined = true;
  return data;
}


export const savePrediction = (data, category) => {
  fetch('/update/',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({"data": data, "category": category}),
  });
}

export const createFocusContext = (svg, width, height, marginBottom, confirmedData, aggregateData, forecastData, predictionData, labels, x, y, xAxis, line, predLine, color) => {
  const focusHeight = 100;
  const focusMargin = 50;
  var focus = svg
                  .append("g")
                      .attr("viewBox", [0, 0, width, focusHeight])
                      .attr("transform", `translate(0,${height + focusMargin} )`)
                      //.attr("width", width + 100)
                      //.attr("height", height)
                      .style("display", "block")

  var focusX = d3
                  .scaleTime()
                  .domain(x.domain())
                  .range([0, width]);
  const focusY = d3
                  .scaleLinear()
                  .domain(y.domain())
                  .range([focusHeight - focusMargin, 0])
                  .nice();
  
  var focusXAxis = focus
                        .append("g")
                        .attr("transform", `translate(0,${focusHeight - marginBottom})`)
                        .call(d3.axisBottom(focusX));
  const brush = d3.brushX()
                  .extent([[0, 0], [width, focusHeight - marginBottom]])
                  .on("brush", brushed)
                  .on("end", brushended);

  const defaultSelection = [x(d3.timeMonth.offset(x.domain()[1], -8)), x.range()[1]];

  const focusLine = d3.line()
                      .curve(d3.curveCatmullRom)
                      .x(function(d) {return x(d.date)})
                      .y(function (d) {return focusY(d.value)})
  
  const focusPredLine = d3.line()
                          .curve(d3.curveBasis)
                          .defined(d => d.defined)
                          .x(function(d) { return x(d.date) })
                          .y(function(d) { return focusY(d.value) })        
  focus.append("path")
      .datum(confirmedData)
      .attr("d", focusLine)
      .attr("class", "context-curve")
      .attr("stroke", color(labels[1]))
  
  focus.append("path")
      .datum(aggregateData)
      .attr("d", focusLine)
      .attr("class", "context-curve")
      .attr("stroke", color(labels[2]))

  var contextPredCurve = focus.append("path")
                              .datum(predictionData)
                              .attr("d", focusPredLine)
                              .attr("class", "context-curve")
                              .attr("stroke", color(labels[0]))
  console.log(labels);
  focus.selectAll(".forecast-small")
        .data(forecastData)
        .enter()
        .append("path")
            .attr("d", line)
            .attr("class", "context-curve")
            .style("stroke", (f, index) => color(labels[3 + index]))
            .style("stroke-width", "2px");

  function brushed() {
      if (d3.event.selection) {
          var extent = d3.event.selection;
          x.domain([ focusX.invert(extent[0]), focusX.invert(extent[1]) ]);
          xAxis.call(d3.axisBottom(x))
          var newX = x(getLastDate(confirmedData));
          newX = newX < 0 ? 0 : newX;
          d3
              .select("#prediction-clip")
              .select("rect")
                  .attr("width", width - newX)
                  .attr("x", newX);
          d3
                  .select("#confirmed-clip")
                  .select("rect")
                      .attr("width", newX)

          svg
              .selectAll(".line")
              .attr('d', line)

          svg
              .select("#your-line")
              .attr("d", predLine)
          
          svg
              .select("#draw-guess")
              .attr("x", newX + (width - newX) / 2);
          svg
              .select("#pointer")
              .selectAll("circle")
                  .attr("cx", newX);
      }
  }
  
  function brushended() {
      if (!d3.event.selection) {
          gb.call(brush.move, defaultSelection);
      }

  }
  const gb = focus
                  .call(brush)
                  .call(brush.move, defaultSelection);  
}
