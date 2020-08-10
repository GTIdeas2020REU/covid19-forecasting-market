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

  

  renderUser() {
    return (
      <div>
        <h3>My Predictions</h3>
        <UserPredictionChartContainer/>
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