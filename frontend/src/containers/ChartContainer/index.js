import React from 'react';
import LineChart from '../../components/LineChart';
import ModelsChart from '../../components/ModelsChart';
import { cleanConfirmedData, organizeData } from '../../utils/data';

/*function LineCharts({ dataSet, orgs, userPrediction, confirmed }) {
  return dataSet.map((data, index) => {
    return (
      <LineChart data={data} org={orgs[index]} userPrediction={userPrediction} confirmed={confirmed} />
     );
  })
}*/

class ChartContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      orgs: null,
      confirmed: null,
      //userPrediction: null
    };
  }

  componentDidMount() {
    fetch('/us-cum-deaths-forecasts').then(res => res.json()).then(data => {
      const [results, orgs] = organizeData(data);
      this.setState({ data: results, orgs });
    });
    /*fetch('/user-prediction').then(res => res.json()).then(data => {
      this.setState({ userPrediction: data });
    });*/
    fetch('/us-cum-deaths-confirmed').then(res => res.json()).then(data => {
      this.setState({ confirmed: data });
    });
  }

  render() {
    //const { data, orgs, userPrediction, confirmed } = this.state;
    const { data, orgs, confirmed } = this.state;

    //if (!data || !orgs || !userPrediction || !confirmed) return 'Loading...';
    if (!data || !orgs || !confirmed) return 'Loading...';

    return (
      /*
        <LineCharts
          dataSet={data}
          orgs={orgs}
          userPrediction={userPrediction}
          confirmed={confirmed}
        />*/
      <div className="chartContainer">
        <ModelsChart 
          data={data} 
          orgs={orgs}
          confirmed={confirmed} 
        />
      </div>
    );
  }
}

export default ChartContainer;
