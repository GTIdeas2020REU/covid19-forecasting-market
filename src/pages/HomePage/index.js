import React, { Component, Fragment } from 'react';
import { Dropdown } from 'react-bootstrap';
import ChartContainer from '../../containers/ChartContainer';
import {US_INC_DEATH_MAIN, US_INC_CASE_MAIN} from '../../constants/data'

import './HomePage.css';

class HomePage extends Component {
    constructor(props) {
        super(props);
        this.state = { category: "US Daily Reported Cases"};
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
                return <ChartContainer key='123' data={US_INC_DEATH_MAIN}/>
            }
            else {
                return <ChartContainer key='321' data={US_INC_CASE_MAIN}/>
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
                      <Dropdown.Item eventKey="US Daily Reported Cases" onSelect={this.onClick}>US Daily Reported Cases</Dropdown.Item>
                      <Dropdown.Item eventKey="US Daily Deaths" onSelect={this.onClick}>US Daily Deaths</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <br/>
                {renderChartContainer()}
            </div>
        )
    }
}
export default HomePage
