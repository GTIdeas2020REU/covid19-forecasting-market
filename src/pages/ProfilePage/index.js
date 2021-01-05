import React from 'react';
import { Dropdown } from 'react-bootstrap';
import UserPredictionChartContainer from '../../containers/UserPredictionChartContainer';
import {US_INC_DEATH_USER, US_INC_CASE_USER, US_INC_HOSP_USER, titles} from '../../constants/data'
import ChartContainer from '../../containers/ChartContainer';
import './ProfilePage.css'

class ProfilePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null, 
      loginStatus: true,
      dropDownSelection: "us_daily_cases"
    }
  }

  componentDidMount() {
    /*fetch('/user').then(res => res.json()).then(data => {
      this.setState({ user: data });
    });*/
  }

  async saveLogout() {
		fetch('/logout/',{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		console.log("logged out")			
  }
  
  

	isLoggedIn = () => {
		fetch('/login-status/')
		.then((response) => response.json())
    .then((data) => this.setState({loginStatus: data}));
    
  }

  updateLoginState = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fetch('/login-status/')
        .then((response) => response.json())
        .then((data) => {
          this.setState({loginStatus: data['logged in']});
          console.log(data['logged in']);
          if (data['logged in']){
              window.alert("LogOut fail, try again")
          }
          resolve(data['logged in']);
        });
      }, 200)
    })
  }
  
  async handleLogout(event) {
    console.log("logging out button");
    event.preventDefault();
    await this.saveLogout();
    console.log(this.loginStatus)
    await this.updateLoginState();
    
  }

  onClick = (e) => {
    this.setState({dropDownSelection: e})
}

  renderUser() {
    if (!this.state.loginStatus) {
      //return <Redirect to="/" />
      
      window.location.href ='/';
    }
    let selection = this.state.dropDownSelection;
        const renderChartContainer = () => {
          if(selection == "us_daily_deaths") {
              return <ChartContainer key='123' data={US_INC_DEATH_USER}/>
          }
          else if (selection == "us_daily_cases") {
              return <ChartContainer key='321' data={US_INC_CASE_USER}/>
          }
          else if (selection == "us_daily_hosps") {
            return <ChartContainer key='312' data={US_INC_HOSP_USER}/>
        }
    }
    return (
      
      <div>
        <h3>My Predictions</h3>
        <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic">
                {titles[this.state.dropDownSelection][0]}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item eventKey="us_daily_cases" onSelect={this.onClick}>{titles["us_daily_cases"][0]}</Dropdown.Item>
              <Dropdown.Item eventKey="us_daily_deaths" onSelect={this.onClick}>{titles["us_daily_deaths"][0]}</Dropdown.Item>
              <Dropdown.Item eventKey="us_daily_hosps" onSelect={this.onClick}>{titles["us_daily_hosps"][0]}</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
        <div className="profile-chart-container">
          <div className="left"></div>
          {renderChartContainer()}
          <div className="right"></div>
        </div>
        {/* <UserPredictionChartContainer/> */}

        <form className='form-group' onSubmit={this.handleLogout.bind(this)}>
          <input type="submit" value="Logout"/>
        </form>
      </div>

        /*<div>
            <p><b>Name: </b>{ this.state.user['name'] }</p>
            <p><b>Poll score: </b>{ this.state.user['score'] }</p>
            <p><b>Country/Location: </b></p>
            <p><b>Bio: </b></p>

            <p>Edit your page:</p>
            <form action='/action' method='POST'>
            <input type="text" name="bio" placeholder="Bio..." />
            <input type="text" name="location" placeholder="Location..." />
            <button type='submit'>Create</button>
            </form>
          
        </div>*/
    );
  }

  render() {
    const { user } = this.state;
    //if (!user) return 'Loading...';

    return (
        <div>
            {this.renderUser()}
        </div>
    );
  }
}
  
export default ProfilePage;