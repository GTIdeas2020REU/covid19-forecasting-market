import React, { Component } from 'react';
import * as d3 from 'd3'
import './InteractiveChart.css';
import { clamp, sortDictByDateDescending, callout, getMostRecentPrediction } from '../../utils/data';
import { elementType } from 'prop-types';
import { addDays, formatDate } from '../../utils/date';


class InteractiveChart extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "us_daily_deaths" };
        this.chartRef = React.createRef();
    }
    componentDidMount() {
        const loginStatus = this.props.loginStatus;
        console.log(loginStatus)
        if (loginStatus['logged in']) {
            this.renderChart();
        }
        else {
            console.log("not logged in")
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
        console.log(category)
        fetch('/delete/',{
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({"category": category}),
          });
        console.log("deleted")
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
        var modal = document.createElement("div");
        modal.id = "modal";
        var modalContent = document.createElement("div");
        modalContent.id = "modal-content";
        var text = document.createElement("p");
        text.innerText = "Please log in to save your prediction."
        var signinBtn = document.createElement("button");
        signinBtn.id = "signin-btn"
        signinBtn.innerText = "Sign In"
        var signupBtn = document.createElement("button");
        signupBtn.id = "signup-btn"
        signupBtn.innerText = "Sign Up"
        modalContent.appendChild(text);
        modalContent.appendChild(signinBtn);
        modalContent.appendChild(signupBtn);
        modal.appendChild(modalContent);
        this.chartRef.current.appendChild(modal);
    }

    renderChartUnregistered() {
        const { forecast, orgs, userPrediction, confirmed, aggregate } = this.props;
        var predictionData = [];//where we will store formatted userPrediction
        var defaultPredictionData = []
        const savePrediction = this.savePrediction;
        const createDefaultPrediction = this.createDefaultPrediction;
        this.appendModal();
        const category = this.state.category;
        var compiledData = [];
        //set up margin, width, height of chart
        const legendWidth = 180;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const contextHeight = 100;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        var svg = d3.select(this.chartRef.current)
                    .append("svg")
                        .attr("width", width + margin.left + margin.right + legendWidth)
                        .attr("height", height + margin.top + margin.bottom + toolTipHeight + contextHeight)
                    .append("g")
                        .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");
        
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = Object.keys(confirmed).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: confirmed[key]
        }));
        console.log(confirmedData);
        
        var forecastData = forecast.map(f => {
            return Object.keys(f).map(key => ({
                date: d3.timeParse("%Y-%m-%d")(key),
                value: f[key]
            }))
        });

        var aggregateData = Object.keys(aggregate).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: aggregate[key]
        }));
  
        //set other dates
        //const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-02-01"); //date format: y-m-d
        const confirmedStartDate = confirmedData[4].date;
        const predStartDate = confirmedData[confirmedData.length - 1].date; //last date of confirmedData
        const predLength = 155;
        //var predEndDateString = addDays(new Date(), predLength).toISOString().substring(0, 10);
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
        var legendString = orgs.concat(["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"]);
        //color function that assigns random colors to each data
        var color = d3
                        .scaleOrdinal()
                        .domain(legendString)
                        .range(d3.schemeTableau10);

         //draw legend
        var legend = svg.append('g')
                        .attr("id", "legend")
        var size = 10;
        legend.selectAll("rect")
            .data(legendString)
            .enter()
            .append("circle")
                .attr('cx', width + 30)
                .attr("cy", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                //.attr("width", size)
                //.attr("height", size)
                .style("fill", function(d){ return color(d)})
        legend.selectAll("labels")
            .data(legendString)
            .enter()
            .append("text")
                .attr("x", width + 45)
                .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", function(d){ return color(d)})
                .text(function(d){ return d})
                    .attr("text-anchor", "left")
                    .style("alignment-baseline", "middle")

        //create line generator for confirmed/forecast data and prediction data
        var lineGenerator = d3.line()
            .curve(d3.curveBasis);
            //.curve(d3.curveCatmullRom)//curve that goes through all data points
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
                                    .attr("stroke", color(legendString[legendString.length - 3]))
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
        if (aggregateData.length > 0 && +aggregateData[idxOfStartDate].date == +predStartDate) {
            aggregateData[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
        }
        else {
            aggregateData.splice(idxOfStartDate, 0, {
                date: predStartDate,
                value: confirmedData[confirmedData.length - 1].value
            });
            console.log(aggregateData);
            console.log("done");
        }

        //display aggregate data
        var aggregateLine = predictionArea.append("path")
                                    .attr("id", "aggregate")
                                    .attr("class", "line")        
                                    .datum(aggregateData)    
                                    .attr('d', line)
                                    .attr("stroke", color(legendString[legendString.length - 2]))
        
        //display forecast data
        forecastData.map((f, index) => {
            //make sure they all stem from the confirmed curve!
            //var temp = d3.timeParse("%Y-%m-%d")("2020-07-18")
            var idxOfStartDate = d3.bisector(f => f.date).left(f, predStartDate);
            //check if predStartDate exists in f
            if (f.length > 0 && +f[idxOfStartDate].date == +predStartDate) {
                f[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
            }
            else {
                f.splice(idxOfStartDate, 0, {
                    date: predStartDate,
                    value: confirmedData[confirmedData.length - 1].value
                });
                //console.log(f);
                //console.log("done");
            }
            //console.log(f)
            //console.log(idxOfStartDate)
            predictionArea.append("path")
                        .attr("class", "forecast line")
                        .attr("id", orgs[index])
                        .style("stroke", color(orgs[index]))
                        .datum(f)
                            .attr("d", line);
        })
        
        var lines = document.getElementsByClassName('line');

        //function that generates the prediction curve
        var predLine = predLineGenerator
            .defined(d => d.defined)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })

        //append path for prediction data
        var yourLine = predictionArea
                                        .append("path")
                                        .attr("id", "your-line");
        
        
        //variables used to initialize user prediction data if it doesn't exist in the db
        var currDate = predStartDate;
        var defined = true;
        var value = confirmedData[confirmedData.length - 1].value;
        const confirmedLastVal = value; //used to make sure the first data point of prediction stays the same
        

        predictionData = createDefaultPrediction(predStartDate, predEndDate);
        predictionData[0].value = confirmedLastVal;
        predictionData[0].defined = true;
        //console.log(predictionData);
        

        var filteredData = null;
        //var totalData = confirmedData.concat(predictionData);

//!!    //add forecast data to compiledData
        orgs.map((o, index) => {
            compiledData.push({
                name: o,
                data: forecastData[index]
            })
        })
        compiledData.push({
            name: "Daily Confirmed Deaths",
            data: confirmedData
        })
        compiledData.push({
            name: "Aggregate Forecast",
            data: aggregateData
        })
        //if (userPrediction) {
        compiledData.push({
            name: "User Prediction",
            data: predictionData
        })
        //}
        //join data to yourLine
        filteredData = predictionData.filter(predLine.defined())
        yourLine.datum(filteredData)
                .attr('d', predLine)
                .style("stroke", color(legendString[legendString.length - 1]))
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
                        d3.selectAll(".mouse-per-line text")
                            .style("opacity", "0")
                        var pos = d3.mouse(this);
                        var date = clamp(predStartDate, predEndDate, x.invert(pos[0]));
                        var value = clamp(0, yAxisMax, y.invert(pos[1]));
                        
                        predictionData.forEach(function(d){
                            if (+d3.timeDay.round(d.date) == +d3.timeDay.round(date)){
                                d.value = value;
                                d.defined = true
                            }
                        predictionData[0].value = confirmedLastVal;//make sure the prediction curve is always connected to the confirmed curve
                        //update totalData everytime predictionData is updated
                        compiledData[compiledData.length - 1].data = predictionData;
                        //console.log(compiledData)
                        /*yourLine.datum(predictionData)
                                .attr('d', predLine)*/
                        var filteredData = predictionData.filter(predLine.defined())

                        yourLine.datum(filteredData)
                                .attr('d', predLine)
                                .style("stroke", color(legendString[legendString.length - 1]))

                        });
                    })
                    .on("end", function () {
                        d3
                            .select("#modal")
                            .style("display", "block");
                        console.log("popup");
                        d3.select("#tooltip-line")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line text")
                            .style("opacity", "1")
                    });
        
        svg.call(drag)
        var modal = document.getElementById("modal");

        window.onclick = function(event) {
            if (event.target == modal) {
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


        const tooltipArea = svg
                                .append("g")
                                .attr("class", "tooltip")

        tooltipArea.append("path") //vertical line
                    .attr("id", "tooltip-line")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("opacity", "0");
        //console.log(compiledData)
        var mousePerLine = tooltipArea
                                        .selectAll(".mouse-per-line")
                                        .data(compiledData)
                                        .enter()
                                        .append("g")
                                        .attr("class", "mouse-per-line");
        
        mousePerLine.append("circle")
                        .attr("r", 2)
                        .style("stroke", function(d) {
                            return color(d.name);
                        })
                        .style("fill", "none")
                        .style("stroke-width", "1px")
                        .style("opacity", "0");
        mousePerLine.append("text")
                    .attr("transform", "translate(10,3)"); 
        tooltipArea
                    .append("svg:rect")
                    .attr('width', width)
                    .attr('height', height)
                    .attr('fill', 'none')
                    .attr('pointer-events', 'all')
                    .style("cursor", "pointer")
                    .on('mouseout', function() { // on mouse out hide line, circles and text
                        d3.select("#tooltip-line")
                          .style("opacity", "0");
                        d3.selectAll(".mouse-per-line circle")
                          .style("opacity", "0");
                        d3.selectAll(".mouse-per-line text")
                          .style("opacity", "0")
                    })
                    .on('mouseover', function() { // on mouse in show line, circles and text
                        d3.select("#tooltip-line")
                          .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                          .style("opacity", "1");
                        d3.selectAll(".mouse-per-line text")
                          .style("opacity", "1")

                    })
                    .on('mousemove', function() { // mouse moving over canvas
                        var mouse = d3.mouse(this);
                        var xCoord = mouse[0];
                        d3
                            .select("#tooltip-line")
                            .attr("d", function() {
                                var d = "M" + xCoord + "," + height;
                                d += " " + xCoord + "," + 0;
                                return d;
                            });
                        d3
                            .selectAll(".mouse-per-line")
                            .attr("transform", function(d, i) {
                                if (d.data.length == 0) {return;}
                                var date = x.invert(xCoord);
                                const index = d3.bisector(f => f.date).left(compiledData[i].data, date);
                                var a = null;
                                if (index > 0) {
                                    a = d.data[index - 1];
                                }
                                const b = d.data[index];
                                //d = the data object corresponding to date and value pointed by the cursors
                                var data = null;
                                if (!a) {
                                    data = b;
                                }
                                else if (!b) {
                                    data = a;
                                }
                                else {
                                    data = b && (date - a.date > b.date - date) ? b : a;
                                }
                                if (+d3.timeDay.floor(date) == +data.date || +d3.timeDay.ceil(date) == +data.date) {
                                    if (data.defined != 0) {
                                        var element = d3.select(this)
                                                        .select('text')
                                                            .style("opacity", "1")
                                                            .text(Math.round(data.value));
                                        element.select("circle")
                                                .style("opacity", "1");
                                        return "translate(" + mouse[0] + "," + y(data.value)+")";
                                    }
                                }
                                var element = d3.select(this)
                                                .select("text")
                                                .style("opacity", "0")
                                element
                                        .select("circle")
                                        .style("opacity", "0");
                                
                        });
                    })

        /////////////////////////////////////////////////////////////////////////////////////////////
        const focusHeight = 100;
        const contextMargin = 50;
        var context = svg
                            .append("g")
                                .attr("viewBox", [0, 0, width, focusHeight])
                                .attr("transform", `translate(0,${height + contextMargin} )`)
                                //.attr("width", width + 100)
                                //.attr("height", height)
                                .style("display", "block")



        /*const xAxis = (g, x, height) => g
                                            .attr("transform", `translate(0,${height - margin.bottom})`)
                                            .call(d3.axisBottom(x))*/

        var contextX = d3
                            .scaleTime()
                            .domain([confirmedStartDate, predEndDate])
                            .range([0, width]);
        
        var contextXAxis = context
                                    .append("g")
                                    .attr("transform", `translate(0,${focusHeight - margin.bottom})`)
                                    .call(d3.axisBottom(contextX));
        const brush = d3.brushX()
                        .extent([[0, 0], [width, focusHeight - margin.bottom]])
                        .on("brush", brushed)
                        .on("end", brushended);

        const defaultSelection = [x(d3.timeMonth.offset(x.domain()[1], -8)), x.range()[1]];
    
        /*context.append("g")
                .call(xAxis, x, focusHeight);*/
    
        /*svg.append("path")
            .datum(confirmedData)
            .attr("fill", "steelblue")
            .attr("d", line(x, y.copy().range([focusHeight - margin.bottom, 4])));*/
        function brushed() {
            console.log("d")
            if (d3.event.selection) {
                var extent = d3.event.selection;
                //console.log([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
                x.domain([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
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
            }
        }
        
        function brushended() {
            if (!d3.event.selection) {
                gb.call(brush.move, defaultSelection);
            }

        }
        const gb = context
                        .call(brush)
                        .call(brush.move, defaultSelection);   
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        var deleteButton = document.createElement("button")
        deleteButton.innerText = "Reset";
        deleteButton.onclick = () => {
            this.deletePrediction(category)
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            console.log(predictionData)
            //update yourLine
            var filtered = predictionData.filter(predLine.defined())
            console.log(filtered)
            yourLine.datum(filtered)
                    .attr('d', predLine)
                    
            svg
                .select("#drawing-instruction")
                .style("opacity", "1");
        };
        document.querySelector("body").appendChild(deleteButton);
    }

    renderChart() {
        const { forecast, orgs, userPrediction, confirmed, aggregate } = this.props;
        var predictionData = [];//where we will store formatted userPrediction
        var defaultPredictionData = []
        const savePrediction = this.savePrediction;
        const createDefaultPrediction = this.createDefaultPrediction;
        const category = this.state.category;
        var compiledData = [];
        //set up margin, width, height of chart
        const legendWidth = 180;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const contextHeight = 100;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        var svg = d3.select(this.chartRef.current)
                    .append("svg")
                        .attr("width", width + margin.left + margin.right + legendWidth)
                        .attr("height", height + margin.top + margin.bottom + toolTipHeight + contextHeight)
                    .append("g")
                        .attr("transform",
                        "translate(" + margin.left + "," + margin.top + ")");
        
        
        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = Object.keys(confirmed).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: confirmed[key]
        }));
        console.log(confirmedData);
        
        var forecastData = forecast.map(f => {
            return Object.keys(f).map(key => ({
                date: d3.timeParse("%Y-%m-%d")(key),
                value: f[key]
            }))
        });

        var aggregateData = Object.keys(aggregate).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: aggregate[key]
        }));

        //store userPrediction in predictionData if it exists
        if(Object.keys(userPrediction).length > 0) {
            predictionData = getMostRecentPrediction(userPrediction).map(p => ({
                date: d3.timeParse("%Y-%m-%d")((p.date).substring(0,10)),
                value: p.value,
                defined: p.defined
                })
            );
        }
        //console.log(predictionData)
  
        //set other dates
        //const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-02-01"); //date format: y-m-d
        const confirmedStartDate = confirmedData[4].date;
        const predStartDate = confirmedData[confirmedData.length - 1].date; //last date of confirmedData
        const predLength = 155;
        //var predEndDateString = addDays(new Date(), predLength).toISOString().substring(0, 10);
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
        var legendString = orgs.concat(["Daily Confirmed Deaths", "Aggregate Forecast", "User Prediction"]);
        //color function that assigns random colors to each data
        var color = d3
                        .scaleOrdinal()
                        .domain(legendString)
                        .range(d3.schemeTableau10);

         //draw legend
        var legend = svg.append('g')
                        .attr("id", "legend")
        var size = 10;
        legend.selectAll("rect")
            .data(legendString)
            .enter()
            .append("circle")
                .attr('cx', width + 30)
                .attr("cy", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                //.attr("width", size)
                //.attr("height", size)
                .style("fill", function(d){ return color(d)})
        legend.selectAll("labels")
            .data(legendString)
            .enter()
            .append("text")
                .attr("x", width + 45)
                .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", function(d){ return color(d)})
                .text(function(d){ return d})
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
                                    .attr("stroke", color(legendString[legendString.length - 3]))
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
        if (aggregateData.length > 0 && +aggregateData[idxOfStartDate].date == +predStartDate) {
            aggregateData[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
        }
        else {
            aggregateData.splice(idxOfStartDate, 0, {
                date: predStartDate,
                value: confirmedData[confirmedData.length - 1].value
            });
            console.log(aggregateData);
            console.log("done");
        }

        //display aggregate data
        var aggregateLine = predictionArea.append("path")
                                    .attr("id", "aggregate")
                                    .attr("class", "line")        
                                    .datum(aggregateData)    
                                    .attr('d', line)
                                    .attr("stroke", color(legendString[legendString.length - 2]))
        
        //display forecast data
        forecastData.map((f, index) => {
            //make sure they all stem from the confirmed curve!
            //var temp = d3.timeParse("%Y-%m-%d")("2020-07-18")
            var idxOfStartDate = d3.bisector(f => f.date).left(f, predStartDate);
            //check if predStartDate exists in f
            if (f.length > 0 && +f[idxOfStartDate].date == +predStartDate) {
                f[idxOfStartDate].value = confirmedData[confirmedData.length - 1].value;
            }
            else {
                f.splice(idxOfStartDate, 0, {
                    date: predStartDate,
                    value: confirmedData[confirmedData.length - 1].value
                });
                //console.log(f);
                //console.log("done");
            }
            //console.log(f)
            //console.log(idxOfStartDate)
            predictionArea.append("path")
                        .attr("class", "forecast line")
                        .attr("id", orgs[index])
                        .style("stroke", color(orgs[index]))
                        .datum(f)
                            .attr("d", line);
        })
        
        var lines = document.getElementsByClassName('line');

        //function that generates the prediction curve
        var predLine = predLineGenerator
            .defined(d => d.defined)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })

        //append path for prediction data
        var yourLine = predictionArea
                                        .append("path")
                                        .attr("id", "your-line");
        
        
        //variables used to initialize user prediction data if it doesn't exist in the db
        var currDate = predStartDate;
        var defined = true;
        var value = confirmedData[confirmedData.length - 1].value;
        const confirmedLastVal = value; //used to make sure the first data point of prediction stays the same
        
        //check if userPrediction already exists in db
        if (Object.keys(userPrediction).length > 0) {
            predictionData = predictionData.filter(d => (+d.date >= +predStartDate) && (+d.date <= +predEndDate));
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            currDate = d3.timeDay.offset(predictionData[predictionData.length - 1].date, 1);
            //currDate = addDays(predictionData[predictionData.length - 1].date, 1);
            //console.log(predictionData)
            //console.log(createDefaultPrediction(currDate, predEndDate))
            predictionData.concat(createDefaultPrediction(currDate, predEndDate));
            //console.log(predictionData);
        }
        else {
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            //console.log(predictionData);
        }

        var filteredData = null;
        //var totalData = confirmedData.concat(predictionData);

