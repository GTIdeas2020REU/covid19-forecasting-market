import React, { Component } from 'react';
import * as d3 from 'd3'
import './MainChart.css'
import { clamp, createDefaultPrediction, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction, getLastDate, getLastValue } from '../../utils/data';
import { elementType } from 'prop-types';
import { addDays, formatDate } from '../../utils/date';
import { timeDay } from 'd3';
import { titles } from '../../constants/data';

class MainChart extends Component {
    constructor(props) {
        super(props);
        this.chartRef = React.createRef();
    }
    componentDidMount() {
        this.renderChart()
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

    renderChart() {
        const {compiled, loggedIn, category} = this.props;
        const title = titles[category][0];
        const subtitle = titles[category][1];
        const confirmed = compiled["confirmed"];
        const forecast = compiled["forecast"];
        const aggregate = compiled["aggregate"];
        const userPrediction = compiled["user_prediction"];
        const mse = compiled["mse"];
        if (!loggedIn) {this.appendModal()}
        const orgs = []
        forecast.forEach(d => {
            orgs.push(d.name);
        })
        // correct order of forecasts
        var predictionData = [];//where we will store formatted userPrediction
        const savePrediction = this.savePrediction;
        const createDefaultPrediction = this.createDefaultPrediction;
        // const category = this.state.category;
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
            .text(`COVID-19 Forecasts of ${subtitle} Over Time`);

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
            .text(`${title}`);
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = reformatData(confirmed);
        const confirmedLastDate = getLastDate(confirmedData);
        const confirmedLastVal = getLastValue(confirmedData);        
        let temp = forecast.map(f => {
            return reformatData(f.data);
        }); 
        let forecastData = forecast.map(f => {
            return reformatData(f.data);
        }); 
        let tempNames = []
        let forecastDataTemp = []
        console.log(temp)
        let todayD3 = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        temp.forEach((forecast, index) => {
            if (forecast.length > 0) {
                let filtered = forecast.filter(d => +d.date > +confirmedLastDate)
                if (filtered.length > 0) {
                    filtered.unshift({"date": confirmedLastDate, "value": confirmedLastVal})
                    console.log(filtered)
                    forecastDataTemp.push(filtered);
                    tempNames.push(orgs[index]);
                }
            }
        })

        console.log(forecastDataTemp, tempNames)
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
        
        var legendString = [`${title} Confirmed`, "Aggregate Forecast", "User Prediction"].concat(orgs);
        var models = [];
        orgs.map((o, i) => {
            //var idx = o.indexOf("(");
            //models.push(o.substring(0, idx - 1));
            models.push(o);
        })
        var names = [`${title}`, "Aggregate Forecast", "User Prediction"].concat(models)
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
        let forecastNames = [];
        console.log(forecastData)
        forecastData.map((f, index) => {
            console.log(f)
            //make sure they all stem from the confirmed curve!
            //var temp = d3.timeParse("%Y-%m-%d")("2020-07-18")
            if (f.length != 0) {
                console.log(predStartDate)
                var idxOfStartDate = d3.bisector(f => f.date).left(f, predStartDate);
                console.log(idxOfStartDate)
                console.log(f[idxOfStartDate])

                //check if predStartDate exists in f
                if (f.length > 0 && idxOfStartDate < f.length && +f[idxOfStartDate].date === +predStartDate) {
                    f[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
                }
                else {//add data point to forecastData array
                    f.splice(idxOfStartDate, 0, {
                        date: predStartDate,
                        value: confirmedData[confirmedData.length - 1].value
                    });
                    f = f.slice(idxOfStartDate, f.length);
                }
                console.log(f)
                forecastData[index] = f;
                predictionArea.append("path")
                            .attr("class", "forecast line")
                            .attr("id", modelClassNames[index])
                            .style("stroke", color(models[index]))
                            .datum(f)
                                .attr("d", line);
            }
            
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
            console.log(m, forecastData[index])
            if (forecastData[index].length > 1) {
                var lastDate = forecastData[index][forecastData[index].length - 1].date;
                forecastData[index] = getAllDataPoints(forecastPaths[index], x, y, predStartDate, lastDate);
                compiledData.push({
                    name: m,
                    data: forecastData[index]
                })
            }
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
                            // .attr("x", 0)             
                            .attr("y", 20)
                            .attr("text-anchor", "middle")  
                            .text("Draw your guess")
                            .style("font-size", "19px")
                            .style("font-weight", "bold")
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
                        if (!loggedIn) {
                            d3.select("#modal")
                                .style("display", "block");
                            d3.select("#tooltip-line")
                                .style("opacity", "1");
                            d3.selectAll(".mouse-per-line circle")
                                .style("opacity", "1");
                            d3.select(".tooltip-box")
                                .style("display", "block")
                        }
                    });
        
        svg.call(drag)
        var modal = document.getElementById("modal");

        window.onclick = function(event) {
            if (event.target === modal) {
              modal.style.display = "none";
            }
          }
        //////add tooltip//////
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
    renderOldChart() {
        const {compiled, loggedIn} = this.props;
        const confirmed = compiled["confirmed"];
        const forecast = compiled["forecast"];
        const aggregate = compiled["aggregate"];
        const userPrediction = compiled["user_prediction"]
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        var svg = d3.select(".main-chart")
                    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + 100}`)
                    .append("g")
                    .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`);
        var confirmedData = reformatData(confirmed);
        var compiledData = [confirmedData]

        const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-04-12");
        const confirmedEndDate = d3.timeParse("%Y-%m-%d")("2020-09-17");
        var x = d3.scaleTime()
            .domain([confirmedStartDate, confirmedEndDate])
            .range([ 0, width ])

        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        var confirmedMax = d3.max(confirmedData, function(d) { return +d.value; });
        var y = d3.scaleLinear()
            .domain([0, confirmedMax])
            .range([ height, 0 ])
            .nice();
        svg
            .append("g")
            .call(d3.axisLeft(y));
        var lineGenerator = d3.line()
            //.curve(d3.curveBasis);
            .curve(d3.curveCatmullRom)//curve that goes through all data points
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
        
        // Create the confirmed area variable
        const names = ["Confirmed Cases"]
        var confirmedLine = mainArea.append("path")
                            .attr("id", "confirmed")
                            .attr("class", "line confirmed")    
                            .datum(confirmedData)    
                            .attr('d', line)
                            .attr("fill", "none")
                            .attr("stroke", "steelblue")
                            .attr("stroke-width", 1.5)
                            var legend = d3.select(".legend-container")
                            .attr("viewBox", "0 0 400 500")
                            .append('g')
                            .attr("id", "legend")
        var size = 10;
        const legendMarginL = 30;
        var color = d3
                        .scaleOrdinal()
                        .domain(names)
                        .range(d3.schemeTableau10);
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
                .data(names)
                .enter()
                .append("text")
                    .attr("x", 30)
                    .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    // .style("fill", function(d, index){ return color(names[index])})
                    .text(function(d){return d})
                        .attr("text-anchor", "left")
                        .style("alignment-baseline", "middle")
        ////////////tooltip stuff////////////
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
                            .style("position", "absolute")
                            .style("display", "block")
                            .style("left", "10px")
                            .style("top", "10px");
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
                            // if (xCoord > xLowerBoundary && xCoord < width && yCoord > 0 && yCoord < height) {
                            //     chart.attr("cursor", "pointer");
                            // }
                            // else {
                            //     chart.attr("cursor", "default");
                            // }
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
                                    if (d.length === 0) {return;}
                                    var date = x.invert(xCoord);
                                    var value = -1;
                                    d.map(d => {
                                        if(+d.date === +d3.timeDay.round(date) && d.defined !== 0) {
                                            value = d.value;
                                        }
                                    })
                                    var element = d3.select(this);
                                    var textBox = tooltipBox.select(`.confirmed`);

                                    if (value >= 0) {
                                        if(textBox.empty()) {
                                            textBox = tooltipBox.append("div")
                                                                .attr("class", "confirmed")
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
    }
    render() {
        const title = titles[this.props.category][0];
        return (
            <div>
            <h2>{title}</h2>
            <div className="chart">
                <div className="first-column">
                    <div className="main-instruction">
                        <p className="info">
                            <b>COVIDforecasts is created by academic researchers for you to compare 
                            official COVID forecasts and contribute your own. Currently we compare 
                            forecasts for U.S. daily deaths, and we hope to expand to more forecasts 
                            in the future.</b>
                        </p>
                        <p>> Hover over the graph to view the tooltip</p>
                        {/* <br/> */}
                        <p>> Hover over the legend to view individual curves</p>
                        {/* <br/> */}
                        <p>> Drag on the chart to draw your own prediction</p>
                        {/* <br/> */}
                        <p>> Click Reset to erase your prediction</p>
                        {/* <br/> */}
                        <p>> Navigate to <b>Top Forecasts</b> to view the accuracy of various forecasts and user predictions</p>
                        <br></br>
                        <p>
                            <b>After you are done exploring our site, we would appreciiate it if you could fill out <a href='https://docs.google.com/forms/d/e/1FAIpQLSe0-op5rJmW0aimj59Pj76cE0p9v3PQ9FtOSyHMLmfQhgo6PA/viewform?usp=sf_link'>this form</a> with any feedback or thoughts, thank you for visiting COVIDforecasts.</b>
                        </p>
                    </div>
                </div>

                <div ref={this.chartRef} className="second-column">
                    <svg className="main-chart"></svg>
                    {/* <div className="privacy">
                        <span className="bold">Privacy</span>: User-contributed forecast data is used to create aggregate forecasts and is displayed to other visitors on the "Top Forecasts" page. It may also be used, anonymized, for academic research purposes. Other than that, we do not and will not share or sell any user or visitor information for any reason.
                    </div> */}
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
export default MainChart;
