import React, { Component } from 'react';
import { Dropdown } from 'react-bootstrap';
import InteractiveChartContainer from '../../containers/InteractiveChartContainer';
import MainChartContainer from '../../components/MainChartContainer';

import './HomePage.css';

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
                return <InteractiveChartContainer/>
            }
            else {
                return <MainChartContainer/>
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