import React, { Component } from 'react';
import * as d3 from 'd3';
import {cleanPrediction, createFocusContext, savePrediction, getLastDate, createDefaultPrediction, getLastValue, cleanData, clamp, getAllDataPoints, getDataPointsFromPath, reformatData, reformatPredData, getMostRecentPrediction } from '../../utils/data';
import './InteractiveChartTemp.css';



class InteractiveChartTemp extends Component {
    constructor(props) {
        super(props);
    }

    appendModal() {
        const signinRedirect = () => {window.location.href='/signin'}
        const signupRedirect = () => {window.location.href='/signup'}
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
        console.log(modal);
        console.log(document.querySelector(".modal"))
        document.querySelector(".chart-container").append(modal);
    }

    componentDidMount() {
        this.props.chart.append("rect")
        this.renderChart();
    }
    renderChart() {
        const { forecast, orgs, userPrediction, confirmed, confirmedAvg, aggregate, loggedIn, x, y, width, height, predStartDate, xAxis, marginBottom, appendModal} = this.props;
        console.log(marginBottom);
        this.appendModal();
        const predEndDate = x.domain()[1];
        var svg = this.props.chart;
        var confirmedData = reformatData(confirmedAvg);
        const confirmedTemp = reformatData(confirmed);
        const confirmedLastVal = getLastValue(confirmedTemp);
        confirmedData.push({
            date: getLastDate(confirmedTemp),
            value: confirmedLastVal
        })
        console.log(confirmedData)
        var aggregateData = reformatData(aggregate);
        var forecastData = forecast.map((f)=> {
            return cleanData(reformatData(f), predStartDate, confirmedLastVal);
        });
        aggregateData = cleanData(aggregateData, predStartDate, confirmedLastVal);
        var predictionData = userPrediction;
        var line = d3.line().curve(d3.curveCatmullRom)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })
        var predLine = d3.line().curve(d3.curveBasis)
            .defined(d => d.defined)
            .x(function(d) { return x(d.date) })
            .y(function(d) { return y(d.value) })
        const labels = ['User Prediction', 'Confirmed Data', 'Aggregate Data'].concat(orgs);
        const color = d3
            .scaleOrdinal()
            .domain(labels)
            .range(d3.schemeTableau10);
        var confirmedBoundary = x(predStartDate);
        var defs = svg
            .append("defs");
        var confirmedClip = defs
            .append("svg:clipPath")
                .attr("id", "confirmed-clip")
                .append("svg:rect")
                    .attr("width", confirmedBoundary)
                    .attr("height", height)
                    .attr("x", 0)
                    .attr("y", 0);
        const confirmedArea = svg
                .append('g')
                .attr("clip-path", "url(#confirmed-clip)");
        var predictionClip = defs
            .append("svg:clipPath")
                .attr("id", "prediction-clip")
                .append("svg:rect")
                    .attr("id", "prediction-rect")
                    .attr("width", width - confirmedBoundary )
                    .attr("height", height)
                    .attr("x", confirmedBoundary)
                    .attr("y", 0);
        const predictionArea = svg.append('g')
            .attr("clip-path", "url(#prediction-clip)");
        var confirmedLine = confirmedArea.append("path")
            .attr("class", "confirmed line")
            .datum(confirmedData)    
            .attr('d', line)
            .style("stroke", color(labels[1]))
            .style("stroke-width", "3px")
        var aggregateLine = predictionArea.append("path")
            .attr("class", "aggregate line")
            .datum(aggregateData)    
            .attr('d', line)
            .style("stroke", color(labels[2]))
            .style("stroke-width", "2px")
        predictionArea
            .selectAll(".forecast")
            .data(forecastData)
            .enter()
            .append("path")
                .attr("d", line)
                .attr("id", (f, index) => orgs[index])
                .attr("class", "forecast line")
                .style("stroke", (f, index) => color(orgs[index]))
                .style("stroke-width", "2px");
        
        ///prediction data////
        if (loggedIn) {
            console.log(predEndDate)
            predictionData = getMostRecentPrediction(userPrediction);
            console.log(predictionData);
            if (!predictionData) {
                predictionData = createDefaultPrediction(predStartDate, predEndDate);
            }
            predictionData = cleanPrediction(predictionData, predStartDate, predEndDate, confirmedLastVal);
        }
        else {
            predictionData = createDefaultPrediction(predStartDate, predEndDate);
        }
        var filteredData = predictionData.filter(predLine.defined())

        var predictionLine = predictionArea.append("path")
            .attr("class", "prediction line")
            .datum(predictionData)
            .attr("d", predLine)
            .style("stroke", color(labels[0]))
            .style("stroke-width", "2px")
        
        const forecastPaths = document.querySelectorAll(".forecast");
        const confirmedPath = document.querySelector(".confirmed");
        const aggregatePath = document.querySelector(".aggregate");
        confirmedData = getAllDataPoints(confirmedPath, x, y, x.domain()[0], predStartDate);
        aggregateData = getAllDataPoints(aggregatePath, x, y, predStartDate, getLastDate(aggregateData))
        forecastData.map((f, index) => {
            forecastData[index] = getAllDataPoints(forecastPaths[index], x, y, predStartDate, getLastDate(f));
        })
        var compiledData = [predictionData, confirmedData, aggregateData].concat(forecastData);
        /////drag/////
        const mouseArea = svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "none")
            .attr("id", "mouse-area")
            .style("pointer-events","visible");
        var drag = d3.drag()
                        .on("drag", function() {
                        console.log('yes');
                        //hide "draw your guess" text
                        var pos = d3.mouse(this);
                        var date = clamp(predStartDate, predEndDate, x.invert(pos[0]));
                        var value = clamp(0, y.domain()[1], y.invert(pos[1]));
                        predictionData.forEach(function(d){
                            if (+d3.timeDay.round(d.date) == +d3.timeDay.round(date)){
                                d.value = value;
                                d.defined = true
                            }
                        predictionData[0].value = confirmedLastVal;//make sure the prediction curve is always connected to the confirmed curve
                        compiledData[0].data = predictionData;
                        filteredData = predictionData.filter(predLine.defined())
                        predictionLine.datum(filteredData)
                                .attr('d', predLine)
                                .style("stroke", color(labels[0]))
                                .style("stroke-width", "2px")
                        });
                    })
                    .on("end", function () {
                        if(!loggedIn) {
                            d3
                                .select("#modal")
                                .style("display", "block");
                        }
                        else {
                            var lastPredDate = getLastDate(filteredData);
                            getDataPointsFromPath(predictionData, predictionLine.node(), x, y, lastPredDate);
                            savePrediction(predictionData, "us_daily_deaths");
                        }
                    });
        svg.call(drag)

        var modal = document.getElementById("modal");
        window.onclick = function(event) {
            if (event.target == modal) {
              modal.style.display = "none";
            }
        }
        //focus+context//
        createFocusContext(svg, width, height, marginBottom, confirmedData, aggregateData, forecastData, predictionData, labels, x, y, xAxis, line, predLine, color);
        ///tooltip///
    }
    render() {
        console.log(this.props.chart.node());
        return(
            <div></div>
        )
    }
}

export default InteractiveChartTemp;