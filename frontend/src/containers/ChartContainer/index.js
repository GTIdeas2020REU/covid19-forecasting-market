import React from 'react';
import ParentChart from '../../components/ParentChart';
import MainChart from '../../components/MainChart';
import { cleanForecastData, organizeData } from '../../utils/data';
import { Spinner } from 'react-bootstrap';

class ChartContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      compiledData: null,
      length: 0,
      loggedIn: null,
      category: ""
    };
  }

  async componentDidMount() {
    const {compiledData, category} = this.props;
    let allData = {}
    this.setState({compiledData: allData, category: category})
    compiledData.map(async function(d) {
      const name = d.name;
      const data = d.data;
      fetch(data).then(res => res.json()).then(data => {
        if (name === "forecast") {
          data = cleanForecastData(data)
        }
        allData[name] = data;
        this.setState(prevState => {
          return {length: prevState.length + 1}
        })
      });
    }.bind(this))

    fetch('/login-status/').then(res => res.json()).then(data => {
      this.setState({ loggedIn: data['logged in'] });
    });
  }

  async fetchData(dataList) {
    let allData = {}
    dataList.map(async function(d){
      const data = await fetch(d.data);
      let jsonData = await data.json();
      if (d.name === "forecast") {
        jsonData = cleanForecastData(jsonData)
      }
      allData[d.name] = data
    })
    return allData;
  }

  render() {
    // const { forecast, orgs, userPrediction, confirmed, confirmedAvg, aggregate, loggedIn } = this.state;
    // if (!forecast || !orgs || !userPrediction || !confirmed || !aggregate || !loggedIn) return 'Loading...';
    const {compiledData, length, loggedIn, category} = this.state;

    if (!compiledData || length !== 5 || loggedIn == null) return "Loading..."

    return (
      <MainChart compiled={compiledData} loggedIn={loggedIn} category={category}/>
    );
  }
}

export default ChartContainer;
