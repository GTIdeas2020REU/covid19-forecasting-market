import React, { Component } from 'react';
import MainChart from '../../components/MainChart'
import InteractiveChart from '../../components/InteractiveChart';
import { cleanConfirmedData, getLastValue, organizeData } from '../../utils/data';

class MainChartContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            confirmed: null,
        };
    }

    componentDidMount() {
        console.log("mounted")
        // fetch("/us-daily-cases-confirmed").then(data => {
        //     console.log(data.json())
        // })
        fetch("/us-daily-cases-confirmed").then(res => res.json()).then(data => {
            this.setState({ confirmed: data });
            console.log("CONFIRMED Cases");
            console.log(data);
        });
    }
    render() {
        const { confirmed } = this.state;
        if (!confirmed) return 'Loading Data...';

        return (
            <div className="chartContainer">
                <MainChart
                    confirmed={confirmed}
                />
            </div>
        );
    }
}

export default MainChartContainer;