import React, { Component } from 'react';
import * as d3 from 'd3';
import './UserPredictionChart.css';
import { clamp, sortDictByDate, sortStringDates, createDefaultPrediction, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction, getLastDate, getLastValue } from '../../utils/data';
import { titles } from '../../constants/data';
class UserPredictionChart extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            category: "us_daily_deaths",
            rawData: null
        };
        this.chartRef = React.createRef();
    }

    componentDidMount() {
        this.setState({rawData: this.props.rawData});
        if (this.props.profilePage) {
            const userStatus = this.props.userStatus;
            if (userStatus['logged in']) {
                this.renderNewChart();
            }
            else {
                this.chartRef.current.innerHTML = "Please log in"
            }
        } else {
            this.renderNewChart();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        // only update chart if the data has changed
        if (!this.props.profilePage) {
            if (prevProps.userPrediction !== this.props.userPrediction) {
                this.renderNewChart();
            }
        }
        if (this.props.rawData != this.state.rawData) {
            this.setState({rawData: this.props.rawData});
            document.querySelector(".main-chart").innerHTML = "";
            document.querySelector(".legend-container").innerHTML = "";
            this.renderNewChart();
        }
    }
    renderNewChart() {
        const {rawData, loggedIn, category} = this.props;
        const title = titles[category][0];
        const subtitle = titles[category][1];
        const confirmed = rawData["confirmed"];
        // const aggregate = rawData["aggregate"];
        const userPrediction = rawData["user_prediction"];
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        let dates = []
        let predictionData = [];//where we will store formatted userPrediction
        let compiledData = [];

        //set up margin, width, height of chart
        const legendWidth = 230;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const focusHeight = 100;
        const titleHeight = 20;
        let margin = {top: 20, right: 30, bottom: 30, left: 80},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        let svg = d3.select(".main-chart")
                        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + 50}`)
                    .append("g")
                        .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`)
                        .style("width", width)

        // add title
        svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", -20)
            .attr("text-anchor", "middle")  
            .style("font-size", 20) 
            .style("text-decoration", "underline")  
            .style("font-weight", "bold")
            .attr("lengthAdjust", "spacing")
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
        
        let mostRecentPred = [];
        if(Object.keys(userPrediction).length > 0) {
            Object.keys(userPrediction).forEach(p => {
                predictionData[p] = reformatPredData(userPrediction[p])
            })
            predictionData = sortDictByDate(predictionData);
            //get most recent prediction
            dates = sortStringDates(Object.keys(userPrediction));

            mostRecentPred = predictionData[dates[dates.length - 1]];
            //push to compiledData
            compiledData = [confirmedData, mostRecentPred];
            //IMPORTANT BOUNDARIES// 
            predEndDate = getLastDate(mostRecentPred);
        }
        let yAxisMax = d3.max(confirmedData, d => { return +d.value; });
        if (dates.length > 0) {
            dates.forEach(d => {
                let currMax = d3.max(predictionData[d], p => {return p.value; })
                yAxisMax = Math.max(yAxisMax, currMax);
            })
        }
        var x = d3
                    .scaleTime()
                    .domain([confirmedStartDate, predEndDate])
                    .range([0, width])
                    .nice();
        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        var y = d3
                    .scaleLinear()
                    .domain([0, yAxisMax * 1.05])
                    .range([height, 0])
                    .nice();
        var yAxis = svg
                        .append("g")
                        .call(d3.axisLeft(y));
        
        //DRAW LEGEND//
        const legendString = [titles[category][0], "User Prediction", ];
        const compiledIds = ["confirmed", "prediction"]
        const color = ["#4e79a7", "#e15759"];
        
        //DRAW TODAY LINE//
        var todayMarker = svg
                            .append("g")
                            .attr("id", "today-marker")
        todayMarker
                    .append("line")
                    .attr("id", "today-line")
                    .attr("x1", x(today))
                    .attr("x2", x(today))
                    .attr("y1", height/5)
                    .attr("y2", height)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "8, 8")
        todayMarker
                    .append("text")
                    .attr("id", "today-text")
                    .attr("transform", `translate(${x(today) + 17}, ${height/5}) rotate(-90)`)
                    .text("Today")
                    .style("text-anchor", "end")

        //SET UP CLIP PATH//
        var mainClip = svg
                            .append("defs")
                            .append("svg:clipPath")
                                .attr("id", "main-clip")
                                .append("svg:rect")
                                    .attr("width", width )
                                    .attr("height", height )
                                    .attr("x", 0)
                                    .attr("y", 0);
        const mainArea = svg.append("g")
                            .attr("clip-path", "url(#main-clip)");
        
        //SET UP CURVES//
        const lineGenerator = d3.line()
                                .curve(d3.curveCatmullRom);
        const predLineGenerator = d3.line()
                                    .curve(d3.curveBasis);
        const line = lineGenerator
                        .x(function(d) { return x(d.date) })
                        .y(function(d) { return y(d.value) })
        const predLine = predLineGenerator
                            .defined(d => d.defined)
                            .x(function(d) { return x(d.date) })
                            .y(function(d) { return y(d.value) })
        //DRAW CURVES//
        var confirmedCurve = mainArea
                                    .append("path")
                                    .attr("id", "confirmed")
                                    .attr("class", "line")
                                    .datum(confirmedData)
                                    .attr("d", line)
                                    .attr("stroke", color[0])

        var predCurve = mainArea
                                .append("path")
                                .attr("id", "prediction")
                                .attr("class", "line")
        if (Object.keys(userPrediction).length != 0) {
            predCurve.datum(mostRecentPred.filter(predLine.defined()))
                    .attr("d", predLine)
                    .attr("stroke",  color[1])
            //SET UP TOOLTIP//
            const tooltip = svg 
                                .append("g")
                                .attr("class", "tooltip")
            tooltip
                    .append("path")
                    .attr("id", "tooltip-line")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("display", "none");
            var mousePerLine = tooltip
                                        .selectAll(".mouse-per-line")
                                        .data(compiledData)
                                        .enter()
                                        .append("g")
                                        .attr("class", "mouse-per-line");
            mousePerLine.append("circle")
                        .attr("r", 2)
                        .style("stroke", function(d, index) {
                            return color[index];
                        })
                        .attr("id", "circle")
                        .style("fill", "none")
                        .style("stroke-width", "1px")
                        .style("display", "none");
            mousePerLine.append("text")
                        .attr("id", "value")
                        .attr("transform", "translate(10,3)"); 
            mousePerLine.append("text")
                        .attr("id", "date")
                        .attr("text-anchor", "end")
                        .attr("transform", "rotate(-90)")
            let hover = true;
            svg
                    .append("svg:rect")
                        .attr('width', width)
                        .attr('height', height)
                        .attr("id", "interactive-area")
                        .attr('fill', 'none')
                        .attr('pointer-events', 'all')
                        .style("cursor", "pointer")
                        .on('mouseout', function() { // on mouse out hide line, circles and text
                            d3.select("#tooltip-line")
                                .style("display", "none");
                            d3.selectAll(".mouse-per-line circle")
                                .style("display", "none");
                            d3.selectAll(".mouse-per-line text")
                                .style("display", "none")
                        })
                        .on('mouseover', function() { // on mouse in show line, circles and text
                            d3.select("#tooltip-line")
                                .style("display", "block");
                        })
                        .on('mousemove', function() { // mouse moving over canvas
                            let mouse = d3.mouse(this);
                            let xCoord = mouse[0];
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
                                    if (d.length === 0) {return;}
                                    var date = x.invert(xCoord);
                                    const index = d3.bisector(f => f.date).left(d, date);
                                    var a = null;
                                    if (index > 0) {
                                        a = d[index - 1];
                                    }
                                    const b = d[index];
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
                                    if (+d3.timeDay.floor(date) === +data.date || +d3.timeDay.ceil(date) === +data.date) {
                                        if (data.defined != 0) {
                                            var element = d3.select(this)
                                            element
                                                    .select('#value')
                                                    .style("display", "block")
                                                    .text(Math.round(data.value))
                                                    .attr("transform", `translate(${mouse[0]}, ${y(data.value)})`);
                                                
                                            element
                                                    .select("#date")
                                                    .style("display", "block")
                                                    .attr("transform", `translate(${mouse[0] + 15}, 0) rotate(-90)`)
                                                    .text(d3.timeFormat("%B %d, %Y")(data.date));
                                            element
                                                    .select("circle")
                                                    .style("display", "block")
                                                    .attr("transform", `translate(${mouse[0]}, ${y(data.value)})`);
                                            return "translate(0,0)";
                                        }
                                    }
                                    var element = d3.select(this)
                                    element                
                                        .selectAll("text")
                                            .style("display", "none")
                                    element
                                            .select("circle")
                                            .style("display", "none");
                                });
                            if (!hover) return;
                            let date = x.invert(d3.mouse(this)[0])
                            if (+date > +today) {
                                date = today;
                            }
                            const index = d3.bisectRight(dates, date);
                            if(predictionData[date]) {
                                svg
                                    .select("#prediction")
                                        .datum(predictionData[date].filter(predLine.defined()))
                                        .attr("d", predLine)
                                compiledData[1] = predictionData[date];
                            }
                            else {
                                if (index === 0) {
                                    svg
                                        .select("#prediction")
                                        .datum([])
                                        .attr("d", predLine)
                                    compiledData[1] = [];
                                }
                                else {
                                    var newDate = dates[index - 1];
                                    var pred = predictionData[newDate].filter(d => +d.date >= +date)
                                    svg
                                        .select("#prediction")
                                        .datum(pred.filter(predLine.defined()))
                                        .attr("d", predLine);
                                    compiledData[1] = pred;
                                }
                            }
                            mousePerLine.data(compiledData);
                        })
                        .on("click", function() {
                            hover = !hover;
                        })
        }
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
                .attr("cy", (d,i) => { return 20 + i*45; }) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", "10px")
                .style("fill", ((d, i) => { return color[i]; }))

        legend.selectAll("labels")
                .data(legendString)
                .enter()
                .append("text")
                .attr("x", 30)
                .attr("y", (d,i) => { return 20 + i*45; }) // 100 is where the first dot appears. 25 is the distance between dots
                .text(d => { return d; })
                .attr("text-anchor", "left")
                .attr("class", "legend-text")
                .style("alignment-baseline", "middle")
                .style("font-size", (d) => {
                    if (d.length > 24) return 25;
                    return 35;
                })

        d3.selectAll(".legend-text")

        const legendRectWidth = document.querySelector(".legend-container").getBoundingClientRect().width * 10;
        const legendRectHeight = 45; //height of each entry rectangle in legend

        legend.selectAll("rectangles")
                .data(legendString)  
                .enter()      
                .append("rect")
                .attr("width", `${legendRectWidth}px`)
                .attr("height", legendRectHeight)
                .attr("x", 0)
                .attr("y", (d, i) => { return legendRectHeight * i ; })
                .attr("fill", "none")
                .style("pointer-events","visible")
                .attr('class', ((d, i) => { return compiledIds[i]; }));

        legend.selectAll('rect').on("mousemove", function() {
            let identifier = d3.select(this).attr('class')
            svg.selectAll(".line").style("stroke", "#ddd");
            svg.select(`#${identifier}`).style("stroke", color[compiledIds.indexOf(identifier)]);
        })
        .on("mouseout", function() {
            svg.selectAll(".line")
            .style("stroke", (d, i) => color[i])
        })
    }
    // renderChart() {
    //     const {compiled, loggedIn, category} = this.props;
    //     // const title = titles[category][0];
    //     // const subtitle = titles[category][1];
    //     const confirmed = compiled["confirmed"];
    //     const forecast = compiled["forecast"];
    //     const aggregate = compiled["aggregate"];
    //     const userPrediction = compiled["user_prediction"];
    //     let predictionData = [];//where we will store formatted userPrediction
    //     let forecastData = [];//formatted forecastData
    //     // const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));        var predictionData = {};//where we will store formatted userPrediction
    //     var compiledData = [];
    //     //console.log(confirmed)
    //     const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-01-01");
    //     const maxValues = {'us_daily_deaths': 5000, 'us_daily_cases': 250000};
    //     var valueMax = maxValues[category];
    //     var predEndDate = null;
    //     const predLength = 155;
    //     var mostRecentPred = [];

    //     //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
    //     var confirmedData = Object.keys(confirmed).map(key => ({
    //         date: d3.timeParse("%Y-%m-%d")(key),
    //         value: confirmed[key]
    //     }));
    //     var predStartDate = getLastDate(confirmedData);

    //     //store userPrediction in predictionData if it exists; parse dates and store as d3 date objects
    //     if(Object.keys(userPrediction).length > 0) {
    //         Object.keys(userPrediction).map(p => {
    //             predictionData[p]= userPrediction[p].map(d => ({
    //                 date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
    //                 value: d.value,
    //                 defined: d.defined
    //             }))
    //         })
    //         predictionData = sortDictByDate(predictionData);
    //         //get most recent prediction
    //         var dates = sortStringDates(Object.keys(userPrediction));
    //         const mostRecentPred = predictionData[dates[dates.length - 1]];
    //         //push to compiledData
    //         compiledData = [confirmedData, mostRecentPred];
    //         //IMPORTANT BOUNDARIES// 
    //         predEndDate = mostRecentPred[mostRecentPred.length - 1].date;
    //     }
    //     predEndDate = !predEndDate ? d3.timeDay.offset(predStartDate, predLength) : predEndDate;

    //     /////////////////////////////////////////////////DRAW CHART//////////////////////////////
    //     //set up margin, width, height of chart
    //     const legendWidth = 180;
    //     const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
    //     const contextHeight = 100;
    //     var margin = {top: 20, right: 30, bottom: 20, left: 60},
    //         width = 800 - margin.left - margin.right,
    //         height = 400 - margin.top - margin.bottom;
    //     var svg = d3.select(this.chartRef.current)
    //                 .append("svg")
    //                     .attr("width", width + margin.left + margin.right + legendWidth)
    //                     .attr("height", height + margin.top + margin.bottom + toolTipHeight + contextHeight)
    //                 .append("g")
    //                     .attr("transform",
    //                     "translate(" + margin.left + "," + margin.top + ")");
        
    //     //Create X axis label   
    //     svg.append("text")
    //         .attr("x", width/2)
    //         .attr("y", height + 2*margin.bottom)
    //         .style("text-anchor", "middle")
    //         .text("Date");
            
    //     //Create Y axis label
    //     svg.append("text")
    //         .attr("transform", "rotate(-90)")
    //         .attr("y", 0 - margin.left)
    //         .attr("x", 0 - (height/2))
    //         .attr("dy", "1em")
    //         .style("text-anchor", "middle")
    //         .text("Daily Deaths");

    //     var x = d3
    //                 .scaleTime()
    //                 .domain([confirmedStartDate, predEndDate])
    //                 .range([0, width]);
    //     var xAxis = svg
    //                     .append("g")
    //                     .attr("transform", "translate(0," + height + ")")
    //                     .call(d3.axisBottom(x));
    //     var y = d3
    //                 .scaleLinear()
    //                 .domain([0, valueMax])
    //                 .range([height, 0]);
    //     var yAxis = svg
    //                     .append("g")
    //                     .call(d3.axisLeft(y));
        
    //     //DRAW LEGEND//
    //     const legendString = ["Daily Confirmed Deaths", "User Prediction"];
    //     const compiledIds = ["confirmed", "prediction"];
    //     const color = d3
    //                     .scaleOrdinal()
    //                     .domain(legendString)
    //                     .range(d3.schemeTableau10);
        
    //     //DRAW TODAY LINE//
    //     const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
    //     //console.log(today);
    //     var todayMarker = svg
    //                         .append("g")
    //                         .attr("id", "today-marker")
    //     todayMarker
    //                 .append("line")
    //                 .attr("id", "today-line")
    //                 .attr("x1", x(today))
    //                 .attr("x2", x(today))
    //                 .attr("y1", height/5)
    //                 .attr("y2", height)
    //                 .attr("stroke", "black")
    //                 .attr("stroke-width", 1)
    //                 .attr("stroke-dasharray", "8, 8")
    //     todayMarker
    //                 .append("text")
    //                 .attr("id", "today-text")
    //                 .attr("transform", `translate(${x(today) + 17}, ${height/5}) rotate(-90)`)
    //                 .text("Today")
    //                 .style("text-anchor", "end")

    //     //SET UP CLIP PATH//
    //     var mainClip = svg
    //                         .append("defs")
    //                         .append("svg:clipPath")
    //                             .attr("id", "main-clip")
    //                             .append("svg:rect")
    //                                 .attr("width", width )
    //                                 .attr("height", height )
    //                                 .attr("x", 0)
    //                                 .attr("y", 0);
    //     const mainArea = svg.append("g")
    //                         .attr("clip-path", "url(#main-clip)");
        
    //     //SET UP CURVES//
    //     const lineGenerator = d3.line()
    //                             .curve(d3.curveCatmullRom);
    //     const predLineGenerator = d3.line()
    //                                 .curve(d3.curveBasis);
    //     const line = lineGenerator
    //                     .x(function(d) { return x(d.date) })
    //                     .y(function(d) { return y(d.value) })
    //     const predLine = predLineGenerator
    //                         .defined(d => d.defined)
    //                         .x(function(d) { return x(d.date) })
    //                         .y(function(d) { return y(d.value) })
    //     //DRAW CURVES//
    //     var confirmedCurve = mainArea
    //                                 .append("path")
    //                                 .attr("id", "confirmed")
    //                                 .attr("class", "line")
    //                                 .datum(confirmedData)
    //                                 .attr("d", line)
    //                                 .attr("stroke", color(legendString[0]))

    //     var predCurve = mainArea
    //                             .append("path")
    //                             .attr("id", "prediction")
    //                             .attr("class", "line")
    //     console.log(predictionData, userPrediction)
    //     if (Object.keys(userPrediction).length != 0) {
    //         //console.log("yes prediction")
    //         predCurve.datum(mostRecentPred.filter(predLine.defined()))
    //                 .attr("d", predLine)
    //                 .attr("stroke",  color(legendString[1]))
    //         //SET UP TOOLTIP//
    //         const tooltip = svg 
    //                             .append("g")
    //                             .attr("class", "tooltip")
    //         tooltip
    //                 .append("path")
    //                 .attr("id", "tooltip-line")
    //                 .style("stroke", "black")
    //                 .style("stroke-width", "0.5px")
    //                 .style("display", "none");
    //         var mousePerLine = tooltip
    //                                     .selectAll(".mouse-per-line")
    //                                     .data(compiledData)
    //                                     .enter()
    //                                     .append("g")
    //                                     .attr("class", "mouse-per-line");
    //         mousePerLine.append("circle")
    //                     .attr("r", 2)
    //                     .style("stroke", function(d, index) {
    //                         return color(legendString[index]);
    //                     })
    //                     .attr("id", "circle")
    //                     .style("fill", "none")
    //                     .style("stroke-width", "1px")
    //                     .style("display", "none");
    //         mousePerLine.append("text")
    //                     .attr("id", "value")
    //                     .attr("transform", "translate(10,3)"); 
    //         mousePerLine.append("text")
    //                     .attr("id", "date")
    //                     .attr("text-anchor", "end")
    //                     .attr("transform", "rotate(-90)")
            
    //         svg
    //                 .append("svg:rect")
    //                     .attr('width', width)
    //                     .attr('height', height)
    //                     .attr("id", "interactive-area")
    //                     .attr('fill', 'none')
    //                     .attr('pointer-events', 'all')
    //                     .style("cursor", "pointer")
    //                     .on('mouseout', function() { // on mouse out hide line, circles and text
    //                         d3.select("#tooltip-line")
    //                             .style("display", "none");
    //                         d3.selectAll(".mouse-per-line circle")
    //                             .style("display", "none");
    //                         d3.selectAll(".mouse-per-line text")
    //                             .style("display", "none")
    //                     })
    //                     .on('mouseover', function() { // on mouse in show line, circles and text
    //                         d3.select("#tooltip-line")
    //                             .style("display", "block");
    //                     })
    //                     .on('mousemove', function() { // mouse moving over canvas
    //                         var todayDate = new Date();
    //                         todayDate = d3.timeParse("%Y-%m-%d")(todayDate.toISOString().substring(0,10));
    //                         var date = x.invert(d3.mouse(this)[0])
    //                         if (+date > +todayDate) {
    //                             date = todayDate;
    //                         }
    //                         const index = d3.bisectRight(dates, date);
    //                         if(predictionData[date]) {
    //                             //console.log("exists")
    //                             svg
    //                                 .select("#prediction")
    //                                 .datum(predictionData[date].filter(predLine.defined()))
    //                                 .attr("d", predLine)
    //                             compiledData[1] = predictionData[date];
    //                         }
    //                         else {
    //                             if (index === 0) {
    //                                 svg
    //                                     .select("#prediction")
    //                                     .datum([])
    //                                     .attr("d", predLine)
    //                                 compiledData[1] = [];
    //                             }
    //                             else {
    //                                 var newDate = dates[index - 1];
    //                                 //console.log(+predictionData[newDate][0].date, +date);
    //                                 var pred = predictionData[newDate].filter(d => +d.date >= +date)
    //                                 //console.log(pred)
    //                                 svg
    //                                     .select("#prediction")
    //                                     .datum(pred.filter(predLine.defined()))
    //                                     .attr("d", predLine);
    //                                 compiledData[1] = pred;
    //                             }
    //                         }
    //                         mousePerLine.data(compiledData);
    //                         ////////////////////



    //                         var mouse = d3.mouse(this);
    //                         var xCoord = mouse[0];
    //                         d3
    //                             .select("#tooltip-line")
    //                             .attr("d", function() {
    //                                 var d = "M" + xCoord + "," + height;
    //                                 d += " " + xCoord + "," + 0;
    //                                 return d;
    //                             });
    //                         d3
    //                             .selectAll(".mouse-per-line")
    //                             .attr("transform", function(d, i) {
    //                                 if (d.length === 0) {return;}
    //                                 var date = x.invert(xCoord);
    //                                 const index = d3.bisector(f => f.date).left(d, date);
    //                                 var a = null;
    //                                 if (index > 0) {
    //                                     a = d[index - 1];
    //                                 }
    //                                 const b = d[index];
    //                                 //d = the data object corresponding to date and value pointed by the cursors
    //                                 var data = null;
    //                                 if (!a) {
    //                                     data = b;
    //                                 }
    //                                 else if (!b) {
    //                                     data = a;
    //                                 }
    //                                 else {
    //                                     data = b && (date - a.date > b.date - date) ? b : a;
    //                                 }
    //                                 if (+d3.timeDay.floor(date) === +data.date || +d3.timeDay.ceil(date) === +data.date) {
    //                                     if (data.defined != 0) {
    //                                         var element = d3.select(this)
    //                                         element
    //                                                 .select('#value')
    //                                                 .style("display", "block")
    //                                                 .text(Math.round(data.value))
    //                                                 .attr("transform", `translate(${mouse[0]}, ${y(data.value)})`);
                                                
    //                                         element
    //                                                 .select("#date")
    //                                                 .style("display", "block")
    //                                                 .attr("transform", `translate(${mouse[0] + 15}, 0) rotate(-90)`)
    //                                                 .text(d3.timeFormat("%B %d, %Y")(data.date));
    //                                         element
    //                                                 .select("circle")
    //                                                 .style("display", "block")
    //                                                 .attr("transform", `translate(${mouse[0]}, ${y(data.value)})`);
    //                                         return "translate(0,0)";
    //                                     }
    //                                 }
    //                                 var element = d3.select(this)
    //                                 element                
    //                                     .selectAll("text")
    //                                         .style("display", "none")
    //                                 element
    //                                         .select("circle")
    //                                         .style("display", "none");
    //                             });
    //                     })
    //                     .on("click", function() {
    //                         var date = x.invert(d3.mouse(this)[0])
    //                         const index = d3.bisectRight(dates, date);
    //                         //console.log(dates)
    //                         //console.log(date)
    //                         //console.log(index)
    //                         if(predictionData[date]) {
    //                             //console.log("exists")
    //                             svg
    //                                 .select("#prediction")
    //                                 .datum(predictionData[date].filter(predLine.defined()))
    //                                 .attr("d", predLine)
    //                             compiledData[1] = predictionData[date];
    //                         }
    //                         else {
    //                             if (index === 0) {
    //                                 svg
    //                                     .select("#prediction")
    //                                     .datum([])
    //                                     .attr("d", predLine)
    //                                 compiledData[1] = [];
    //                             }
    //                             else {
    //                                 var newDate = dates[index - 1];
    //                                 //console.log(+predictionData[newDate][0].date, +date);
    //                                 var pred = predictionData[newDate].filter(d => +d.date >= +date)
    //                                 //console.log(pred)
    //                                 svg
    //                                     .select("#prediction")
    //                                     .datum(pred.filter(predLine.defined()))
    //                                     .attr("d", predLine);
    //                                 compiledData[1] = pred;
    //                             }
    //                         }
    //                         mousePerLine.data(compiledData);
    //                     })
    //     }
    // }
    //comment
    render() {
        const title = titles[this.props.category][0];
        return (
            <div>
                <div className="profile-chart">
                    <div ref={this.chartRef} className="first-column">
                        <svg className="main-chart"></svg>
                    </div>
                    <div className="second-column">
                        <svg className="legend-container"></svg>
                    </div>
                </div>
                {/* <div className="tooltip-box tooltip"></div> */}
            </div>);
    }
}

export default UserPredictionChart;
