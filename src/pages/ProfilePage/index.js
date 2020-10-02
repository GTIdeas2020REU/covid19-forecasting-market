import React from 'react';
import UserPredictionChartContainer from '../../containers/UserPredictionChartContainer';

class ProfilePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null
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
		window.location.href ='/';
		console.log("logged out")			
	}

	isLoggedIn = () => {
		fetch('/login-status/')
		.then((response) => response.json())
		.then((data) => this.setState({user: data}));
  }
  
  async handleLogout(event) {
    console.log("logging out");
    event.preventDefault();
    await this.saveLogout();
    
  }

  

  renderUser() {
    return (
      <div>
        <h3>My Predictions</h3>
        <UserPredictionChartContainer/>

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