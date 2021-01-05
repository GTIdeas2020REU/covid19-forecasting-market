import React, { Component, Fragment } from 'react';
import { Dropdown } from 'react-bootstrap';
import { fetchData } from '../../utils/data';
import { titles, Data, RawData } from '../../constants/data';
import LeaderboardTemp from '../../components/LeaderboardTemp';
import './TopForecastsPage.css';

//render title, instructions, dropdown, Leaderboard Component

class TopForecastsPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            category: "us_daily_cases",
            interval: "overall",
            endPoints: new Data("us_daily_cases", "leaderboard", "overall"),
            rawData: null
        }
    }
    async onClickCategory(e) {
        this.setState({category: e});
        let endPoints = this.state.endPoints;
        endPoints.update(e, "")
        await this.updateRawData(e, this.state.interval, endPoints);
    }

    async onClickInterval(e) {
        this.setState({interval: e})
        let endPoints = this.state.endPoints;
        endPoints.update("", e)
        await this.updateRawData(this.state.category, e, endPoints);
    }

    async componentDidMount() {
        await this.updateRawData(this.state.category, this.state.interval, this.state.endPoints);
    }

    async updateRawData(category, interval, endPoints) {
        let rawData = new RawData(category, interval,"leaderboard", endPoints);
        await rawData.fetchRawData();
        this.setState({rawData})
    }

    render() {
        const { rawData } = this.state;
        return (
            <div>
                <h2 style={{marginBottom: 0}}>Top Forecasts</h2>
                <small>* indicates an official forecaster as labelled by the CDC</small>
                <div className="main-instruction"> {/* BOLD!!! */}
                    <p>The Top Forecasts page showcases the best predictions by all users of the site, ranked using our own scoring scheme. Each 
                        row on the chart shows a user or University source along with a calculated score.</p>
                    <p>Click on a row to view all predictions from a user. Hover over the prediction chart to see the exact values of the user's prediction.</p>
                </div>
                <div className="dropdown">
                    <span style={{display: 'inline-block', marginRight: 5}}>
                        <Dropdown onSelect={this.onClickCategory.bind(this)}>
                        <Dropdown.Toggle variant="success" id="dropdown-category">
                            {titles[this.state.category][0]}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="us_daily_cases">{titles["us_daily_cases"][0]}</Dropdown.Item>
                            <Dropdown.Item eventKey="us_daily_deaths">{titles["us_daily_deaths"][0]}</Dropdown.Item>
                            <Dropdown.Item eventKey="us_daily_hosps">{titles["us_daily_hosps"][0]}</Dropdown.Item>
                        </Dropdown.Menu>
                        </Dropdown>
                    </span>

                    <span style={{display: 'inline-block'}}>
                        <Dropdown onSelect={this.onClickInterval.bind(this)}>
                        <Dropdown.Toggle variant="success" id="dropdown-error">
                            {this.state.interval}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item eventKey="overall">overall</Dropdown.Item>
                            <Dropdown.Item eventKey="1-week-ahead">1-week-ahead</Dropdown.Item>
                            <Dropdown.Item eventKey="2-week-ahead">2-week-ahead</Dropdown.Item>
                            <Dropdown.Item eventKey="4-week-ahead">4-week-ahead</Dropdown.Item>
                            <Dropdown.Item eventKey="8-week-ahead">8-week-ahead</Dropdown.Item>
                        </Dropdown.Menu>
                        </Dropdown>
                    </span>
                </div>
                {rawData == null
                    ? "Loading..."
                    : <LeaderboardTemp rawData={rawData}/>
                }
                
            </div>
        )
    }
}
export default TopForecastsPage
