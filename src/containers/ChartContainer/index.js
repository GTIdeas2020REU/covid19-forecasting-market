import React from 'react';
import ParentChart from '../../components/ParentChart';
import MainChart from '../../components/MainChart';
import { cleanForecastData, organizeData, fetchData} from '../../utils/data';
import { Spinner } from 'react-bootstrap';
import UserPredictionChart from '../../components/UserPredictionChart';

class ChartContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      compiledData: null,
      loggedIn: null,
      category: "",
      chartType: ""
    };
  }

  async componentDidMount() {
    const { data } = this.props;
    let compiledData = {};
    compiledData["confirmed"] = await fetchData(data.confirmed)
    compiledData["forecast"] = await fetchData(data.forecast)
    compiledData["aggregate"] = await fetchData(data.aggregate)
    compiledData["user_prediction"] = await fetchData(data.userPrediction)
    let logInStatus = await fetchData('/login-status/')
    this.setState({compiledData: compiledData, category: data.category, loggedIn: logInStatus['logged in'], chartType: data.chartType});
  }

  render() {
    const {compiledData, loggedIn, category, chartType} = this.state;
    if (!compiledData || loggedIn == null || category == "" || chartType == "") return "Loading..."
    return (
      <div>
        {chartType == "main" 
          ? <MainChart compiled={compiledData} loggedIn={loggedIn} category={category}/>
          : <UserPredictionChart rawData={compiledData} loggedIn={loggedIn} category={category}/>
        }
      </div>
    );
  }
}

export default ChartContainer;
