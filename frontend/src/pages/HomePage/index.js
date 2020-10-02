import React, { Component, Fragment } from 'react';
import { Dropdown } from 'react-bootstrap';
import InteractiveChartContainer from '../../containers/InteractiveChartContainer';
import MainChartContainer from '../../components/MainChartContainer';
import ChartContainer from '../../containers/ChartContainer';

import './HomePage.css';

const data = [
    {
      "name": "confirmed",
      "data": "/us-inc-deaths-confirmed-wk-avg"
    },
    {
      "name": "forecast",
      "data": "/us-inc-deaths-forecasts"
    },
    {
      "name": "aggregate",
      "data": "/us-agg-inc-deaths"
    },
    {
      "name": "user_prediction",
      "data": "/user-prediction?category=us_daily_deaths"
    },
    {
      "name": "mse",
      "data": "/us-mse"
    },
  ]

  const CaseData = [
    {
      "name": "confirmed",
      "data": "/us-daily-cases-confirmed"
    },
    {
      "name": "forecast",
      "data": "/us-daily-cases-forecast"
    },
    {
      "name": "aggregate",
      "data": "/us-agg-inc-cases"
    },
    {
      "name": "user_prediction",
      "data": "/user-prediction?category=us_daily_cases"
    },
    {
      "name": "mse",
      "data": "/us-mse"
    },
  ]
class HomePage extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "US Daily Deaths"};
        this.chartRef = React.createRef();
    }
    onClick = (e) => {
        this.setState({category: e})
    }
    render() {
        let category = this.state.category;
        console.log(category)
        const renderChartContainer = () => {
            if(category == "US Daily Deaths") {
                return <ChartContainer key='123' compiledData={data} category="us_daily_deaths"/>

            }
            else {
                console.log("daily cases")
                return <ChartContainer key='321' compiledData={CaseData} category="us_daily_cases"/>
            }
        }
        return(
            <div>
                <br/>
                <Dropdown>
                    <Dropdown.Toggle variant="success" id="dropdown-basic">
                        {this.state.category}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item eventKey="US Daily Deaths" onSelect={this.onClick}>US Daily Deaths</Dropdown.Item>
                        <Dropdown.Item eventKey="US Daily Cases" onSelect={this.onClick}>US Daily Cases</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <br/>
                {renderChartContainer()}
            </div>
        )
    }
}
export default HomePage