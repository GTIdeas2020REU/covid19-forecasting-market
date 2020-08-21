import React, { Component } from 'react';
import * as d3 from 'd3'
import './InteractiveChart.css';
import { clamp, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction, getLastDate, getLastValue } from '../../utils/data';
import { elementType } from 'prop-types';
import { addDays, formatDate } from '../../utils/date';
import { timeDay } from 'd3';


class InteractiveChart extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "us_daily_deaths", predictionData: null};
        this.chartRef = React.createRef();
    }
    componentDidMount() {
        const loginStatus = this.props.loginStatus;
        if (loginStatus['logged in']) {
            this.renderChart();
        }
        else {
            this.renderChartUnregistered()
        }
    }

    //move to utils
    savePrediction(data, category) {
        fetch('/update/',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"data": data, "category": category}),
        });
    }
    deletePrediction(category) {
        fetch('/delete/',{
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({"category": category}),
          });
    }

    createDefaultPrediction(predStartDate, predEndDate) {
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
    
    appendModal() {
        const signinRedirect = () => {window.location.href='/#/signin'}
        const signupRedirect = () => {window.location.href='/#/signup'}
        var modal = document.createElement("div");
        modal.id = "modal";
        var modalContent = document.createElement("div");
        modalContent.id = "modal-content";
        var text = document.createElement("p");
        text.innerText = "Please log in to save your prediction.";
        var signinBtn = document.createElement("button");
        signinBtn.id = "signin-btn";
        signinBtn.innerText = "Sign In";
        signinBtn.onclick= signinRedirect;
        signinBtn.className = "btn primary-btn";
        var signupBtn = document.createElement("button");
        signupBtn.id = "signup-btn";
        signupBtn.onclick= signupRedirect;
        signupBtn.innerText = "Sign Up";
        signupBtn.className = "btn primary-btn";

        modalContent.appendChild(text);
        modalContent.appendChild(signinBtn);
        modalContent.appendChild(signupBtn);
        modal.appendChild(modalContent);
        this.chartRef.current.appendChild(modal);
    }

    renderChartUnregistered() {
        var { forecast, orgs, userPrediction, confirmed, confirmedLastVal, confirmedLastDate, aggregate, mse } = this.props;
        confirmedLastDate = d3.timeParse("%Y-%m-%d")(confirmedLastDate);
        // sort models by increasing error
        var orgIndices = {};
        for (var i = 0; i < orgs.length; i++) {
            orgIndices[orgs[i]] = [i];
        }
        var sortable = [];
        for (var err in mse) {
            sortable.push([err, mse[err]]);
        }
        sortable.sort(function(a, b) {
            return a[1] - b[1];
        });
        var sortedOrgs = [];
        for (var j = 0; j < sortable.length; j++) {
            sortedOrgs.push(sortable[j][0]); // + " (MSE=" + sortable[j][1].toFixed(2).toString() + ")")
            orgIndices[sortable[j][0]].push(j);
        }

        // correct order of forecasts
        orgIndices = Object.values(orgIndices);
        var tempForecast = new Array(forecast.length);
        for (var k = 0; k < orgIndices.length; k++) {
            tempForecast[orgIndices[k][1]] = forecast[orgIndices[k][0]];
        }

        // replace orgs and forecasts with new orders
        orgs = sortedOrgs;
        forecast = tempForecast;


        var predictionData = [];//where we will store formatted userPrediction
        const createDefaultPrediction = this.createDefaultPrediction;
        this.appendModal();
        const category = this.state.category;
        var compiledData = [];
        //set up margin, width, height of chart
        const legendWidth = 380;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const focusHeight = 100;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        var svg = d3.select(".main-chart")
                    // .append("svg")
                    //     .attr("class", "main-chart")
                        // .attr("viewBox", `0 0 ${width} ${height}`)
                        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + focusHeight + 100}`)
                        // .attr("width", width)
                        // .attr("height", height)
                    .append("g")
                    .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`);
        
                    // add title
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", -20)
            .attr("text-anchor", "middle")  
            .style("font-size", "16px") 
            .style("text-decoration", "underline")  
            .style("font-weight", "bold")
            .text("COVID-19 Forecasts of Daily Deaths in the US Over Time");

        const w = 710 - margin.left - margin.right;
        const h = 360 - margin.top - margin.bottom;
            
        //Create X axis label   
        svg.append("text")
            .attr("x", w/2 + margin.right)
            .attr("y", h + 4*margin.bottom)
            .style("text-anchor", "middle")
            .text("Date");
            
        //Create Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0-margin.left)
            .attr("x",0 - (h / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Daily Deaths");
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = reformatData(confirmed)
        if (+getLastDate(confirmedData) != +confirmedLastDate) {
            confirmedData.push({
                date: confirmedLastDate,
                value: confirmedLastVal
            })
        }
        else {
            confirmedLastVal = getLastValue(confirmedData);
        }
        var forecastData = forecast.map(f => {
            return reformatData(f);
        });

        var aggregateData = reformatData(aggregate);
        //set other dates
        const confirmedStartDate = confirmedData[4].date;
        const predStartDate = confirmedData[confirmedData.length - 1].date; //last date of confirmedData
        const predLength = 155;
        const predEndDate = d3.timeDay.offset(predStartDate, predLength)
        
        //get confirmedData starting from confirmedStartDate
        confirmedData = confirmedData.filter(d => +d.date >= +confirmedStartDate);

        //draw x-axis     
        var x = d3.scaleTime()
            .domain([confirmedStartDate, predEndDate])
            .range([ 0, width ])
            //.nice(); //rounds up/down the max and mind of x axis
        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        
        //find max val in confirmedData and forecastData to determine the max of y-axis
        var confirmedMax = d3.max(confirmedData, function(d) { return +d.value; });
        var forecastMax = 0;
        forecastData.map(f => {
            var currMax = d3.max(f, d => {return d.value;})
            forecastMax = currMax > forecastMax ? currMax : forecastMax;
        })
        var yAxisMax = Math.max(confirmedMax, forecastMax);
        //draw y-axis
        var y = d3.scaleLinear()
            .domain([0, yAxisMax])
            .range([ height, 0 ])
            .nice();
        svg
            .append("g")
            .call(d3.axisLeft(y));
   
        //list of data displayed in graph - for legend
        //var legendString = orgs.concat(["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"]);
        var legendString = ["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"].concat(orgs);
        var models = [];
        orgs.map((o, i) => {
            //var idx = o.indexOf("(");
            //models.push(o.substring(0, idx - 1));
            models.push(o);
        })
        var names = ["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"].concat(models)
        const modelClassNames = ["gt", "ihme", "youyang", "columbia", "ucla"];
        const labels = ["confirmed", "aggregate", "prediction"].concat(modelClassNames);
        //color function that assigns random colors to each data
        var color = d3
                        .scaleOrdinal()
                        .domain(models)
                        .range(d3.schemeTableau10);

         //draw legend
        var legend = d3.select(".legend-container")
                        .attr("viewBox", "0 0 400 500")
                        .append('g')
                        .attr("id", "legend")
        var size = 10;
        const legendMarginL = 30;
        legend.selectAll("rect")
            .data(names)
            .enter()
            .append("circle")
                .attr('cx', 10)
                .attr("cy", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                //.attr("width", size)
                //.attr("height", size)
                .style("fill", (function(d){ return color(d)}))

        
        legend.selectAll("labels")
            .data(legendString)
            .enter()
            .append("text")
                .attr("x", 30)
                .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                // .style("fill", function(d, index){ return color(names[index])})
                .text(function(d){console.log("D TEXT"); console.log(d); return d})
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")

        //create line generator for confirmed/forecast data and prediction data
        var lineGenerator = d3.line()
            //.curve(d3.curveBasis);
            .curve(d3.curveCatmullRom)//curve that goes through all data points
        var predLineGenerator = d3.line()
            .curve(d3.curveBasis); //curve doesn't go through all data points (it's smoothed out)
            //d3.curveMonotoneX
            //d3.curveBasis
            //d3.curveCardinal
        
        //function that draws curve
        var line = lineGenerator
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })
        
        //area where the confirmed curve will be drawn
        var mainClip = svg
                            .append("defs")
                            .append("svg:clipPath")
                                .attr("id", "main-clip")
                                .append("svg:rect")
                                    .attr("width", width )
                                    .attr("height", height )
                                    .attr("x", 0)
                                    .attr("y", 0);

        // Create the confirmed area variable
        const mainArea = svg
                                .append('g')
                                .attr("clip-path", "url(#main-clip)");

        //display confirmed data
        var confirmedLine = mainArea.append("path")
                                    .attr("id", "confirmed")
                                    .attr("class", "line")    
                                    .datum(confirmedData)    
                                    .attr('d', line)
                                    .attr("stroke", color(names[0]))
                                    .style("stroke-width", "3px")
        var confirmedAreaEndX = x(confirmedData[confirmedData.length - 1].date);
        var confirmedAreaEndY = y(confirmedData[confirmedData.length - 1].value);

        //append clip-path for prediction curve
        var predictionClip = svg.append("defs").append("svg:clipPath")
                                .attr("id", "prediction-clip")
                                .append("svg:rect")
                                    .attr("width", width - confirmedAreaEndX )
                                    .attr("height", height )
                                    .attr("x", confirmedAreaEndX)
                                    .attr("y", 0);
        const predictionArea = svg.append('g')
                            .attr("clip-path", "url(#prediction-clip)");
        
        //make sure aggregateData curve stems from confiremData curve
        var idxOfStartDate = d3.bisector(f => f.date).left(aggregateData, predStartDate);
        //check if predStartDate exists in AD
        if (aggregateData.length > 0 && +aggregateData[idxOfStartDate].date === +predStartDate) {
            aggregateData[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
        }
        else {
            aggregateData.splice(idxOfStartDate, 0, {
                date: predStartDate,
                value: confirmedData[confirmedData.length - 1].value
            });
        }
        aggregateData = aggregateData.splice(idxOfStartDate, aggregateData.length);


        //display aggregate data
        var aggregateLine = predictionArea.append("path")
                                    .attr("id", "aggregate")
                                    .attr("class", "line")        
                                    .datum(aggregateData)    
                                    .attr('d', line)
                                    .attr("stroke", color(names[1]))
                                    .style("stroke-width", "2px")
        
        //function that generates the prediction curve
        var predLine = predLineGenerator
            .defined(d => d.defined)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })

        //append path for prediction data
        var yourLine = predictionArea
                                        .append("path")
                                        .attr("id", "your-line")
                                        .attr("class", "prediction line");

        //display forecast data
        forecastData.map((f, index) => {
            //make sure they all stem from the confirmed curve!
            //var temp = d3.timeParse("%Y-%m-%d")("2020-07-18")
            var idxOfStartDate = d3.bisector(f => f.date).left(f, predStartDate);
            //check if predStartDate exists in f
            if (f.length > 0 && +f[idxOfStartDate].date === +predStartDate) {
                f[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
            }
            else {//add data point to forecastData array
                f.splice(idxOfStartDate, 0, {
                    date: predStartDate,
                    value: confirmedData[confirmedData.length - 1].value
                });
                f = f.slice(idxOfStartDate, f.length);
            }
            forecastData[index] = f;
            predictionArea.append("path")
                        .attr("class", "forecast line")
                        .attr("id", modelClassNames[index])
                        .style("stroke", color(models[index]))
                        .datum(f)
                            .attr("d", line);
        })
        
        var lines = document.getElementsByClassName('line');
        
        
        //variables used to initialize user prediction data if it doesn't exist in the db
        var currDate = predStartDate;
        var defined = true;
        var value = confirmedData[confirmedData.length - 1].value;
        //const confirmedLastVal = value; //used to make sure the first data point of prediction stays the same
        

        predictionData = createDefaultPrediction(predStartDate, predEndDate);
        predictionData[0].value = confirmedLastVal;
        predictionData[0].defined = true;        

        var filteredData = null;
        //var totalData = confirmedData.concat(predictionData);

//!!    //add forecast data to compiledData
        const forecastPaths = document.querySelectorAll(".forecast");
        const confirmedPath = document.querySelector("#confirmed");
        const aggregatePath = document.querySelector("#aggregate");

        confirmedData = getAllDataPoints(confirmedPath, x, y, confirmedStartDate, predStartDate);
        compiledData.push({
            name: labels[0],
            data: confirmedData
        })
        var lastDate = aggregateData[aggregateData.length - 1].date;
        aggregateData = getAllDataPoints(aggregatePath, x, y, aggregateData[0].date, lastDate)
        compiledData.push({
            name: labels[1],
            data: aggregateData
        })
        compiledData.push({
            name: labels[2],
            data: predictionData
        })
        modelClassNames.map((m, index) => {
            var lastDate = forecastData[index][forecastData[index].length - 1].date;
            forecastData[index] = getAllDataPoints(forecastPaths[index], x, y, predStartDate, lastDate);
            compiledData.push({
                name: m,
                data: forecastData[index]
            })
        })

        //join data to yourLine
        filteredData = predictionData.filter(predLine.defined())
        yourLine.datum(filteredData)
                .attr('d', predLine)
                .style("stroke", color(names[2]))
                .style("stroke-width", "2px")

        //append new rect  
        const mouseArea = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("id", "mouse-area")
            .style("pointer-events","visible");

        //append click area rect
        var confirmedAreaWidth = confirmedLine.node().getBoundingClientRect().width; //get width of path element containing confirmed data
        var clickAreaWidth = width - confirmedAreaWidth; //the remaining area
        /*svg.append("rect")
           .attr("id", "click-area")
           .attr("width", clickAreaWidth)
           .attr("height",height)
           .attr("transform", "translate (" + confirmedAreaWidth+" 0)")
           .attr("fill", "none")
           .style("pointer-events","visible");*/
        //var clickArea = d3.select("#click-area");
        
        //append draw your guess text
        const drawingInstruction = svg
                                        .append("g")
                                        .attr("id", "drawing-instruction")
                                        .style("opacity", "1");
        drawingInstruction
                            .append("text")
                            .attr("id", "draw-guess")
                            .attr("x", confirmedAreaEndX + (width - confirmedAreaEndX) / 2)             
                            .attr("y", height - 100)
                            .attr("text-anchor", "middle")  
                            .text("Draw your guess")
                            .style("font-size", "16px");
        //append circle at the end of confirmed curve
        var selectCircle = drawingInstruction
                                                .append("g")
                                                .attr("id", "pointer");
        var pointerCircles = ["pulse-disk", "pulse-circle", "pulse-circle-2"];
        pointerCircles.map((c) => {
        selectCircle.append("circle")
            .attr("class", c)
            .attr("cx", confirmedAreaEndX)
            .attr("cy", confirmedAreaEndY)
        })

        var drag = d3.drag()
                     .on("drag", function() {
                        //hide "draw your guess" text
                        svg
                            .select("#drawing-instruction")
                            .style("opacity", "0");
                        d3.select("#tooltip-line")
                            .style("opacity", "0");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "0");
                        d3.select(".tooltip-box")
                            .style("display", "none")
                        var pos = d3.mouse(this);
                        var date = clamp(predStartDate, predEndDate, x.invert(pos[0]));
                        var value = clamp(0, yAxisMax, y.invert(pos[1]));
                        
                        predictionData.forEach(function(d){
                            if (+d3.timeDay.round(d.date) === +d3.timeDay.round(date)){
                                d.value = value;
                                d.defined = true
                            }
                        predictionData[0].value = confirmedLastVal;//make sure the prediction curve is always connected to the confirmed curve
                        //update totalData everytime predictionData is updated
                        compiledData[2].data = predictionData;
                        //console.log(compiledData)
                        /*yourLine.datum(predictionData)
                                .attr('d', predLine)*/
                        filteredData = predictionData.filter(predLine.defined())

                        yourLine.datum(filteredData)
                                .attr('d', predLine)
                                // .style("stroke", color(legendString[2]))
                                // .style("stroke-width", "2px")
                        focusPredCurve.datum(filteredData)
                                        .attr("d", focusPredLine);

                        });
                    })
                    .on("end", function () {
                        var lastPredDate = filteredData[filteredData.length - 1].date;
                        getDataPointsFromPath(predictionData, yourLine.node(), x, y, lastPredDate);
                        compiledData[2].data = predictionData;
                        d3
                            .select("#modal")
                            .style("display", "block");
                        d3.select("#tooltip-line")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "1");
                        d3.select(".tooltip-box")
                            .style("display", "block")
                    });
        
        svg.call(drag)
        var modal = document.getElementById("modal");

        window.onclick = function(event) {
            if (event.target === modal) {
              modal.style.display = "none";
            }
          }

        //finds the datapoint closest to the mouse (along x)
        /*var bisect = () => {
            const bisectDate = d3.bisector(d => d.date).left;
            return mx => {
                const date = x.invert(mx);
                const index = bisectDate(totalData, date, 1);
                const a = totalData[index - 1];
                const b = totalData[index];
                return b && (date - a.date > b.date - date) ? b : a;
            };
        }*/

        console.log(compiledData);
        const tooltipArea = svg
        .append("g")
        .attr("class", "tooltip")

        tooltipArea.append("path") //vertical line
        .attr("id", "tooltip-line")
        .style("stroke", "black")
        .style("stroke-width", "0.5px")
        .style("opacity", "0");
        //where text will be
        var tooltipBox = d3.select(".tooltip-box")
            //  .style("background-color", "white")
            // .style("border", "solid")
            // .style("border-width", "2px")
            // .style("border-radius", "5px")
            // .style("padding", "5px")
            .style("position", "absolute")
            .style("display", "block")
            .style("left", "10px")
            .style("top", "10px");
        // tooltipBox.selectAll("box")
        //             .data(compiledData)
        //             .enter()
        //             .append("div")
        //             .attr("class", d => d.name);    

        //console.log(compiledData)
        var mousePerLine = tooltipArea
                        .selectAll(".mouse-per-line")
                        .data(compiledData)
                        .enter()
                        .append("g")
                        .attr("class", "mouse-per-line");

        mousePerLine.append("circle")
                    .attr("r", 2)
                    .style("stroke", function(d, index) {
                        return color(names[index]);
                    })
                    .style("fill", "none")
                    .style("stroke-width", "1px")
                    .style("opacity", "0");

        var chart = tooltipArea
            .append("svg:rect")
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            //.style("cursor", "pointer")
            .on('mouseout', function() { // on mouse out hide line, circles and text
                d3.select("#tooltip-line")
                .style("opacity", "0");
                d3.selectAll(".mouse-per-line circle")
                .style("opacity", "0");
                d3.selectAll(".mouse-per-line text")
                .style("opacity", "0")
                tooltipBox.style("display", "none")
            })
            .on('mouseover', function() { // on mouse in show line, circles and text
                d3.select("#tooltip-line")
                .style("opacity", "1");
                tooltipBox.style("display", "block")
            })
            .on('mousemove', function() { // mouse moving over canvas
                var mouse = d3.mouse(this);
                var xCoord = mouse[0];
                var yCoord = mouse[1];
                const xLowerBoundary = x(confirmedData[confirmedData.length - 1].date)
                if (xCoord > xLowerBoundary && xCoord < width && yCoord > 0 && yCoord < height) {
                    chart.attr("cursor", "pointer");
                }
                else {
                    chart.attr("cursor", "default");
                }
                d3
                    .select("#tooltip-line")
                    .attr("d", function() {
                        var d = "M" + xCoord + "," + height;
                        d += " " + xCoord + "," + 0;
                        return d;
                    });
                tooltipBox
                    .style('left', `${d3.event.pageX + 20}px`)
                    .style('top', `${d3.event.pageY + 20}px`)
                d3
                    .selectAll(".mouse-per-line")
                    .attr("transform", function(d, i) {
                        if (d.data.length === 0) {return;}
                        var date = x.invert(xCoord);
                        var value = -1;
                        d.data.map(d => {
                            if(+d.date === +d3.timeDay.round(date) && d.defined !== 0) {
                                value = d.value;
                            }
                        })
                        var element = d3.select(this);
                        var textBox = tooltipBox.select(`.${d.name}`);

                        if (value >= 0) {
                            if(textBox.empty()) {
                                textBox = tooltipBox.append("div")
                                                    .attr("class", d.name)
                                                    .style("padding-left", "10px")
                                                    .style("padding-right", "10px")
                                                    .style("background-color", color(names[i]))
                                                    .style("color", "white");

                            }
                            else {
                                textBox.html(`${names[i]}: ${Math.round(value)}`)
                            }
                            element.select("circle")
                                    .style("opacity", "1");
                            return "translate(" + mouse[0] + "," + y(value)+")";
                        }
                        else {
                            if(!textBox.empty()) {
                                textBox.remove();
                            }
                            element
                                    .select("circle")
                                    .style("opacity", "0");
                        }
                        
                });
            })
        ////ADD TODAY LINE/////////////////////////////////////////////////////
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        var todayMarker = svg
                            .append("g")
                            .attr("id", "today-marker")
        todayMarker
                    .append("line")
                    .attr("id", "today-line")
                    .attr("x1", x(today))
                    .attr("x2", x(today))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "8, 8")
        todayMarker
                    .append("text")
                    .attr("id", "today-text")
                    .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
                    .text("Today")
                    .style("text-anchor", "end")
        /////////////////////////////////////////////////////////////////////////////////////////////
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
                            .domain([confirmedStartDate, predEndDate])
                            .range([0, width]);
        const focusY = d3
                        .scaleLinear()
                        .domain([0, yAxisMax])
                        .range([focusHeight - margin.bottom, 0])
                        .nice();
        
        var focusXAxis = focus
                                    .append("g")
                                    .attr("transform", `translate(0,${focusHeight - margin.bottom})`)
                                    .call(d3.axisBottom(focusX));
        const brush = d3.brushX()
                        .extent([[0, 0], [width, focusHeight - margin.bottom]])
                        .on("brush", brushed)
                        .on("end", brushended);

        const defaultSelection = [x(d3.timeMonth.offset(x.domain()[1], -8)), x.range()[1]];
    
        /*context.append("g")
                .call(xAxis, x, focusHeight);*/
        const focusLine = d3.line()
                            .curve(d3.curveCatmullRom)
                            .x(function(d) {return x(d.date)})
                            .y(function (d) {return focusY(d.value)})
        
        const focusPredLine = d3.line()
                                .curve(d3.curveBasis)
                                .defined(d => d.defined)
                                .x(function(d) { return focusX(d.date) })
                                .y(function(d) { return focusY(d.value) })        
        focus.append("path")
            .datum(confirmedData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("stroke", color(names[0]))
        
        focus.append("path")
            .datum(aggregateData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("stroke", color(names[1]))

        var focusPredCurve = focus.append("path")
                                    .datum(predictionData)
                                    .attr("d", focusPredLine)
                                    .attr("class", "context-curve")
                                    .attr("stroke", color(names[2]))
        
        forecastData.map((f, index) => {
            focus
                    .append("path")
                    .datum(f)
                    .attr("d", focusLine)
                    .attr("class", "context-curve")
                    .attr("stroke", color(models[index]));

        })
        function brushed() {
            if (d3.event.selection) {
                var extent = d3.event.selection;
                //console.log([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
                x.domain([ focusX.invert(extent[0]), focusX.invert(extent[1]) ]);
                xAxis
                        //.transition()
                        //.duration(1000)
                        .call(d3.axisBottom(x))
                var newX = x(confirmedData[confirmedData.length - 1].date);
                newX = newX < 0 ? 0 : newX;
                d3
                    .select("#prediction-clip")
                    .select("rect")
                        .attr("width", width - newX)
                        .attr("x", newX);

                svg
                    .selectAll(".line")
                    //.transition()
                    //.duration(1000)
                    .attr('d', line)

                svg
                    .select("#your-line")
                    .attr("d", predLine)
                
                //reposition draw your guess text and pointer
                svg
                    .select("#draw-guess")
                    .attr("x", newX + (width - newX) / 2);
                svg
                    .select("#pointer")
                    .selectAll("circle")
                        .attr("cx", newX);
                todayMarker.select("line")
                        .attr("x1", x(today))
                        .attr("x2", x(today))
                todayMarker.select("text")
                        .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)

            }
        }
        
        function brushended() {
            if (!d3.event.selection) {
                gb.call(brush.move, defaultSelection);
            }

        }
        const gb = focus
                        .call(brush)
                        .call(brush.move, defaultSelection)
                        .on("click", function() {
                            d3.select(".speech-bubble").style("display", "none");
                        })
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        var deleteButton = d3.select("#delete-btn").node()
        deleteButton.onclick = () => {
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            //update yourLine
            var filtered = predictionData.filter(predLine.defined())
            yourLine.datum(filtered)
                    .attr('d', predLine)
            focusPredCurve.datum(filtered)
                            .attr("d", focusPredLine)
                    
            svg
                .select("#drawing-instruction")
                .style("opacity", "1");
            compiledData[2].data = predictionData;
        };
        ///////////////////////////////////////////////////////////////// 
        var legendElement = document.querySelector("#legend");
        const legendCompleteWidth = legendElement.getBoundingClientRect().width;
        const legendSingleHeight = 25;
        var legendConfirmed = legend.append("rect")
        .attr("width", legendCompleteWidth)
        .attr("height", legendSingleHeight)
        .attr("x", 0)
        .attr("y", 10)
        .attr("fill", "none")
        .style("pointer-events","visible");

        var legendAggregate = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendPrediction = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 2)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendGeorgiaTech = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 3)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendIhme = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 4)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendYouyang = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 5)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendColumbia = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 6)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendUcla = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 7)
                .attr("fill", "none")
                .style("pointer-events","visible");
        
        // var resetBtn = legend.append("rect")
        //         .attr("class", "reset-btn")
        //         .attr("width", 100)
        //         .attr("height", 40)
        //         .attr("x", 0)
        //         .attr("y", 30 + legendSingleHeight * 8)
        //         .attr("fill", "red")
        //         .style("pointer-events","visible")
        //         .on("click", function(){
        //             predictionData = createDefaultPrediction(predStartDate, predEndDate);
        //             predictionData[0].value = confirmedLastVal;
        //             predictionData[0].defined = true;
        //             //update yourLine
        //             var filtered = predictionData.filter(predLine.defined())
        //             yourLine.datum(filtered)
        //                     .attr('d', predLine)
        //             focusPredCurve.datum(filtered)
        //                             .attr("d", focusPredLine)
                            
        //             svg
        //                 .select("#drawing-instruction")
        //                 .style("opacity", "1");
        //             compiledData[2].data = predictionData;
        //         });
        // var resetText = legend.append("text")
        //                         .text("hello")
        //                         .attr("fill", "black")
        //                         .attr("position", "absolute")
        //                         .attr("x", 0)
        //                         .attr("y", 0)
        // resetBtn.node().innerHTML = "  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>TEXT</text>"
                
        legendConfirmed.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#confirmed").style("stroke", color(names[0]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendAggregate.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#aggregate").style("stroke", color(names[1]));
                         })
                         .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendPrediction.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#your-line").style("stroke", color(names[2]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendGeorgiaTech.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#gt").style("stroke", color(names[3]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendIhme.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#ihme").style("stroke", color(names[4]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
        legendYouyang.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#youyang").style("stroke", color(names[5]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
        legendColumbia.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#columbia").style("stroke", color(names[6]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendUcla.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#ucla").style("stroke", color(names[7]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
        
    }

    renderChart() {
        var { forecast, orgs, userPrediction, confirmed, confirmedLastVal, confirmedLastDate, aggregate, mse } = this.props;
        confirmedLastDate = d3.timeParse("%Y-%m-%d")(confirmedLastDate);
        // sort models by increasing error
        var orgIndices = {};
        for (var i = 0; i < orgs.length; i++) {
            orgIndices[orgs[i]] = [i];
        }
        var sortable = [];
        for (var err in mse) {
            sortable.push([err, mse[err]]);
        }
        sortable.sort(function(a, b) {
            return a[1] - b[1];
        });
        var sortedOrgs = [];
        for (var j = 0; j < sortable.length; j++) {
            sortedOrgs.push(sortable[j][0]); // + " (MSE=" + sortable[j][1].toFixed(2).toString() + ")")
            orgIndices[sortable[j][0]].push(j);
        }

        // correct order of forecasts
        orgIndices = Object.values(orgIndices);
        var tempForecast = new Array(forecast.length);
        for (var k = 0; k < orgIndices.length; k++) {
            tempForecast[orgIndices[k][1]] = forecast[orgIndices[k][0]];
        }

        // replace orgs and forecasts with new orders
        orgs = sortedOrgs;
        forecast = tempForecast;

        var predictionData = [];//where we will store formatted userPrediction
        var defaultPredictionData = []
        const savePrediction = this.savePrediction;
        const createDefaultPrediction = this.createDefaultPrediction;
        const category = this.state.category;
        var compiledData = [];
        //set up margin, width, height of chart
        const legendWidth = 230;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const focusHeight = 100;
        const titleHeight = 20;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        var svg = d3.select(".main-chart")
            // .append("svg")
                // .attr("class", "main-chart")
                // .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + focusHeight + 100}`)
                // .attr("width", width)
                // .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`);

        // add title
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", -20)
            .attr("text-anchor", "middle")  
            .style("font-size", "16px") 
            .style("text-decoration", "underline")  
            .style("font-weight", "bold")
            .text("COVID-19 Forecasts of Daily Deaths in the US Over Time");

        const w = 710 - margin.left - margin.right;
        const h = 360 - margin.top - margin.bottom;
            
        //Create X axis label   
        svg.append("text")
            .attr("x", w/2 + margin.right)
            .attr("y", h + 4*margin.bottom)
            .style("text-anchor", "middle")
            .text("Date");
            
        //Create Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (h/2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Daily Deaths");
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = reformatData(confirmed);
        if (+getLastDate(confirmedData) != +confirmedLastDate) {
            confirmedData.push({
                date: confirmedLastDate,
                value: confirmedLastVal
            })
        }
        else {
            confirmedLastVal = getLastValue(confirmedData);
        }
        
        var forecastData = forecast.map(f => {
            return reformatData(f);
        });
        var aggregateData = reformatData(aggregate);

        //store userPrediction in predictionData if it exists
        if(Object.keys(userPrediction).length > 0) {
            const mostRecentPred = getMostRecentPrediction(userPrediction);
            predictionData = reformatPredData(mostRecentPred);
        }
  
        //set other dates
        const confirmedStartDate = confirmedData[4].date;
        const predStartDate = confirmedLastDate; //last date of confirmedData
        const predLength = 155;
        const predEndDate = d3.timeDay.offset(predStartDate, predLength)
        
        //get confirmedData starting from confirmedStartDate
        confirmedData = confirmedData.filter(d => +d.date >= +confirmedStartDate);

        //draw x-axis     
        var x = d3.scaleTime()
            .domain([confirmedStartDate, predEndDate])
            .range([ 0, width ])
            //.nice(); //rounds up/down the max and mind of x axis
        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        
        //find max val in confirmedData and forecastData to determine the max of y-axis
        var confirmedMax = d3.max(confirmedData, function(d) { return +d.value; });
        var forecastMax = 0;
        forecastData.map(f => {
            var currMax = d3.max(f, d => {return d.value;})
            forecastMax = currMax > forecastMax ? currMax : forecastMax;
        })
        var yAxisMax = Math.max(confirmedMax, forecastMax);
        //draw y-axis
        var y = d3.scaleLinear()
            .domain([0, yAxisMax])
            .range([ height, 0 ])
            .nice();
        svg
            .append("g")
            .call(d3.axisLeft(y));
   
        //list of data displayed in graph - for legend
        //var legendString = orgs.concat(["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"]);
        var legendString = ["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"].concat(orgs);
        var models = [];
        orgs.map((o, i) => {
            //var idx = o.indexOf("(");
            //models.push(o.substring(0, idx - 1));
            models.push(o);
        })
        var names = ["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"].concat(models)
        const modelClassNames = ["gt", "ihme", "youyang", "columbia", "ucla"];
        const labels = ["confirmed", "aggregate", "prediction"].concat(modelClassNames);
        //color function that assigns random colors to each data
        var color = d3
                        .scaleOrdinal()
                        .domain(models)
                        .range(d3.schemeTableau10);

         //draw legend
        var legend = d3.select(".legend-container")
                        .attr("viewBox", "0 0 400 500")
                        .append('g')
                        .attr("id", "legend")
        var size = 10;
        const legendMarginL = 30;
        legend.selectAll("rect")
            .data(names)
            .enter()
            .append("circle")
                .attr('cx', 10)
                .attr("cy", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                //.attr("width", size)
                //.attr("height", size)
                .style("fill", (function(d){ return color(d)}))

        
        legend.selectAll("labels")
            .data(legendString)
            .enter()
            .append("text")
                .attr("x", 30)
                .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                // .style("fill", function(d, index){ return color(names[index])})
                .text(function(d){console.log("D TEXT"); console.log(d); return d})
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")
        var legendElement = document.querySelector("#legend");
        const legendCompleteWidth = legendElement.getBoundingClientRect().width;
        const legendSingleHeight = 25;
        /*var legendArea = legend.append("rect")
                                .attr("width", legendCompleteWidth)
                                .attr("height", legendCompleteHeight)
                                .attr("x", width + 40)
                                .attr("y", 10)
                                .attr("fill", "none")
                                .style("pointer-events","visible");*/

        //create line generator for confirmed/forecast data and prediction data
        var lineGenerator = d3.line()
            //.curve(d3.curveBasis);
            .curve(d3.curveCatmullRom)//curve that goes through all data points
        var predLineGenerator = d3.line()
            .curve(d3.curveBasis); //curve doesn't go through all data points (it's smoothed out)
            //d3.curveMonotoneX
            //d3.curveBasis
            //d3.curveCardinal
        
        //function that draws curve
        var line = lineGenerator
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })
        
        //area where the confirmed curve will be drawn
        var mainClip = svg
                            .append("defs")
                            .append("svg:clipPath")
                                .attr("id", "main-clip")
                                .append("svg:rect")
                                    .attr("width", width )
                                    .attr("height", height )
                                    .attr("x", 0)
                                    .attr("y", 0);

        // Create the confirmed area variable
        const mainArea = svg
                                .append('g')
                                .attr("clip-path", "url(#main-clip)");

        //display confirmed data
        var confirmedLine = mainArea.append("path")
                                    .attr("id", "confirmed")
                                    .attr("class", "line")    
                                    .datum(confirmedData)    
                                    .attr('d', line)
                                    .attr("stroke", color(names[0]))
                                    .style("stroke-width", "3px")
        var confirmedAreaEndX = x(confirmedData[confirmedData.length - 1].date);
        var confirmedAreaEndY = y(confirmedData[confirmedData.length - 1].value);

        //append clip-path for prediction curve
        var predictionClip = svg.append("defs").append("svg:clipPath")
                                .attr("id", "prediction-clip")
                                .append("svg:rect")
                                    .attr("id", "prediction-rect")
                                    .attr("width", width - confirmedAreaEndX )
                                    .attr("height", height )
                                    .attr("x", confirmedAreaEndX)
                                    .attr("y", 0);
        const predictionArea = svg.append('g')
                            .attr("clip-path", "url(#prediction-clip)");
        
        //make sure aggregateData curve stems from confiremData curve
        var idxOfStartDate = d3.bisector(f => f.date).left(aggregateData, predStartDate);
        //check if predStartDate exists in AD
        if (aggregateData.length > 0 && +aggregateData[idxOfStartDate].date === +predStartDate) {
            aggregateData[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
        }
        else {
            aggregateData.splice(idxOfStartDate, 0, {
                date: predStartDate,
                value: confirmedData[confirmedData.length - 1].value
            });
        }
        aggregateData = aggregateData.splice(idxOfStartDate, aggregateData.length);

        //display aggregate data
        var aggregateLine = predictionArea.append("path")
                                    .attr("id", "aggregate")
                                    .attr("class", "line")        
                                    .datum(aggregateData)    
                                    .attr('d', line)
                                    .attr("stroke", color(names[1]))
                                    .style("stroke-width", "2px")
        //display user prediction
        //function that generates the prediction curve
        var predLine = predLineGenerator
            .defined(d => d.defined)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })

        //append path for prediction data
        var yourLine = predictionArea
                                        .append("path")
                                        .attr("id", "your-line")
                                        .attr("class", "prediction line");

        
        //display forecast data
        forecastData.map((f, index) => {
            //make sure they all stem from the confirmed curve!
            //var temp = d3.timeParse("%Y-%m-%d")("2020-07-18")
            var idxOfStartDate = d3.bisector(f => f.date).left(f, predStartDate);
            //check if predStartDate exists in f
            if (f.length > 0 && +f[idxOfStartDate].date === +predStartDate) {
                f[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
            }
            else {//add data point to forecastData array
                f.splice(idxOfStartDate, 0, {
                    date: predStartDate,
                    value: confirmedData[confirmedData.length - 1].value
                });
                f = f.slice(idxOfStartDate, f.length);
            }
            forecastData[index] = f;
            predictionArea.append("path")
                        .attr("class", "forecast line")
                        .attr("id", modelClassNames[index])
                        .style("stroke", color(models[index]))
                        .datum(f)
                            .attr("d", line);
        })
        
        var lines = document.getElementsByClassName('line');        
        
        //variables used to initialize user prediction data if it doesn't exist in the db
        var currDate = predStartDate;
        var defined = true;
        var value = confirmedData[confirmedData.length - 1].value;
        //const confirmedLastVal = value; //used to make sure the first data point of prediction stays the same
        
        //check if userPrediction already exists in db
        if (Object.keys(userPrediction).length > 0) {
            predictionData = predictionData.filter(d => (+d.date >= +predStartDate) && (+d.date <= +predEndDate));
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            currDate = d3.timeDay.offset(predictionData[predictionData.length - 1].date, 1);
            predictionData.concat(createDefaultPrediction(currDate, predEndDate));
        }
        else {
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
        }

        var filteredData = null;
//!!    //add forecast data to compiledData
        //get complete dataset from paths
        const forecastPaths = document.querySelectorAll(".forecast");
        const confirmedPath = document.querySelector("#confirmed");
        const aggregatePath = document.querySelector("#aggregate");
        confirmedData = getAllDataPoints(confirmedPath, x, y, confirmedStartDate, predStartDate);
        compiledData.push({
            name: labels[0],
            data: confirmedData
        })
        console.log(confirmedData);
        console.log(confirmed)
        var lastDate = aggregateData[aggregateData.length - 1].date;
        aggregateData = getAllDataPoints(aggregatePath, x, y, aggregateData[0].date, lastDate)
        compiledData.push({
            name: labels[1],
            data: aggregateData
        })
        compiledData.push({
            name: labels[2],
            data: predictionData
        })
        modelClassNames.map((m, index) => {
            var lastDate = forecastData[index][forecastData[index].length - 1].date;
            forecastData[index] = getAllDataPoints(forecastPaths[index], x, y, predStartDate, lastDate);
            compiledData.push({
                name: m,
                data: forecastData[index]
            })
        })
        //join data to yourLine
        filteredData = predictionData.filter(predLine.defined())
        yourLine.datum(filteredData)
                .attr('d', predLine)
                .style("stroke", color(names[2]))
                .style("stroke-width", "2px")
        //append new rect  
        const mouseArea = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("id", "mouse-area")
            .style("pointer-events","visible");

        //append click area rect
        var confirmedAreaWidth = confirmedLine.node().getBoundingClientRect().width; //get width of path element containing confirmed data
        var clickAreaWidth = width - confirmedAreaWidth; //the remaining area
        svg.append("rect")
           .attr("id", "click-area")
           .attr("width", clickAreaWidth)
           .attr("height",height)
           .attr("transform", "translate (" + confirmedAreaWidth+" 0)")
           .attr("fill", "none")
           .style("pointer-events","visible");
        //var clickArea = d3.select("#click-area");
        
        //append draw your guess text
        const drawingInstruction = svg
                                        .append("g")
                                        .attr("id", "drawing-instruction")
                                        .style("opacity", "0");
        drawingInstruction
                            .append("text")
                            .attr("id", "draw-guess")
                            .attr("x", confirmedAreaEndX + (width - confirmedAreaEndX) / 2)             
                            .attr("y", height - 100)
                            .attr("text-anchor", "middle")  
                            .text("Draw your guess")
                            .style("font-size", "16px");
        //append circle at the end of confirmed curve
        var selectCircle = drawingInstruction
                                                .append("g")
                                                .attr("id", "pointer");
        var pointerCircles = ["pulse-disk", "pulse-circle", "pulse-circle-2"];
        pointerCircles.map((c) => {
        selectCircle.append("circle")
            .attr("class", c)
            .attr("cx", confirmedAreaEndX)
            .attr("cy", confirmedAreaEndY)
        })

        if(Object.keys(userPrediction).length === 0) {
            svg
                .select("#drawing-instruction")
                .style("opacity", "1");
        }

        var drag = d3.drag()
                     .on("drag", function() {
                        //hide "draw your guess" text
                        svg
                            .select("#drawing-instruction")
                            .style("opacity", "0");
                        d3.select("#tooltip-line")
                            .style("opacity", "0");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "0");
                        d3.select(".tooltip-box")
                            .style("display", "none")
                        var pos = d3.mouse(this);
                        var date = clamp(predStartDate, predEndDate, x.invert(pos[0]));
                        var value = clamp(0, yAxisMax, y.invert(pos[1]));
                        
                        predictionData.forEach(function(d){
                            if (+d3.timeDay.round(d.date) === +d3.timeDay.round(date)){
                                d.value = value;
                                d.defined = true
                            }
                        predictionData[0].value = confirmedLastVal;//make sure the prediction curve is always connected to the confirmed curve
                        //update totalData everytime predictionData is updated
                        compiledData[2].data = predictionData;
                        //console.log(compiledData)
                        /*yourLine.datum(predictionData)
                                .attr('d', predLine)*/
                        filteredData = predictionData.filter(predLine.defined())
                        yourLine.datum(filteredData)
                                .attr('d', predLine)
                                // .style("stroke", color(models[2]))
                                // .style("stroke-width", "2px")
                        focusPredCurve.datum(filteredData)
                                        .attr("d", focusPredLine);

                        });
                    })
                    .on("end", function () {
                        d3.select("#tooltip-line")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "1");
                        d3.select(".tooltip-box")
                            .style("display", "block")
                        var lastPredDate = filteredData[filteredData.length - 1].date;
                        getDataPointsFromPath(predictionData, yourLine.node(), x, y, lastPredDate);
                        compiledData[2].data = predictionData;
                        savePrediction(predictionData, category);
                    });
        
        svg.call(drag)

        const tooltipArea = svg
                                .append("g")
                                .attr("class", "tooltip")

        tooltipArea.append("path") //vertical line
                    .attr("id", "tooltip-line")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("opacity", "0");
        //where text will be
        var tooltipBox = d3.select(".tooltip-box")
                            //  .style("background-color", "white")
                            // .style("border", "solid")
                            // .style("border-width", "2px")
                            // .style("border-radius", "5px")
                            // .style("padding", "5px")
                            .style("position", "absolute")
                            .style("display", "block")
                            .style("left", "10px")
                            .style("top", "10px");
        // tooltipBox.selectAll("box")
        //             .data(compiledData)
        //             .enter()
        //             .append("div")
        //             .attr("class", d => d.name);    

        //console.log(compiledData)
        var mousePerLine = tooltipArea
                                        .selectAll(".mouse-per-line")
                                        .data(compiledData)
                                        .enter()
                                        .append("g")
                                        .attr("class", "mouse-per-line");
        
        mousePerLine.append("circle")
                        .attr("r", 2)
                        .style("stroke", function(d, i) {
                            return color(names[i]);
                        })
                        .style("fill", "none")
                        .style("stroke-width", "1px")
                        .style("opacity", "0");

        var chart = tooltipArea
                            .append("svg:rect")
                            .attr('width', width)
                            .attr('height', height)
                            .attr('fill', 'none')
                            .attr('pointer-events', 'all')
                            //.style("cursor", "pointer")
                            .on('mouseout', function() { // on mouse out hide line, circles and text
                                d3.select("#tooltip-line")
                                .style("opacity", "0");
                                d3.selectAll(".mouse-per-line circle")
                                .style("opacity", "0");
                                d3.selectAll(".mouse-per-line text")
                                .style("opacity", "0")
                                tooltipBox.style("display", "none")
                            })
                            .on('mouseover', function() { // on mouse in show line, circles and text
                                d3.select("#tooltip-line")
                                .style("opacity", "1");
                                tooltipBox.style("display", "block")
                            })
                            .on('mousemove', function() { // mouse moving over canvas
                                var mouse = d3.mouse(this);
                                var xCoord = mouse[0];
                                var yCoord = mouse[1];
                                const xLowerBoundary = x(confirmedData[confirmedData.length - 1].date)
                                if (xCoord > xLowerBoundary && xCoord < width && yCoord > 0 && yCoord < height) {
                                    chart.attr("cursor", "pointer");
                                }
                                else {
                                    chart.attr("cursor", "default");
                                }
                                d3
                                    .select("#tooltip-line")
                                    .attr("d", function() {
                                        var d = "M" + xCoord + "," + height;
                                        d += " " + xCoord + "," + 0;
                                        return d;
                                    });
                                tooltipBox
                                    .style('left', `${d3.event.pageX + 20}px`)
                                    .style('top', `${d3.event.pageY + 20}px`)
                                d3
                                    .selectAll(".mouse-per-line")
                                    .attr("transform", function(d, i) {
                                        if (d.data.length === 0) {return;}
                                        var date = x.invert(xCoord);
                                        var value = -1;
                                        d.data.map(d => {
                                            if(+d.date === +d3.timeDay.round(date) && d.defined !== 0) {
                                                value = d.value;
                                            }
                                        })
                                        var element = d3.select(this);
                                        var textBox = tooltipBox.select(`.${d.name}`);

                                        if (value >= 0) {
                                            if(textBox.empty()) {
                                                textBox = tooltipBox.append("div")
                                                                     .attr("class", d.name)
                                                                     .style("padding-left", "10px")
                                                                     .style("padding-right", "10px")
                                                                     .style("background-color", color(names[i]))
                                                                     .style("color", "white");

                                            }
                                            else {
                                                textBox.html(`${names[i]}: ${Math.round(value)}`)
                                            }
                                            element.select("circle")
                                                    .style("opacity", "1");
                                            return "translate(" + mouse[0] + "," + y(value)+")";
                                        }
                                        else {
                                            if(!textBox.empty()) {
                                                textBox.remove();
                                            }

                                            element
                                                    .select("circle")
                                                    .style("opacity", "0");
                                        }
                                        
                                });
                            })
        ////ADD TODAY LINE/////////////////////////////////////////////////////
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        var todayMarker = svg
                            .append("g")
                            .attr("id", "today-marker")
        todayMarker
                    .append("line")
                    .attr("id", "today-line")
                    .attr("x1", x(today))
                    .attr("x2", x(today))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "8, 8")
        todayMarker
                    .append("text")
                    .attr("id", "today-text")
                    .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
                    .text("Today")
                    .style("text-anchor", "end")

        /////////////////////////////////////////////////////////////////////////////////////////////
        // const focusHeight = 100;
        const focusMargin = 50;
        var focus = svg
                            .append("g")
                                .attr("viewBox", [0, 0, width, focusHeight])
                                .attr("transform", `translate(0,${height + focusMargin} )`)
                                //.attr("width", width + 100)
                                //.attr("height", height)
                                .style("display", "block")



        /*const xAxis = (g, x, height) => g
                                            .attr("transform", `translate(0,${height - margin.bottom})`)
                                            .call(d3.axisBottom(x))*/

        var focusX = d3
                            .scaleTime()
                            .domain([confirmedStartDate, predEndDate])
                            .range([0, width]);
        const focusY = d3
                        .scaleLinear()
                        .domain([0, yAxisMax])
                        .range([focusHeight - margin.bottom, 0])
                        .nice();
        
        var focusXAxis = focus
                                    .append("g")
                                    .attr("transform", `translate(0,${focusHeight - margin.bottom})`)
                                    .call(d3.axisBottom(focusX));
        const brush = d3.brushX()
                        .extent([[0, 0], [width, focusHeight - margin.bottom]])
                        .on("brush", brushed)
                        .on("end", brushended);

        const defaultSelection = [x(d3.timeMonth.offset(x.domain()[1], -8)), x.range()[1]];
    
        /*context.append("g")
                .call(xAxis, x, focusHeight);*/
        const focusLine = d3.line()
                            .curve(d3.curveCatmullRom)
                            .x(function(d) {return x(d.date)})
                            .y(function (d) {return focusY(d.value)})
        
        const focusPredLine = d3.line()
                                .curve(d3.curveBasis)
                                .defined(d => d.defined)
                                .x(function(d) { return focusX(d.date) })
                                .y(function(d) { return focusY(d.value) })        
        focus.append("path")
            .datum(confirmedData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("stroke", color(names[0]))
        
        focus.append("path")
            .datum(aggregateData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("stroke", color(names[1]))

        var focusPredCurve = focus.append("path")
                                    .datum(predictionData)
                                    .attr("d", focusPredLine)
                                    .attr("class", "context-curve")
                                    .attr("stroke", color(names[2]))
        
        forecastData.map((f, index) => {
            focus
                    .append("path")
                    .datum(f)
                    .attr("d", focusLine)
                    .attr("class", "context-curve")
                    .attr("stroke", color(models[index]));

        })
        function brushed() {
            if (d3.event.selection) {
                var extent = d3.event.selection;
                //console.log([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
                x.domain([ focusX.invert(extent[0]), focusX.invert(extent[1]) ]);
                xAxis
                        //.transition()
                        //.duration(1000)
                        .call(d3.axisBottom(x))
                var newX = x(confirmedData[confirmedData.length - 1].date);
                newX = newX < 0 ? 0 : newX;
                d3
                    .select("#prediction-clip")
                    .select("rect")
                        .attr("width", width - newX)
                        .attr("x", newX);

                svg
                    .selectAll(".line")
                    //.transition()
                    //.duration(1000)
                    .attr('d', line)

                svg
                    .select("#your-line")
                    .attr("d", predLine)
                
                //reposition draw your guess text and pointer
                svg
                    .select("#draw-guess")
                    .attr("x", newX + (width - newX) / 2);
                svg
                    .select("#pointer")
                    .selectAll("circle")
                        .attr("cx", newX);
                todayMarker.select("line")
                        .attr("x1", x(today))
                        .attr("x2", x(today))
                todayMarker.select("text")
                        .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)

            }
        }
        
        function brushended() {
            if (!d3.event.selection) {
                gb.call(brush.move, defaultSelection);
                
            }

        }
        const gb = focus
                        .call(brush)
                        .call(brush.move, defaultSelection)
                        .on("click", function() {
                            d3.select(".speech-bubble").style("display", "none");
                        })
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        var deleteButton = d3.select("#delete-btn").node()
        deleteButton.onclick = () => {
            this.deletePrediction(category)
            console.log("deleted")
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            //update yourLine
            var filtered = predictionData.filter(predLine.defined())
            yourLine.datum(filtered)
                    .attr('d', predLine)
            focusPredCurve.datum(filtered)
                            .attr("d", focusPredLine)
                    
            svg
                .select("#drawing-instruction")
                .style("opacity", "1");
            compiledData[2].data = predictionData;
        };
        var legendConfirmed = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendAggregate = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendPrediction = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 2)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendGeorgiaTech = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 3)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendIhme = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 4)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendYouyang = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 5)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendColumbia = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 6)
                .attr("fill", "none")
                .style("pointer-events","visible");

        var legendUcla = legend.append("rect")
                .attr("width", legendCompleteWidth)
                .attr("height", legendSingleHeight)
                .attr("x", 0)
                .attr("y", 10 + legendSingleHeight * 7)
                .attr("fill", "none")
                .style("pointer-events","visible");

        legendConfirmed.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#confirmed").style("stroke", color(names[0]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendAggregate.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#aggregate").style("stroke", color(names[1]));
                         })
                         .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendPrediction.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#your-line").style("stroke", color(names[2]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendGeorgiaTech.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#gt").style("stroke", color(names[3]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendIhme.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#ihme").style("stroke", color(names[4]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
        legendYouyang.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#youyang").style("stroke", color(names[5]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
        legendColumbia.on("mouseover", function() {
                            svg.selectAll(".line").style("stroke", "#ddd");
                            svg.select("#columbia").style("stroke", color(names[6]));
                        })
                        .on("mouseout", function() {
                            svg.selectAll(".line")
                                .style("stroke", (d, i) => color(names[i]))
                        })
        legendUcla.on("mouseover", function() {
                        svg.selectAll(".line").style("stroke", "#ddd");
                        svg.select("#ucla").style("stroke", color(names[7]));
                    })
                    .on("mouseout", function() {
                        svg.selectAll(".line")
                            .style("stroke", (d, i) => color(names[i]))
                    })
    }
        
    render() {
        return(
        <div>
            <h2>US Daily Deaths</h2>
            
            {/*<p>Current total: {this.confirmedData.value}</p>*/}
            <div className="chart">
                <div className="text"></div>
                <div ref={this.chartRef}>
                    <svg className="main-chart"></svg>
                </div>
                <div className="third-column">
                    <svg className="legend-container"></svg>
                    <button className="btn btn-primary " id="delete-btn">Reset</button>
                    <div class="speech-bubble left">shift or resize the gray box to change the zoom level</div>
                </div>
            </div>
            <div class="tooltip-box"></div>
        </div>);
    }
}

export default InteractiveChart;