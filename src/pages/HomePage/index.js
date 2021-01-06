import React, { Component } from 'react';
import { Dropdown } from 'react-bootstrap';
import ChartContainer from '../../containers/ChartContainer';
import {titles, US_INC_DEATH_MAIN, US_INC_CASE_MAIN, US_INC_HOSP_MAIN} from '../../constants/data'

import './HomePage.css';

class HomePage extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "us_daily_cases"};
        this.chartRef = React.createRef();
    }
    onClick = (e) => {
        this.setState({category: e})
    }
    render() {
      
        let category = this.state.category;
        const renderChartContainer = () => {
            if(category === "us_daily_cases") {
                return <ChartContainer key='321' data={US_INC_CASE_MAIN}/>
            }
            else if(category === "us_daily_deaths") {
                return <ChartContainer key='123' data={US_INC_DEATH_MAIN}/>
            }
            else if(category === "us_daily_hosps") {
                return <ChartContainer key='132' data={US_INC_HOSP_MAIN}/>
            }
        }
        return(
            <div>
                <br/>
                <Dropdown>
                    <Dropdown.Toggle variant="success" id="dropdown-basic">
                        {titles[this.state.category][0]}
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item eventKey="us_daily_cases" onSelect={this.onClick}>{titles["us_daily_cases"][0]}</Dropdown.Item>
                      <Dropdown.Item eventKey="us_daily_deaths" onSelect={this.onClick}>{titles["us_daily_deaths"][0]}</Dropdown.Item>
                      <Dropdown.Item eventKey="us_daily_hosps" onSelect={this.onClick}>{titles["us_daily_hosps"][0]}</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <br/>
                {renderChartContainer()}
            </div>
        )
    }
}
export default HomePage
