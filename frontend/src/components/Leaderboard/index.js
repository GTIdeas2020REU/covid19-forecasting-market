import React from 'react';
import { useTable } from 'react-table';
import $ from 'jquery';
import ReactDOM from 'react-dom';
import LeaderboardChart from '../LeaderboardChart';

function Table({ columns, data, confirmed, style }) {
  // Use the state and functions returned from useTable to build UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
    confirmed,
    style
  });

  console.log(data);

  // Render the UI for table
  return (
    <table style={style} className="table table-bordered table-hover table-sm" {...getTableProps()}>
      <thead className="thead-dark">
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {<RenderTable users={data} confirmed={confirmed} />}
      </tbody>
    </table>
  )
}

function createChart(user, confirmed) {
  ReactDOM.render(<LeaderboardChart userPrediction={user.prediction} confirmed={confirmed} />, document.getElementById('predictionChart'));
}

function RenderTable({ users, confirmed }) {
  return users.map((user, index) => {
    // ignore null values
    if (user.mse_score == null) {
      return;
    }
    return (
       <tr onClick={() => createChart(user, confirmed)}>
          <td>{user.username}</td>
          <td>{user.date}</td>
          <td>{user.mse_score.toFixed(2)}</td>
       </tr>
    );
 });
}


class Leaderboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: null,
      columns: null,
      confirmed: null
    }
  }

  componentDidMount() {
    fetch('/user-data').then(res => res.json()).then(data => {
      this.setState({ users: data });
      //console.log(data);
    });

    this.setState({ columns: [
        {
          Header: 'Username',
          accesor: 'username',
        },
        {
          Header: 'Prediction Date',
          accesor: 'date',
        },
        {
          Header: 'MSE',
          accesor: 'mse_score',
        }
      ]
    });

    fetch('/us-inc-deaths-confirmed-wk-avg').then(res => res.json()).then(data => {
      this.setState({ confirmed: data });
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
      overflowY: "scroll"
    };

    
    const chartStyle = {
      position: "fixed",
      width: "50%",
      left: "50%"
    };

    const { users, columns, confirmed } = this.state;
    if (!users || !columns || !confirmed) return 'Loading...';

    return (
      <div>
        <h2>Leaderboard</h2>
        <div className="d-flex flex-row">>
          <Table id="leaderboard" columns={columns} data={users} confirmed={confirmed} style={tableStyle} />
          <div id="predictionChart" className="text-center" style={chartStyle}>Hello</div>
        </div>
      </div>
    );
  }
}
  
export default Leaderboard;