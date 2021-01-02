import React, { Component } from 'react';
import * as d3 from 'd3';
import './UserPredictionChart.css';
import { getMostRecentPrediction, getAllDataPoints, sortDictByDate, sortStringDates, createDefaultPrediction, getLastDate } from '../../utils/data';

class UserPredictionChart extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "us_daily_deaths" };
        this.chartRef = React.createRef();
    }

    componentDidMount() {
        if (this.props.profilePage) {
            const userStatus = this.props.userStatus;
            if (userStatus['logged in']) {
                this.renderChart();
            }
            else {
                this.chartRef.current.innerHTML = "Please log in"
            }
        } else {
            this.renderChart();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        // only update chart if the data has changed
        if (!this.props.profilePage) {
            if (prevProps.userPrediction !== this.props.userPrediction) {
                this.renderChart();
            }
        }
    }

    renderChart() {
        const { forecast, orgs, userPrediction, confirmed, aggregate, category } = this.props;
        var predictionData = {};//where we will store formatted userPrediction
        var compiledData = [];
        //console.log(confirmed)
        const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-01-01");
        const maxValues = {'us_daily_deaths': 5000, 'us_daily_cases': 250000, 'us_daily_hosps': 30000};
        var valueMax = maxValues[category];
        var predEndDate = null;
        const predLength = 155;
        var mostRecentPred = [];

        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = Object.keys(confirmed).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: confirmed[key]
        }));
        var predStartDate = getLastDate(confirmedData);

        //store userPrediction in predictionData if it exists; parse dates and store as d3 date objects
        if(Object.keys(userPrediction).length > 0) {
            Object.keys(userPrediction).map(p => {
                predictionData[p]= userPrediction[p].map(d => ({
                    date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
                    value: d.value,
                    defined: d.defined
                }))
            })
            predictionData = sortDictByDate(predictionData);
            //get most recent prediction
            var dates = sortStringDates(Object.keys(userPrediction));
            const mostRecentPred = predictionData[dates[dates.length - 1]];
            //push to compiledData
            compiledData = [confirmedData, mostRecentPred];
            //IMPORTANT BOUNDARIES// 
            predEndDate = mostRecentPred[mostRecentPred.length - 1].date;
        }
        predEndDate = !predEndDate ? d3.timeDay.offset(predStartDate, predLength) : predEndDate;

        /////////////////////////////////////////////////DRAW CHART//////////////////////////////
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
        
        //Create X axis label   
        svg.append("text")
            .attr("x", width/2)
            .attr("y", height + 2*margin.bottom)
            .style("text-anchor", "middle")
            .text("Date");
        
        const yAxisTitle = {'us_daily_deaths': "Daily Deaths", 'us_daily_cases': "Daily Cases", 'us_daily_hosps': "Daily Hospitalizations"};
        //Create Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height/2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yAxisTitle[category]);

        var x = d3
                    .scaleTime()
                    .domain([confirmedStartDate, predEndDate])
                    .range([0, width]);
        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        var y = d3
                    .scaleLinear()
                    .domain([0, valueMax])
                    .range([height, 0]);
        var yAxis = svg
                        .append("g")
                        .call(d3.axisLeft(y));
        
        //DRAW LEGEND//
        const legendString = ["Daily Confirmed Deaths", "User Prediction"];
        const color = d3
                        .scaleOrdinal()
                        .domain(legendString)
                        .range(d3.schemeTableau10);
        const legend = svg
                            .append('g')
                            .attr("id", "legend");
        legend
                .selectAll("rect")
                .data(legendString)
                .enter()
                .append("circle")
                    .attr('cx', width*4/5 - 15)
                    .attr("cy", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    .attr("r", 6)
                    //.attr("width", size)
                    //.attr("height", size)
                    .style("fill", function(d){ return color(d)})
        legend
                .selectAll("labels")
                .data(legendString)
                .enter()
                .append("text")
                    .attr("x", width*4/5)
                    .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    .style("fill", function(d){ return color(d)})
                    .text(function(d){ return d})
                        .attr("text-anchor", "left")
                        .style("alignment-baseline", "middle")
        
        //DRAW TODAY LINE//
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        //console.log(today);
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
                                    .attr("stroke", color(legendString[0]))

        var predCurve = mainArea
                                .append("path")
                                .attr("id", "prediction")
                                .attr("class", "line")
        console.log(predictionData, userPrediction)
        if (Object.keys(userPrediction).length != 0) {
            //console.log("yes prediction")
            predCurve.datum(mostRecentPred.filter(predLine.defined()))
                    .attr("d", predLine)
                    .attr("stroke",  color(legendString[1]))
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
                            return color(legendString[index]);
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
                            var todayDate = new Date();
                            todayDate = d3.timeParse("%Y-%m-%d")(todayDate.toISOString().substring(0,10));
                            var date = x.invert(d3.mouse(this)[0])
                            if (+date > +todayDate) {
                                date = todayDate;
                            }
                            const index = d3.bisectRight(dates, date);
                            if(predictionData[date]) {
                                //console.log("exists")
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
                                    //console.log(+predictionData[newDate][0].date, +date);
                                    var pred = predictionData[newDate].filter(d => +d.date >= +date)
                                    //console.log(pred)
                                    svg
                                        .select("#prediction")
                                        .datum(pred.filter(predLine.defined()))
                                        .attr("d", predLine);
                                    compiledData[1] = pred;
                                }
                            }
                            mousePerLine.data(compiledData);
                            ////////////////////



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
                        })
                        .on("click", function() {
                            var date = x.invert(d3.mouse(this)[0])
                            const index = d3.bisectRight(dates, date);
                            //console.log(dates)
                            //console.log(date)
                            //console.log(index)
                            if(predictionData[date]) {
                                //console.log("exists")
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
                                    //console.log(+predictionData[newDate][0].date, +date);
                                    var pred = predictionData[newDate].filter(d => +d.date >= +date)
                                    //console.log(pred)
                                    svg
                                        .select("#prediction")
                                        .datum(pred.filter(predLine.defined()))
                                        .attr("d", predLine);
                                    compiledData[1] = pred;
                                }
                            }
                            mousePerLine.data(compiledData);
                        })
        }
    }
    //comment
    render() {
        return(<div ref={this.chartRef}></div>);
    }
}

export default UserPredictionChart;
