import React from 'react';

class Leaderboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: null
    }
  }

  componentDidMount() {
    fetch('/user-data').then(res => res.json()).then(data => {
      this.setState({ users: data });
      console.log(data);
    });
  }


  renderTable() {
    return this.state.users.map((user, index) => {
      // ignore null values
      if (user.mse_score == null) {
        return;
      }
      return (
         <tr>
            <td>{user.username}</td>
            <td>{user.date}</td>
            <td>{user.mse_score.toFixed(2)}</td>
         </tr>
      );
   });
  }

  render() {
    const tableStyle = {
      width: "50%",
      textAlign: "center",
      margin: "0 25%"
    };

    const { users } = this.state;
    if (!users) return 'Loading...';

    return (
      <div>
        <h2>Leaderboard</h2>
        <table style={tableStyle} className="table table-bordered table-hover table-sm">
          <thead className="thead-dark">
            <tr>
              <th>User</th>
              <th>Prediction Date</th>
              <th>Mean Squared Error (MSE)</th>
            </tr>
          </thead>
          <tbody>
            {this.renderTable()}
          </tbody>
        </table>
      </div>
    );
  }
}
  
export default Leaderboard;