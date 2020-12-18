import React, { Component } from 'react';
import UserPredictionChart from '../../components/UserPredictionChart';
import { cleanConfirmedData, organizeData } from '../../utils/data';

class UserPredictionChartContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            forecast: null,
            orgs: null,
            confirmed: null,
            userPrediction: null,
            aggregate: null,
            userStatus: null
        };
    }

    componentDidMount() {
        fetch('/us-inc-deaths-forecasts').then(res => res.json()).then(data => {
            const [results, orgs] = organizeData(data);
            this.setState({ forecast: results, orgs });
        });
            fetch('/user-prediction?category=us_daily_deaths').then(res => res.json()).then(data => {
            this.setState({ userPrediction: data });
        });
        fetch('/us-inc-deaths-confirmed-wk-avg').then(res => res.json()).then(data => {
            //const result = JSON.parse(data);
            this.setState({ confirmed: data });
        });
        fetch('/us-agg-inc-deaths').then(res => res.json()).then(data => {
            this.setState({ aggregate: data });
        });
        fetch('/login-status/').then(res => res.json()).then(data => {
            this.setState({ userStatus: data });
            console.log(data);
        });
    }
    render() {
        const { forecast, orgs, userPrediction, confirmed, aggregate, userStatus } = this.state;
        if (!forecast || !orgs || !userPrediction || !confirmed || !aggregate || !userStatus) return 'Loading...';

        return (
            <div className="chartContainer">
                <UserPredictionChart
                    forecast={forecast}
                    orgs={orgs}
                    userPrediction={userPrediction}
                    confirmed={confirmed}
                    aggregate={aggregate}
                    userStatus={userStatus}
                />
            </div>
        );
    }
}

export default UserPredictionChartContainer;