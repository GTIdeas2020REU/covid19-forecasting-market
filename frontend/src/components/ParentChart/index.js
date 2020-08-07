import React, { Component, Fragment } from 'react';
import * as d3 from 'd3'
import InteractiveChartTemp from '../InteractiveChartTemp';


class ParentChart extends Component {
    constructor(props) {
        super(props);
        this.chartRef = React.createRef();
        this.state = {
            chart: null,
            x: null,
            y: null,
            width: 0,
            height: 0,
            confirmedStartdate: null,
            predStartDate: null,
            predEndDate: null,
            xAxis: null,
            marginBottom: 0

        }
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
        //document.querySelector(".chart-container").append(modal);
    }

    componentDidMount() {
        var chart = this.setUpChart();
        this.setState({chart: chart})
    }

    setUpChart() {
        const { forecast, orgs, userPrediction, confirmed, aggregate, loggedIn, isProfile} = this.props;
        const legendWidth = 380;
        const toolTipHeight = 50; //to make sure there's room for the tooltip when the value is 0
        const focusHeight = 100;
        const confirmedStartDate = d3.timeParse("%Y-%m-%d")(Object.keys(confirmed)[0]);
        const predStartDate = d3.timeParse("%Y-%m-%d")(Object.keys(confirmed)[Object.keys(confirmed).length - 1]);
        const predLength = 155;
        const predEndDate = d3.timeDay.offset(predStartDate, predLength);
        this.setState({confirmedStartDate: confirmedStartDate, predStartDate: predStartDate, predEndDate: predEndDate, predLength: predLength});
        var margin = {top: 20, right: 30, bottom: 20, left: 60},
            width = 800 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;
        this.setState({marginBottom: margin.bottom});
        console.log(margin.bottom, this.state.marginBottom)
        this.setState({width: width, height: height})
        var svg = d3.select(".chart-container")
                    .append("svg")
                        .attr("width", width + margin.left + margin.right + legendWidth)
                        .attr("height", height + margin.top + margin.bottom + toolTipHeight + focusHeight)
                    .append("g")
                    .attr("ref", `${this.chartRef.current}`)
                    .attr("transform", `translate(${margin.left}, ${margin.top + 20} )`);
        
        var x = d3
                    .scaleTime()
                    .domain([confirmedStartDate, predEndDate])
                    .range([ 0, width ])
                    //.nice(); //rounds up/down the max and mind of x axis
        var xAxis = svg
                        .append("g")
                        .attr("transform", "translate(0," + height + ")")
                        .call(d3.axisBottom(x));
        this.setState({xAxis: xAxis});
        console.log(xAxis.node());
        var yMax = d3.max(Object.values(confirmed));
        forecast.map(f => {
            var currMax = d3.max(f)
            yMax = currMax > yMax ? currMax : yMax;
        })
        var y = d3.scaleLinear()
            .domain([0, yMax])
            .range([ height, 0 ])
            .nice();
        this.setState({x: x, y: y});

        svg
            .append("g")
            .call(d3.axisLeft(y));
        return svg;
    }

    render() {
        const { forecast, orgs, userPrediction, confirmed, confirmedAvg, aggregate, loggedIn } = this.props;
        console.log(forecast)
        if(!this.state.chart || !this.state.marginBottom) return "Loading"
        return(
            <Fragment>
                {!this.props.isProfile ? 
                <h1>UserPredictionChart</h1> : 
                <InteractiveChartTemp 
                    chart={this.state.chart}
                    forecast={forecast}
                    orgs={orgs}
                    userPrediction={userPrediction}
                    confirmed={confirmed}
                    confirmedAvg={confirmedAvg}
                    aggregate={aggregate}
                    loggedIn={loggedIn}
                    x={this.state.x}
                    y={this.state.y}
                    width={this.state.width}
                    height={this.state.height}
                    predStartDate={this.state.predStartDate}
                    xAxis={this.state.xAxis}
                    marginBottom = {this.state.marginBottom}
                    appendModal={this.appendModal()}
                />}
            </Fragment>
        )
    }
}

export default ParentChart;