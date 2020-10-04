import React from 'react';
import './App.css';
//import '/node_modules/bootstrap/dist/css/bootstrap.min.css';
import ReactDOM from 'react-dom'
import Navbar from './components/Navbar';
import ChartContainer from './containers/ChartContainer';
// import newDeathsContainer from './containers/newDeathsContainer';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import Leaderboard from './components/Leaderboard';
// import MarketChart from './components/MarketChart';
import ProfilePage from './pages/ProfilePage';
import InteractiveChartContainer from './containers/InteractiveChartContainer';
import UserPredictionChartContainer from './containers/UserPredictionChartContainer';
import * as ROUTES from "./constants/routes";
import 'leaflet/dist/leaflet.css';
import Mapportal from './components/Mapportal';
import Login from './components/LogIn';
import SignUp from './components/SignUp';
import HomePage from './pages/HomePage';
import MainChartContainer from './components/MainChartContainer';
import {
  HashRouter as Router,
  Switch,
  Route
} from "react-router-dom";


class App extends React.Component {
  render() {
    return (
      <Router basename='/'>
        <div className="App">
          <Navbar />
          <Switch>
            {/* <Route exact path={ROUTES.US_NATIONAL_CUM} component={ChartContainer} />
            <Route exact path={ROUTES.US_NATIONAL_INC} component={newDeathsContainer} /> */}
            <Route exact path={ROUTES.LANDING} component={HomePage}/>
            <Route exact path={ROUTES.MAP_PORTAL} component={Mapportal}/>
            <Route exact path={ROUTES.LEADERBOARD} component={Leaderboard} />
            {/* <Route exact path={ROUTES.MARKET} component={MarketChart} /> */}
            <Route exact path={ROUTES.PROFILE} component={ProfilePage} />
            <Route exact path={ROUTES.SIGN_IN} component={Login} />
            <Route exact path={ROUTES.SIGN_UP} component={SignUp} />
            <Route exact path={ROUTES.ABOUT} component={AboutPage} />
            {/* <Route exact path="/temp" render={(props) => <ChartContainer compiledData={data} category="us_daily_deaths"/>}/> */}
            <Route exact path="/new-home" component={HomePage}/>
            <Route exact path="/dev" component={MainChartContainer}/>

          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
