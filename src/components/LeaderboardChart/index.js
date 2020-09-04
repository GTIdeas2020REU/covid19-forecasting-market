import React, { Component } from 'react';
import * as d3 from 'd3';
import './LeaderboardChart.css';

class LeaderboardChart extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            userPrediction: null,
            confirmed: null,
         };
        this.chartRef = React.createRef();
    }

    componentDidMount() {
        this.setState({userPrediction: this.props.userPrediction, confirmed: this.props.confirmed});
        this.renderChart();
    }

    componentDidUpdate(prevProps, prevState) {
        // only update chart if the data has changed
        if (prevProps.userPrediction !== this.props.userPrediction) {
            this.renderChart();
        }
    }


    renderChart() {
        var { userPrediction, confirmed } = this.props;
        var compiledData = [];
        var predictionData = [];
        //format confirmedData, predictionData
        var confirmedData = Object.keys(confirmed).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: confirmed[key]
        }));
        if (userPrediction[0].defined == undefined) {
            predictionData = userPrediction.map(d => ({
                date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
                value: d.value,
                defined: true
            }));
        }
        else {
            predictionData = userPrediction.map(d => ({
                date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
                value: d.value,
                defined: d.defined
            }));
        }
        predictionData = predictionData.filter(d => d.defined);       
        compiledData = [confirmedData, predictionData]
        //IMPORTANT BOUNDARIES// 
        const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-02-01");
        var predEndDate = predictionData[predictionData.length - 1].date;
        const valueMax = 5000;

        /////////////////////////////////DRAW CHART//////////////////////////////
        //set up margin, width, height of chart
        const legendWidth = 180;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const contextHeight = 100;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 600 - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;
        var svg = d3.select(this.chartRef.current)
                    .append("svg")
                        //.attr("width", width + margin.left + margin.right + legendWidth)
                        //.attr("height", height + margin.top + margin.bottom + toolTipHeight + contextHeight)
                        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom + contextHeight + 100}`)
                        .attr('preserveAspectRatio','xMinYMin meet')
                    .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        //Create X axis label   
        svg.append("text")
            .attr("x", width/2)
            .attr("y", height + 2*margin.bottom)
            .style("text-anchor", "middle")
            .text("Date");
            
        //Create Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height/2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Daily Deaths");

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
        const classNames = ['confirmed', 'prediction'];
        const color = d3
                        .scaleOrdinal()
                        .domain(legendString)
                        .range(d3.schemeTableau10);

        var legend = svg
                        .append('g')
                        .attr("viewBox", "0 0 400 500")
                        .append('g')
                        .attr("id", "legend");

        legend
                .selectAll("rect")
                .data(legendString)
                .enter()
                .append("circle")
                    .attr('cx', width*3/5+40)
                    //.attr('cx', width-65)
                    .attr("cy", function(d,i){ return 0 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    .attr("r", 6)
                    .style("fill", function(d){ return color(d)});
        legend
                .selectAll("labels")
                .data(legendString)
                .enter()
                .append("text")
                    .attr("x", width*3/5+60)
                    //.attr("x", width-50)
                    .attr("y", function(d,i){ return 0 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    .style("fill", function(d){ return 'black'})
                    .text(function(d){ return d})
                        .attr("text-anchor", "left")
                        .style("alignment-baseline", "middle");

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
        var line = lineGenerator
                        .x(function(d) { return x(d.date) })
                        .y(function(d) { return y(d.value) });
        var predLine = predLineGenerator
                            .defined(d => d.defined)
                            .x(function(d) { return x(d.date) })
                            .y(function(d) { return y(d.value) });

        //DRAW CURVES//
        var confirmedCurve = mainArea
                                    .append("path")
                                    .attr("id", "lbConfirmed")
                                    .attr("class", "line")
                                    .datum(confirmedData)
                                    .attr("d", line)
                                    .attr("stroke", color(legendString[0]));
        var predCurve = mainArea
                                .append("path")
                                .attr("id", "lbPrediction")
                                .attr("class", "line")
                                .datum(predictionData)
                                .attr("d", predLine)
                                .attr("stroke",  color(legendString[1]));

        ////ADD TODAY LINE/////////////////////////////////////////////////////
        const today = d3.timeParse("%Y-%m-%d")(new Date().toISOString().substring(0,10));
        var todayMarker = svg
                            .append("g")
                            .attr("id", "today-marker");
        todayMarker
                    .append("line")
                    .attr("id", "today-line")
                    .attr("x1", x(today))
                    .attr("x2", x(today))
                    .attr("y1", 0)
                    .attr("y2", height)
                    .attr("stroke", "black")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "8, 8");
        todayMarker
                    .append("text")
                    .attr("id", "today-text")
                    .attr("transform", `translate(${x(today) + 17}, 0) rotate(-90)`)
                    .text("Today")
                    .style("text-anchor", "end");
        //////////add tooltip///////////////////////////////////////////////////////////////////////
        const tooltipArea = svg
                                .append("g")
                                .attr("class", "tooltip")

        tooltipArea.append("path") //vertical line
                    .attr("id", "tooltip-line")
                    .style("stroke", "black")
                    .style("stroke-width", "0.5px")
                    .style("opacity", "0");
        tooltipArea.append("text")
                    .attr("x", 10)
                    .attr("y", 10)
                    .attr("class", "confirmed confirmed-value")
                    .text("Confirmed: ")
        tooltipArea.append("text")
                    .attr("x", 10)
                    .attr("y", 30)
                    .attr("class", "prediction prediction-value")
                    .text("User Prediction: ")
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
                            return color(legendString[i]);
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
                                console.log("out")
                                d3.select("#tooltip-line")
                                .style("opacity", "0");
                                d3.selectAll(".mouse-per-line circle")
                                .style("opacity", "0");
                                d3.selectAll(".mouse-per-line text")
                                .style("opacity", "0")
                                tooltipBox.style("display", "none")
                            })
                            .on('mouseover', function() { // on mouse in show line, circles and text
                                // console.log("over")
                                d3.select("#tooltip-line")
                                .style("opacity", "1");
                                tooltipBox.style("display", "block")
                            })
                            .on('mousemove', function() { // mouse moving over canvas
                                var mouse = d3.mouse(this);
                                var xCoord = mouse[0];
                                var yCoord = mouse[1];
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
                                        d.map(data => {
                                            if(+data.date === +d3.timeDay.round(date) && data.defined !== 0) {
                                                value = data.value;
                                            }
                                        })
                                        var element = d3.select(this);
                                        var textBox = tooltipBox.select(`.${classNames[i]}`);
                                        var tempText = d3.select(`.${classNames[i]}`)

                                        if (value >= 0) {
                                            // d3.select(".current-value").text(`${Math.round(value)}`)
                                            if (i == 0) {
                                                tempText.text(`Confirmed: ${Math.round(value)}`)
                                            }
                                            else {
                                                tempText.text(`User Prediction: ${Math.round(value)}`)
                                            }

                                            if(textBox.empty()) {
                                                textBox = tooltipBox.append("div")
                                                                     .attr("class", classNames[i])
                                                                     .style("padding-left", "10px")
                                                                     .style("padding-right", "10px")
                                                                     .style("background-color", color(legendString[i]))
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
                                            if (i == 0) {
                                                tempText.text(`Confirmed:`)
                                            }
                                            else {
                                                tempText.text(`User Prediction:`)
                                            }
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
        return(
            // <div>
                <div style={{padding: "20px"}} ref={this.chartRef}></div>
                // <div className="tooltip-box"></div>
            /* </div>  */
        );
    }
}

export default LeaderboardChart;
