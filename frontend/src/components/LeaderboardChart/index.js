import React, { Component } from 'react';
import * as d3 from 'd3';
import './LeaderboardChart.css';
import { getMostRecentPrediction, getAllDataPoints, sortDictByDate, sortStringDates } from '../../utils/data';

class LeaderboardChart extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "us_daily_deaths" };
        this.chartRef = React.createRef();
    }

    componentDidMount() {
        this.renderChart();
    }


    renderChart() {
        const { userPrediction, confirmed } = this.props;
        var predictionData = {};//where we will store formatted userPrediction
        const category = this.state.category;

        //format confirmedData, forecastData, and predictionData into a list of js objects, convert date from string to js date object
        var confirmedData = Object.keys(confirmed).map(key => ({
            date: d3.timeParse("%Y-%m-%d")(key),
            value: confirmed[key]
        }));

        predictionData = userPrediction.map(d => ({
            date: d3.timeParse("%Y-%m-%d")((d.date).substring(0,10)),
            value: d.value
        }));

        //IMPORTANT BOUNDARIES// 
        const confirmedStartDate = d3.timeParse("%Y-%m-%d")("2020-02-01");
        const predEndDate = predictionData[predictionData.length - 1].date;
        const valueMax = 5000;

        /////////////////////////////////DRAW CHART//////////////////////////////
        //set up margin, width, height of chart
        const legendWidth = 180;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const contextHeight = 100;
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 600 - margin.left - margin.right,
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
                    .attr('cx', width + 30)
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
                    .attr("x", width + 45)
                    .attr("y", function(d,i){ return 20 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
                    .style("fill", function(d){ return color(d)})
                    .text(function(d){ return d})
                        .attr("text-anchor", "left")
                        .style("alignment-baseline", "middle")

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
                            .x(function(d) { return x(d.date) })
                            .y(function(d) { return y(d.value) })

        //DRAW CURVES//
        var confirmedCurve = mainArea
                                    .append("path")
                                    .attr("id", "lbConfirmed")
                                    .attr("class", "line")
                                    .datum(confirmedData)
                                    .attr("d", line)
                                    .attr("stroke", color(legendString[0]))
        var predCurve = mainArea
                                .append("path")
                                .attr("id", "lbPrediction")
                                .attr("class", "line")
                                .datum(predictionData)
                                .attr("d", predLine)
                                .attr("stroke",  color(legendString[1]))    
    }

    render() {
        return(<div ref={this.chartRef}></div>);
    }
}

export default LeaderboardChart;
