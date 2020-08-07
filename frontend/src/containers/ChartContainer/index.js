import React from 'react';
import ParentChart from '../../components/ParentChart';

import { cleanConfirmedData, organizeData } from '../../utils/data';

class ChartContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      forecast: null,
      orgs: null,
      confirmed: null,
      confirmedAvg: null,
      userPrediction: null,
      aggregate: null,
      loggedIn: false
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
    fetch('/us-inc-deaths-confirmed').then(res => res.json()).then(data => {
        this.setState({ confirmed: data });
    });
    fetch('/us-inc-deaths-confirmed-wk-avg').then(res => res.json()).then(data => {
      this.setState({ confirmedAvg: data });
    });
    fetch('/us-agg-inc-deaths').then(res => res.json()).then(data => {
        this.setState({ aggregate: data });
    });
    fetch('/login-status/').then(res => res.json()).then(data => {
        this.setState({ loggedIn: data['logged in'] });
    });
  }

  render() {
    const { forecast, orgs, userPrediction, confirmed, confirmedAvg, aggregate, loggedIn } = this.state;
    if (!forecast || !orgs || !userPrediction || !confirmed || !aggregate || !loggedIn) return 'Loading...';
    const isProfile = this.props.isProfile;

    return (
      <div className="chart-container">
        <ParentChart
          forecast={forecast}
          orgs={orgs}
          userPrediction={userPrediction}
          confirmed={confirmed}
          confirmedAvg={confirmedAvg}
          aggregate={aggregate}
          loggedIn={loggedIn}
          isProfile={isProfile}
          //category={"us_daily"}
        />
      </div>
    );
  }
}

export default ChartContainer;
