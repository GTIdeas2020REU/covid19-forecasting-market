import React, { Component } from 'react';
import * as d3 from 'd3'
import './index.css'
import { clamp, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction, getLastDate, getLastValue } from '../../utils/data';
import { elementType } from 'prop-types';
import { addDays, formatDate } from '../../utils/date';
import { timeDay } from 'd3';

class MainChart extends Component {
    constructor(props) {
        super(props);
        this.chartRef = React.createRef();
    }
    componentDidMount() {
        this.renderChart()
    }

    renderChart() {
        const {confirmed} = this.props;
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
        return (
            <div>
            <h2>US Daily Cases</h2>
            
            {/*<p>Current total: {this.confirmedData.value}</p>*/}
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
                    {/* <button className="btn btn-primary " id="delete-btn">Reset</button> */}
                    {/* <div class="speech-bubble left">shift or resize the gray box to change the zoom level</div> */}
                </div>
            </div>
            <div class="tooltip-box"></div>
        </div>);
    }
}
export default MainChart;