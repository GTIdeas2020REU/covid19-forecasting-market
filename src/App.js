import React from 'react';
import {
  HashRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import 'leaflet/dist/leaflet.css';

import './App.css';
import * as ROUTES from "./constants/routes";

import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import TopForecastsPage from './pages/TopForecastsPage';

import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import InteractiveChartContainer from './containers/InteractiveChartContainer';
import UserPredictionChartContainer from './containers/UserPredictionChartContainer';
import ChartContainer from './containers/ChartContainer';
// import newDeathsContainer from './containers/newDeathsContainer';
import Mapportal from './components/Mapportal';

import Login from './components/LogIn';
import SignUp from './components/SignUp';
import HomePage from './pages/HomePage';


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
            {/* <Route exact path={ROUTES.LEADERBOARD} component={LeaderboardPage} /> */}
            <Route exact path={ROUTES.LEADERBOARD} component={TopForecastsPage} />
            {/* <Route exact path={ROUTES.MARKET} component={MarketChart} /> */}
            <Route exact path={ROUTES.PROFILE} component={ProfilePage} />
            <Route exact path={ROUTES.SIGN_IN} component={Login} />
            <Route exact path={ROUTES.SIGN_UP} component={SignUp} />
            <Route exact path={ROUTES.ABOUT} component={AboutPage} />
            {/* <Route exact path="/temp" render={(props) => <ChartContainer compiledData={data} category="us_daily_deaths"/>}/> */}
            {/* <Route exact path="/new" component={TopForecastsPage}/> */}

          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