//!!    //add forecast data to compiledData
        orgs.map((o, index) => {
            compiledData.push({
                name: o,
                data: forecastData[index]
            })
        })
        compiledData.push({
            name: "Daily Confirmed Deaths",
            data: confirmedData
        })
        compiledData.push({
            name: "Aggregate Forecast",
            data: aggregateData
        })
        //if (userPrediction) {
        compiledData.push({
            name: "User Prediction",
            data: predictionData
        })
        //}
        //join data to yourLine
        filteredData = predictionData.filter(predLine.defined())
        yourLine.datum(filteredData)
                .attr('d', predLine)
                .style("stroke", color(legendString[legendString.length - 1]))
        //append new rect  
        const mouseArea = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("id", "mouse-area")
            .style("pointer-events","visible");

        //append click area rect
        var confirmedAreaWidth = confirmedLine.node().getBoundingClientRect().width; //get width of path element containing confirmed data
        console.log(confirmedAreaWidth)
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

        if(Object.keys(userPrediction).length == 0) {
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
                        d3.selectAll(".mouse-per-line text")
                            .style("opacity", "0")
                        var pos = d3.mouse(this);
                        var date = clamp(predStartDate, predEndDate, x.invert(pos[0]));
                        var value = clamp(0, yAxisMax, y.invert(pos[1]));
                        
                        predictionData.forEach(function(d){
                            if (+d3.timeDay.round(d.date) == +d3.timeDay.round(date)){
                                d.value = value;
                                d.defined = true
                            }
                        predictionData[0].value = confirmedLastVal;//make sure the prediction curve is always connected to the confirmed curve
                        //update totalData everytime predictionData is updated
                        compiledData[compiledData.length - 1].data = predictionData;
                        //console.log(compiledData)
                        /*yourLine.datum(predictionData)
                                .attr('d', predLine)*/
                        var filteredData = predictionData.filter(predLine.defined())

                        yourLine.datum(filteredData)
                                .attr('d', predLine)
                                .style("stroke", color(legendString[legendString.length - 1]))

                        });
                    })
                    .on("end", function () {
                        savePrediction(predictionData, category);
                        d3.select("#tooltip-line")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                            .style("opacity", "1");
                        d3.selectAll(".mouse-per-line text")
                            .style("opacity", "1")
                    });
        
        svg.call(drag)

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


        const tooltipArea = svg
                                .append("g")
                                .attr("class", "tooltip")

        tooltipArea.append("path") //vertical line
                    .attr("id", "tooltip-line")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("opacity", "0");
        //console.log(compiledData)
        var mousePerLine = tooltipArea
                                        .selectAll(".mouse-per-line")
                                        .data(compiledData)
                                        .enter()
                                        .append("g")
                                        .attr("class", "mouse-per-line");
        
        mousePerLine.append("circle")
                        .attr("r", 2)
                        .style("stroke", function(d) {
                            return color(d.name);
                        })
                        .style("fill", "none")
                        .style("stroke-width", "1px")
                        .style("opacity", "0");
        mousePerLine.append("text")
                    .attr("transform", "translate(10,3)"); 
        tooltipArea
                    .append("svg:rect")
                    .attr('width', width)
                    .attr('height', height)
                    .attr('fill', 'none')
                    .attr('pointer-events', 'all')
                    .style("cursor", "pointer")
                    .on('mouseout', function() { // on mouse out hide line, circles and text
                        d3.select("#tooltip-line")
                          .style("opacity", "0");
                        d3.selectAll(".mouse-per-line circle")
                          .style("opacity", "0");
                        d3.selectAll(".mouse-per-line text")
                          .style("opacity", "0")
                    })
                    .on('mouseover', function() { // on mouse in show line, circles and text
                        d3.select("#tooltip-line")
                          .style("opacity", "1");
                        d3.selectAll(".mouse-per-line circle")
                          .style("opacity", "1");
                        d3.selectAll(".mouse-per-line text")
                          .style("opacity", "1")

                    })
                    .on('mousemove', function() { // mouse moving over canvas
                        var mouse = d3.mouse(this);
                        var xCoord = mouse[0];
                        d3
                            .select("#tooltip-line")
                            .attr("d", function() {
                                var d = "M" + xCoord + "," + height;
                                d += " " + xCoord + "," + 0;
                                return d;
                            });
                        d3
                            .selectAll(".mouse-per-line")
                            .attr("transform", function(d, i) {
                                if (d.data.length == 0) {return;}
                                var date = x.invert(xCoord);
                                const index = d3.bisector(f => f.date).left(compiledData[i].data, date);
                                var a = null;
                                if (index > 0) {
                                    a = d.data[index - 1];
                                }
                                const b = d.data[index];
                                //d = the data object corresponding to date and value pointed by the cursors
                                var data = null;
                                if (!a) {
                                    data = b;
                                }
                                else if (!b) {
                                    data = a;
                                }
                                else {
                                    data = b && (date - a.date > b.date - date) ? b : a;
                                }
                                if (+d3.timeDay.floor(date) == +data.date || +d3.timeDay.ceil(date) == +data.date) {
                                    if (data.defined != 0) {
                                        var element = d3.select(this)
                                                        .select('text')
                                                            .style("opacity", "1")
                                                            .text(Math.round(data.value));
                                        element.select("circle")
                                                .style("opacity", "1");
                                        return "translate(" + mouse[0] + "," + y(data.value)+")";
                                    }
                                }
                                var element = d3.select(this)
                                                .select("text")
                                                .style("opacity", "0")
                                element
                                        .select("circle")
                                        .style("opacity", "0");
                                
                        });
                    })

        /////////////////////////////////////////////////////////////////////////////////////////////
        const focusHeight = 100;
        const contextMargin = 50;
        var context = svg
                            .append("g")
                                .attr("viewBox", [0, 0, width, focusHeight])
                                .attr("transform", `translate(0,${height + contextMargin} )`)
                                //.attr("width", width + 100)
                                //.attr("height", height)
                                .style("display", "block")



        /*const xAxis = (g, x, height) => g
                                            .attr("transform", `translate(0,${height - margin.bottom})`)
                                            .call(d3.axisBottom(x))*/

        var contextX = d3
                            .scaleTime()
                            .domain([confirmedStartDate, predEndDate])
                            .range([0, width]);
        
        var contextXAxis = context
                                    .append("g")
                                    .attr("transform", `translate(0,${focusHeight - margin.bottom})`)
                                    .call(d3.axisBottom(contextX));
        const brush = d3.brushX()
                        .extent([[0, 0], [width, focusHeight - margin.bottom]])
                        .on("brush", brushed)
                        .on("end", brushended);

        const defaultSelection = [x(d3.timeMonth.offset(x.domain()[1], -8)), x.range()[1]];
    
        /*context.append("g")
                .call(xAxis, x, focusHeight);*/
    
        /*svg.append("path")
            .datum(confirmedData)
            .attr("fill", "steelblue")
            .attr("d", line(x, y.copy().range([focusHeight - margin.bottom, 4])));*/
        function brushed() {
            console.log("d")
            if (d3.event.selection) {
                var extent = d3.event.selection;
                //console.log([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
                x.domain([ contextX.invert(extent[0]), contextX.invert(extent[1]) ]);
                xAxis
                        //.transition()
                        //.duration(1000)
                        .call(d3.axisBottom(x))
                var newX = x(confirmedData[confirmedData.length - 1].date);
                newX = newX < 0 ? 0 : newX;
                console.log(newX);
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
            }
        }
        
        function brushended() {
            if (!d3.event.selection) {
                gb.call(brush.move, defaultSelection);
            }

        }
        const gb = context
                        .call(brush)
                        .call(brush.move, defaultSelection);   
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        var deleteButton = document.createElement("button")
        deleteButton.innerText = "Reset";
        deleteButton.onclick = () => {
            this.deletePrediction(category)
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
            predictionData[0].value = confirmedLastVal;
            predictionData[0].defined = true;
            console.log(predictionData)
            //update yourLine
            var filtered = predictionData.filter(predLine.defined())
            console.log(filtered)
            yourLine.datum(filtered)
                    .attr('d', predLine)
                    
            svg
                .select("#drawing-instruction")
                .style("opacity", "1");
        };
        document.querySelector("body").appendChild(deleteButton);
        /////////////////////////////////////////////////////////
        /*var test1 = [];
        var test2 = [];
        var test3 = [];
        var test4 = [];
        var test5 = [];

        var start1 = d3.timeParse("%Y-%m-%d")("2020-03-01");
        var start2 = d3.timeParse("%Y-%m-%d")("2020-04-01");
        var start3 = d3.timeParse("%Y-%m-%d")("2020-05-01");
        var start4 = d3.timeParse("%Y-%m-%d")("2020-06-01");
        var start5 = d3.timeParse("%Y-%m-%d")("2020-07-01");

        var end1 = d3.timeParse("%Y-%m-%d")("2020-8-01");
        var end2 = d3.timeParse("%Y-%m-%d")("2020-9-01");
        var end3 = d3.timeParse("%Y-%m-%d")("2020-10-01");
        var end4 = d3.timeParse("%Y-%m-%d")("2020-11-01");
        var end5 = d3.timeParse("%Y-%m-%d")("2020-12-01");
        var length = 153;
        for(var i = 0; i < length; i++) {
            test1.push({
                date: start1,
                value: Math.floor(Math.random() * 4001),
                defined: true
            })
            test2.push({
                date: start2,
                value: Math.floor(Math.random() * 4001),
                defined: true
            })
            test3.push({
                date: start3,
                value: Math.floor(Math.random() * 4001),
                defined: true
            })
            test4.push({
                date: start4,
                value: Math.floor(Math.random() * 4001),
                defined: true
            })
            test5.push({
                date: start5,
                value: Math.floor(Math.random() * 4001),
                defined: true
            })
            start1 = d3.timeDay.offset(start1, 1);
            start2 = d3.timeDay.offset(start2, 1);
            start3 = d3.timeDay.offset(start3, 1);
            start4 = d3.timeDay.offset(start4, 1);
            start5 = d3.timeDay.offset(start5, 1);
        }
        console.log(test1);
        console.log(test2);
        console.log(test3);
        console.log(test4);
        console.log(test5);*/
        //savePrediction(test1, category);
        //savePrediction(test2, category);
        //savePrediction(test3, category);
        //savePrediction(test4, category);
        //savePrediction(test5, category);

    }
        
    render() {
        return(<div ref={this.chartRef}></div>);
    }
}

export default InteractiveChart;