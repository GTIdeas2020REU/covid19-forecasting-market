import React, { Component } from 'react';
import * as d3 from 'd3'
import './MainChart.css'
import { resetPredictionData, clamp, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction, getLastDate, getLastValue } from '../../utils/data';
import { titles, forecastIdentifiers } from '../../constants/data';

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
        let modal = document.createElement("div");
        modal.id = "modal";
        let modalContent = document.createElement("div");
        modalContent.id = "modal-content";
        let text = document.createElement("p");
        text.innerText = "Please log in to save your prediction.";
        let signinBtn = document.createElement("button");
        signinBtn.id = "signin-btn";
        signinBtn.innerText = "Sign In";
        signinBtn.onclick= signinRedirect;
        signinBtn.className = "btn primary-btn";
        let signupBtn = document.createElement("button");
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
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        if (!loggedIn) {this.appendModal()}
        let predictionData = [];//where we will store formatted userPrediction
        let forecastData = [];//formatted forecastData
        const savePrediction = this.savePrediction;
        let compiledData = [];

        //set up margin, width, height of chart
        const focusHeight = 100;
        let margin = {top: 20, right: 30, bottom: 30, left: 80},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        let svg = d3.select(".main-chart")
                        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + focusHeight + 100}`)
                    .append("g")
                        .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`)
                        .style("width", width)

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
            .attr("y", h + margin.bottom + 50)
            .style("text-anchor", "middle")
            .text("Date");
            
        //Create Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - (margin.left))
            .attr("x", 0 - (h/2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(`${title}`);
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        let confirmedData = reformatData(confirmed);
        const confirmedStartDate = confirmedData[0].date;
        const confirmedLastDate = getLastDate(confirmedData);
        const confirmedLastVal = getLastValue(confirmedData);
        const predStartDate = today; //last date of confirmedData
        const predLength = 155;
        const absMaxDate = d3.timeYear.offset(today, 2);
        let predEndDate = d3.timeDay.offset(predStartDate, predLength)

        let aggregateData = reformatData(aggregate);
        aggregateData = aggregateData.filter(d => +d.date >= +today)

        let forecastLabels = [];//display names ex) UCLA, Columbia
        let forecastIds = [];//ids ex) ucl, columbia, georgia-tech
        forecast.forEach(f => {
            let formattedData = reformatData(f.data);
            let filtered = formattedData.filter(d => +d.date >= +today)
            if (filtered.length > 0) {
                forecastData.push(filtered)
                forecastLabels.push(f.name);
                forecastIds.push(forecastIdentifiers[f.name]);
            }
        })
        
        //get most recent user prediction if it exists
        if(Object.keys(userPrediction).length > 0) {
            const mostRecentPred = getMostRecentPrediction(userPrediction);
            predictionData = reformatPredData(mostRecentPred);
            predictionData = predictionData.filter(d => +d.date >= +today)
            predEndDate = +d3.timeDay.offset(getLastDate(predictionData), 60) < +absMaxDate ? d3.timeDay.offset(getLastDate(predictionData), 60) : absMaxDate;
        }
        else {
            predictionData.push({"date": today, "value": 0, defined: 0});
            //predictionData = createDefaultPrediction(predStartDate, predEndDate);
        }
        //add x-axis     
        var x = d3.scaleTime()
            .domain([confirmedStartDate, predEndDate])
            .range([0, width])
            .nice(); //rounds up/down the max and min of x axis
        let xAxisD3 = d3.axisBottom(x);
        let xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .attr("id", "x-axis")
                        .style("user-select", "none")
                        .call(xAxisD3);
        
        //find max val in confirmedData and forecastData to determine the max of y-axis
        let yAxisMax = d3.max(confirmedData, d => { return +d.value; });
        forecastData.map(f => {
            let currMax = d3.max(f, d => {return d.value;})
            yAxisMax = Math.max(yAxisMax, currMax);
        })
        if (predictionData.length > 0) {
            let predictionMax = d3.max(predictionData, d => {return d.value;})
            yAxisMax = Math.max(yAxisMax, predictionMax);
        }
        //draw y-axis
        let y = d3.scaleLinear()
                  .domain([0, yAxisMax * 1.05]) //leave some space above the curve so it doesn't overlap with today text
                  .range([ height, 0 ])
                  .nice();
        let yAxisD3 = d3.axisLeft(y);
        let yAxis = svg.append("g")
                       .attr("id", "y-axis")
                       .style("user-select", "none")
                       .attr('pointer-events', 'visible')
                       .call(yAxisD3);

        //add rect beneath x, y axes to enable drag to adjust axes
        let yAxisDragRect = svg.append("rect")
                                    .attr("class", "y-axis-drag")
                                    .attr("width", 55)
                                    .attr("height", height)
                                    .attr("x", -55)
                                    .attr("y", 0)
                                    .attr("fill", "none")
                                    .attr('pointer-events', 'visible');

        let xAxisDragRect = svg.append("rect")
                                    .attr("class", "x-axis-drag")
                                    .attr("width", width)
                                    .attr("height", margin.bottom)
                                    .attr("x", 0)
                                    .attr("y", height)
                                    .attr("fill", "none")
                                    .attr('pointer-events', 'visible');
            
        const legendString = [`${title}`, "Aggregate Forecast", "User Prediction"].concat(forecastLabels); //names displayed in legend
        const compiledIds = ["confirmed", "aggregate", "prediction"].concat(forecastIds);
        
        //color function that assigns random colors to each curve
        const color = d3
                        .scaleOrdinal()
                        .domain(compiledIds)
                        .range(d3.schemeTableau10);
         //draw legend
        let legend = d3.select(".legend-container")
                            .attr("viewBox", "0 0 400 500")
                        .append('g')
                            .attr("id", "legend")
        legend.selectAll("legend")
            .data(legendString)
            .enter()
            .append("circle")
                .attr('cx', 10)
                .attr("cy", (d,i) => { return 20 + i*25; }) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                .style("fill", ((d, i) => { return color(compiledIds[i]); }))

        legend.selectAll("labels")
            .data(legendString)
            .enter()
            .append("text")
                .attr("x", 30)
                .attr("y", (d,i) => { return 20 + i*25; }) // 100 is where the first dot appears. 25 is the distance between dots
                .text(d => { return d; })
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")
            
        const legendRectWidth = document.querySelector("#legend").getBoundingClientRect().width;
        const legendRectHeight = 25; //height of each entry rectangle in legend

        legend.selectAll("rectangles")
            .data(legendString)  
            .enter()      
            .append("rect")
                .attr("width", legendRectWidth)
                .attr("height", legendRectHeight)
                .attr("x", 0)
                .attr("y", (d, i) => { return legendRectHeight * i + 5; })
                .attr("fill", "none")
                .style("pointer-events","visible")
                .attr('class', ((d, i) => { return compiledIds[i]; }));

        legend.selectAll('rect').on("mousemove", function() {
            let identifier = d3.select(this).attr('class')
            svg.selectAll(".line").style("stroke", "#ddd");
            svg.select(`#${identifier}`).style("stroke", color(identifier));
        })
        .on("mouseout", function() {
            svg.selectAll(".line")
                .style("stroke", (d, i) => color(compiledIds[i]))
        })

        //create line generator for confirmed/forecast data and prediction data
        //function that draws curve
        const line = d3.line().curve(d3.curveCatmullRom)//curve that goes through all data points
                     .x(function(d) { return x(d.date) })
                     .y(function(d) { return y(d.value) })

        const predLine = d3.line().curve(d3.curveBasis)//curve doesn't go through all data points (it's smoothed out)
                         .defined(d => d.defined)
                         .x(function(d) { return x(d.date) })
                         .y(function(d) { return y(d.value) })
        
        //add clip path where the confirmed curve will be drawn
        svg.append("defs")
           .append("svg:clipPath")
                .attr("id", "main-clip")
           .append("svg:rect")
                .attr("width", width )
                .attr("height", height )
                .attr("x", 0)
                .attr("y", 0);
        const mainArea = svg.append('g')
                                .attr("clip-path", "url(#main-clip)");

        //display confirmed data
        let confirmedLine = mainArea.append("path")
                                        .attr("id", "confirmed")
                                        .attr("class", "line")    
                                        .datum(confirmedData)    
                                        .attr('d', line)
                                        .attr("stroke", color(compiledIds[0]))
                                        .style("stroke-width", "3px")
        let confirmedAreaEndX = x(getLastDate(confirmedData));

        //append clip-path for prediction curve
        svg.append("defs").append("svg:clipPath")
                .attr("id", "prediction-clip")
            .append("svg:rect")
                .attr("id", "prediction-rect")
                .attr("width", width - confirmedAreaEndX )
                .attr("height", height )
                .attr("x", confirmedAreaEndX)
                .attr("y", 0);
        const predictionArea = svg.append('g')
                                        .attr("clip-path", "url(#prediction-clip)");
        //display aggregate data
        let aggregateLine = predictionArea.append("path")
                                            .attr("id", "aggregate")
                                            .attr("class", "line")        
                                            .datum(aggregateData)    
                                            .attr('d', line)
                                            .attr("stroke", color(compiledIds[1]))
                                            .style("stroke-width", "2px")
        //display prediction data
        let filteredData = predictionData.filter(predLine.defined())
        let predictionLine = predictionArea.append("path")
                                            .attr("id", "prediction")
                                            .attr("class", "prediction line")
                                            .datum(filteredData)
                                            .attr('d', predLine)
                                            .style("stroke", color(compiledIds[2]))
                                            .style("stroke-width", "2px")
        //display forecast data
        forecastData.map((f, index) => {
            predictionArea.append("path")
                            .attr("class", "forecast line")
                            .attr("id", forecastIds[index])
                            .style("stroke", color(forecastIds[index]))
                            .datum(f)
                                .attr("d", line);
        })
        
        //animate curves
        let confirmedCurveLength = confirmedLine.node().getTotalLength();
        let aggregateCurveLength = aggregateLine.node().getTotalLength();

        confirmedLine.attr("stroke-dasharray", `${confirmedCurveLength} ${confirmedCurveLength}`)
                     .attr("stroke-dashoffset", confirmedCurveLength)
                     .transition()
                     .delay(2000)
                     .duration(3000)
                     .ease(d3.easeLinear)
                     .attr("stroke-dashoffset", 0)
                     .on("end", () => { confirmedLine.attr("stroke-dasharray", 0); });

        aggregateLine.attr("stroke-dasharray", `${aggregateCurveLength} ${aggregateCurveLength}`)
                     .attr("stroke-dashoffset", aggregateCurveLength)
                     .transition()
                     .delay(5000)
                     .duration(2000)
                     .ease(d3.easeLinear)
                     .attr("stroke-dashoffset", 0)
                     .on("end", () => { aggregateLine.attr("stroke-dasharray", 0); });
        forecastIds.forEach(f => {
            let curve = d3.select(`#${f}`)
            let curveTotalLength = curve.node().getTotalLength();
            curve
                .attr("stroke-dasharray", `${curveTotalLength} ${curveTotalLength}`)
                .attr("stroke-dashoffset", curveTotalLength)
                .transition()
                .delay(5000)
                .duration(2000)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0)
                .on("end", () => { curve.attr("stroke-dasharray", 0); });
        })
        
        //check if userPrediction already exists in db
        // if (Object.keys(userPrediction).length > 0) {
        //     predictionData = predictionData.filter(d => (+d.date >= +predStartDate) && (+d.date <= +predEndDate));
        //     predictionData[0].value = confirmedLastVal;
        //     predictionData[0].defined = true;
        //     currDate = d3.timeDay.offset(predictionData[predictionData.length - 1].date, 1);
        //     predictionData.concat(createDefaultPrediction(currDate, predEndDate));
        // }

        //get complete dataset from curves
        const forecastPaths = document.querySelectorAll(".forecast");
        const aggregatePath = document.querySelector("#aggregate");
        if (aggregateData.length > 0) {
            aggregateData = getAllDataPoints(aggregatePath, x, y, aggregateData[0].date, getLastDate(aggregateData))
        }
        compiledData.push({
            name: compiledIds[0],
            data: confirmedData
        })
        compiledData.push({
            name: compiledIds[1],
            data: aggregateData
        })
        compiledData.push({
            name: compiledIds[2],
            data: predictionData
        })
        forecastIds.map((m, i) => {
            if (forecastData[i].length > 0) {
                forecastData[i] = getAllDataPoints(forecastPaths[i], x, y, forecastData[i][0].date, getLastDate(forecastData[i]));
                compiledData.push({
                    name: m,
                    data: forecastData[i]
                })
            }
        })
        
        //append draw your guess text
        const drawingInstruction = svg.append("g")
                                      .attr("id", "drawing-instruction")
                                      .style("opacity", "0");
        drawingInstruction.append("text")
                                .attr("id", "draw-guess")
                                .attr("y", 20)
                                .attr("text-anchor", "middle")  
                           .text("Draw your guess")
                                .style("font-size", "19px")
                                .style("font-weight", "bold")
        //append circle at the end of confirmed curve
        let selectCircle = drawingInstruction.append("g")
                                                .attr("id", "pointer");
        let pointerCircles = ["pulse-disk", "pulse-circle", "pulse-circle-2"];
        pointerCircles.map((c) => {
            selectCircle.append("circle")
                .attr("class", `${c} red-circle`)
                .attr("cx", x(confirmedLastDate))
                .attr("cy", y(confirmedLastVal))
        })

        if(Object.keys(userPrediction).length === 0) {
            svg.select("#drawing-instruction")
               .style("opacity", "1");
        }
        let dragStartPoint = null;
        let dragStartDate = null;
        var drag = d3.drag()
                    .on("start", function() {
                        dragStartPoint = d3.mouse(this)
                        dragStartDate = d3.timeDay.round(x.invert(dragStartPoint[0]));
                    })
                    .on("drag", function() {
                        //hide "draw your guess" text
                        svg.select("#drawing-instruction")
                           .style("opacity", "0");
                        //hide tooltip 
                        d3.select("#tooltip-line")
                            .style("opacity", "0");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "0");
                        d3.select(".tooltip-box")
                            .style("display", "none")
                        
                        let pos = d3.mouse(this);
                        let date = d3.timeDay.round(x.invert(pos[0]))
                        date = +date <= +x.domain()[1] ? date : x.domain()[1];
                        let value = clamp(0, y.domain()[1], y.invert(pos[1]));

                        if (+getLastDate(predictionData) < +date) {//if date doesn't exist in predictionData append new date
                            let currDate = d3.timeDay.offset(getLastDate(predictionData), 1);
                            let defined = 0;
                            if (predictionData.length === 1) {
                                predictionData[0].value = value;
                                predictionData[0].defined = true;
                                defined = true;
                            }
                            while (+currDate < +date) {
                                predictionData.push({"date": currDate, "value": value, "defined": defined})
                                currDate = d3.timeDay.offset(currDate, 1);
                            }
                            predictionData.push({"date": date, "value": value, "defined": true});
                            dragStartDate = date;
                        }
                        else {//data point already exists -> update data point
                            let dataIndex = d3.timeDay.count(predictionData[0].date, date)
                            predictionData[dataIndex].value = value;
                            predictionData[dataIndex].defined = true;
                            if (+dragStartDate != +date) { //reset prediction data inbetween startDate and current date
                                predictionData = resetPredictionData(dragStartDate, date, predictionData);
                                dragStartDate = date;
                            }
                        }
                        filteredData = predictionData.filter(predLine.defined())
                        predictionLine.datum(filteredData)
                                      .attr('d', predLine)
                        focusPredCurve.datum(filteredData)
                                      .attr("d", focusPredLine);
                    })
                    .on("end", function () {
                        d3.select("#tooltip-line")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "1");
                        d3.select(".tooltip-box")
                            .style("display", "block")
                        getDataPointsFromPath(predictionData, predictionLine.node(), x, y, getLastDate(filteredData));
                        compiledData[2].data = predictionData; //update compiledData
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
                    })
        svg.call(drag)

        const modal = document.getElementById("modal");
        window.onclick = function(event) {
            if (event.target === modal) {
              modal.style.display = "none";
            }
          }

        //add tooltip
        const tooltipArea = svg
                                .append("g")
                                .attr("class", "tooltip-area")
        tooltipArea.append("path") //vertical line
                    .attr("id", "tooltip-line")
                    .attr("class", "tooltip")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("opacity", "0");
        //where text will be
        let tooltipBox = d3.select(".tooltip-box")
                           .style("position", "absolute")
                           .style("display", "block")
                           .style("left", "10px")
                           .style("top", "10px");

        let mousePerLine = tooltipArea.selectAll(".mouse-per-line")
                                       .data(compiledData)
                                       .enter()
                                       .append("g")
                                       .attr("class", "mouse-per-line tooltip");
        
        mousePerLine.append("circle")
                        .attr("r", 2)
                        .style("stroke", function(d, i) {
                            return color(compiledIds[i]);
                        })
                        .style("fill", "none")
                        .style("stroke-width", "1px")
                        .style("opacity", "0");

        let chart = tooltipArea
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
                                                                     .style("background-color", color(compiledIds[i]))
                                                                     .style("color", "white");

                                            }
                                            else {
                                                textBox.html(`${legendString[i]}: ${Math.round(value)}`)
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
        var todayMarker = svg
                            .append("g")
                            .attr("id", "today-marker")
        todayMarker.append("line")
                   .attr("id", "today-line")
                   .attr("x1", x(today))
                   .attr("x2", x(today))
                   .attr("y1", 0)
                   .attr("y2", height)
                   .attr("stroke", "black")
                   .attr("stroke-width", 1)
                   .attr("stroke-dasharray", "8, 8")
        todayMarker.append("text")
                   .attr("id", "today-text")
                   .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
                   .text("Today")
                   .style("text-anchor", "end")

        /////////////////////////////////////////////////////////////////////////////////////////////
        const focusMargin = 50;
        let focus = svg.append("g")
                       .attr("viewBox", [0, 0, width, focusHeight])
                       .attr("transform", `translate(0,${height + focusMargin} )`)
                       .style("display", "block")
        focus.append("defs")
             .append("svg:clipPath")
                .attr("id", "focus-clip")
            .append("svg:rect")
                .attr("width", width )
                .attr("height", focusHeight )
                .attr("x", 0)
                .attr("y", 0);
        const focusArea = focus
                            .append('g')
                            .attr("clip-path", "url(#focus-clip)");
        var focusX = d3.scaleTime()
                       .domain([confirmedStartDate, d3.timeYear.offset(today, 2)])
                       .range([0, width]);
        const focusY = d3.scaleLinear()
                        .domain([0, yAxisMax])
                        .range([focusHeight - margin.bottom, 0])
                        .nice();
        focus.append("g") //display x axis
             .attr("transform", `translate(0,${focusHeight - margin.bottom})`)
             .call(d3.axisBottom(focusX));
        const brush = d3.brushX()
                        .extent([[0, 0], [width, focusHeight - margin.bottom]])
                        .on("brush", brushed)
                        .on("end", brushended);
        const firstSelectionMax = +d3.timeMonth.offset(predEndDate, 6) < +focusX.domain()[1] ? d3.timeMonth.offset(predEndDate, 6) : focusX.domain()[1];
        const firstSelection = [focusX.range()[0], focusX(firstSelectionMax)];
        const defaultSelection = [focusX(d3.timeMonth.offset(predStartDate, -3)), focusX(x.domain()[1])];
        const focusLine = d3.line().curve(d3.curveCatmullRom)
                            .x(function(d) {return focusX(d.date)})
                            .y(function (d) {return focusY(d.value)})
        
        const focusPredLine = d3.line().curve(d3.curveBasis)
                                .defined(d => d.defined)
                                .x(function(d) { return focusX(d.date) })
                                .y(function(d) { return focusY(d.value) })        
        //draw curves in focus rectangle
        focusArea.append("path")
            .datum(confirmedData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("id", "context-confirmed")
            .attr("stroke", color(compiledIds[0]))
        focusArea.append("path")
            .datum(aggregateData)
            .attr("d", focusLine)
            .attr("class", "context-curve")
            .attr("id", "context-aggregate")
            .attr("stroke", color(compiledIds[1]))
        let focusPredCurve = focusArea.append("path")
                                      .datum(predictionData)
                                      .attr("d", focusPredLine)
                                      .attr("id", "context-prediction")
                                      .attr("stroke", color(compiledIds[2]))
        forecastData.map((f, index) => {
            focusArea.append("path")
                     .datum(f)
                     .attr("d", focusLine)
                     .attr("class", "context-curve")
                     .attr("id", "context-forecast")
                     .attr("stroke", color(forecastIds[index]));
        })
        function brushed() {
            if (d3.event.selection) {
                let extent = d3.event.selection;
                x.domain([focusX.invert(extent[0]), focusX.invert(extent[1])]);
                xAxis.call(d3.axisBottom(x))
                let newX = x(today);
                newX = newX < 0 ? 0 : newX;
                let newWidth = width - newX < 0 ? 0 : width - newX;
                d3.select("#prediction-clip")
                  .select("rect")
                        .attr("width", newWidth)
                        .attr("x", newX);
                svg.selectAll(".line")
                        .attr('d', line)
                svg.select("#prediction")
                        .attr("d", predLine)

                //reposition draw your guess text and pointer
                svg.select("#draw-guess")
                        .attr("x", newX + (width - newX) / 2);
                if (x(confirmedLastDate) <= x.range()[0]) {
                    svg.select("#pointer")
                       .attr("opacity", "0")
                } else {
                    svg.select("#pointer")
                            .attr("opacity", "1")
                       .selectAll("circle")
                            .attr("cx", x(confirmedLastDate));
                }
                if (x(today) < x.range()[0]) {
                    todayMarker.style("display", "none");
                }
                else {
                    todayMarker.style("display", "block");
                    todayMarker.select("line")
                        .attr("x1", x(today))
                        .attr("x2", x(today))
                    todayMarker.select("text")
                        .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
                }
            }
        }
        function brushended() {
            if (!d3.event.selection) {
                gb.call(brush.move, defaultSelection);
            }
        }
        const gb = focus.call(brush)
                        .call(brush.move, firstSelection)
                        .on("click", function() {
                            d3.select(".speech-bubble").style("display", "none");
                        })
        gb.transition()
          .delay(7000)
          .duration(2500)
          .call(brush.move, defaultSelection)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let deleteButton = d3.select("#delete-btn").node()
        deleteButton.onclick = () => {
            this.deletePrediction(category)
            predictionData = [{"date": today, "value": 0, defined: 0}];
            //update predictionLine
            let filtered = predictionData.filter(predLine.defined())
            predictionLine.datum(filtered)
                           .attr('d', predLine)
            focusPredCurve.datum(filtered)
                           .attr("d", focusPredLine)
            svg.select("#drawing-instruction")
               .style("opacity", "1");
            compiledData[2].data = predictionData;
        };
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let mousePosY = 0;
        let mousePosX = 0;
        let yAxisDrag = d3.drag()
            .on("start", function() {
                yAxisDragRect.attr("dragging", "true");
            })
            .on("drag", function() {
                let currPosY = d3.mouse(this)[1];
                if (currPosY > mousePosY) {
                    let dy = -y.domain()[1] * 0.005;
                    let newMax = y.domain()[1] + dy > 500 ? y.domain()[1] + dy : 500;
                    y.domain([0, newMax]);
                    yAxis.call(yAxisD3.scale(y));
                    focusY.domain([0, newMax])
                }
                else {
                    let dy = y.domain()[1] * 0.005;
                    let newMax = y.domain()[1] + dy <= 10000000 ? y.domain()[1] + dy : 10000000;
                    y.domain([0, newMax]);
                    yAxis.call(yAxisD3.scale(y));
                    focusY.domain([0, newMax])
                }
                mousePosY = currPosY;
                updateData();
            })
            .on("end", function() {
                yAxisDragRect.attr("dragging", "false");
            })
            

        let xAxisDrag = d3.drag()
            .on("start", function() {
                xAxisDragRect.attr("dragging", "true");
            })
            .on("drag", function() {
                let currPosX = d3.mouse(this)[0];
                if (currPosX > mousePosX) {
                    let dy = d3.timeDay.offset(x.domain()[1], 14);
                    let newMax = +dy < +d3.timeYear.offset(today, 2) ? dy : d3.timeYear.offset(today, 2);
                    x.domain([x.domain()[0], newMax]);
                    xAxis.call(xAxisD3.scale(x));
                }
                else {
                    let dy = d3.timeDay.offset(x.domain()[1], -14);
                    let currMin = x.domain()[0];
                    let newMax = +dy > +d3.timeMonth.offset(currMin, 3) ? dy : d3.timeMonth.offset(currMin, 3);
                    x.domain([x.domain()[0], newMax]);
                    xAxis.call(xAxisD3.scale(x));
                }
                mousePosX = currPosX;
                updateData();
                let newSelection = [focusX(x.domain()[0]), focusX(x.domain()[1])];
                gb.call(brush.move, newSelection);
            })
            .on("end", function() {
                xAxisDragRect.attr("dragging", "false");
                let newSelection = [focusX(x.domain()[0]), focusX(x.domain()[1])];
                gb.call(brush.move, newSelection);
            })

        const updateData = () => {
            svg.selectAll(".line")
                    .attr('d', line)
            svg.select("#prediction")
                    .attr("d", predLine)
            todayMarker.select("line")
                            .attr("x1", x(today))
                            .attr("x2", x(today))
            todayMarker.select("text")
                            .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
            let newX = x(confirmedLastDate);
            newX = newX < 0 ? 0 : newX;
            let newWidth = width - newX < 0 ? 0 : width - newX;
            d3
                .select("#prediction-clip")
                .select("rect")
                    .attr("width", newWidth)
                    .attr("x", newX);
            //reposition draw your guess text and pointer
            svg.select("#draw-guess")
                   .attr("x", newX + newWidth / 2);
            svg.select("#pointer")
               .selectAll("circle")
                    .attr("cx", newX);
            predEndDate = x.domain()[1];
            svg.selectAll(".red-circle")
                .attr("cx", x(confirmedLastDate))
                .attr("cy", y(confirmedLastDate))
            focusPredCurve.datum(predictionData)
                                .attr("d", focusPredLine)
            svg.selectAll(".context-curve")
                    .attr("d", focusLine)
            }
        yAxisDragRect.call(yAxisDrag)
        xAxisDragRect.call(xAxisDrag)
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
                    <div className="speech-bubble left">shift or resize the gray box to change the zoom level</div>
                </div>
            </div>
            <div className="tooltip-box tooltip"></div>
        </div>);
    }
}
export default MainChart;