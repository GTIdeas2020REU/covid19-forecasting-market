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
import AboutPage from './pages/AboutPage';
import TopForecastsPage from './pages/TopForecastsPage';

import ProfilePage from './pages/ProfilePage';
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
            <Route exact path={ROUTES.LANDING} component={HomePage}/>
            <Route exact path={ROUTES.MAP_PORTAL} component={Mapportal}/>
            <Route exact path={ROUTES.LEADERBOARD} component={TopForecastsPage} />
            <Route exact path={ROUTES.PROFILE} component={ProfilePage} />
            <Route exact path={ROUTES.SIGN_IN} component={Login} />
            <Route exact path={ROUTES.SIGN_UP} component={() => <SignUp special={false}/>}/>
            <Route exact path={ROUTES.ABOUT} component={AboutPage} />
            <Route exact path={ROUTES.SPECIAL_SIGN_IN} component={(props) => <Login {...props} special={true}/>}/>

          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
