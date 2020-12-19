import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTable } from 'react-table';
import $ from 'jquery';
import ReactDOM from 'react-dom';

import LeaderboardChart from '../../components/LeaderboardChart';
import UserPredictionChart from '../../components/UserPredictionChart';
import colors from '../../constants/colors';
import './Leaderboard.css';


// Create leaderboard table, consisting of user predictions and official forecasts
function Table({ columns, data, confirmed, orgs, forecasts, interval, allUserPredictions, allOrgPredictions, style }) {
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
    orgs,
    forecasts,
    interval,
    allUserPredictions,
    allOrgPredictions,
    style
  });

  // Render the UI for table
  return (
    <table style={style} className="table table-bordered table-hover table-sm" {...getTableProps()}>
      <thead className="thead-dark">
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th id={column.render('Header')} {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {<RenderOrgsTable orgs={orgs} forecasts={forecasts} confirmed={confirmed} allOrgPredictions={allOrgPredictions} />}
        {<RenderUsersTable users={data} confirmed={confirmed} interval={interval} allUserPredictions={allUserPredictions} />}
      </tbody>
    </table>
  )
}


var selectedID = ""; // var used to keep chart in place if same row was clicked
// Display user's prediction when user's row is clicked on
function createUserChart(user, confirmed, id, allUserPredictions) {
  $('tr').removeClass('clicked');
  $("[id='" + id + "']").addClass('clicked');
  if (selectedID !== id) {
    $('#predictionChart div').empty(); // reset predictionChart
  }
  selectedID = id;
  console.log(selectedID);
  ReactDOM.render(
    <UserPredictionChart 
      forecast={null} 
      orgs={null} 
      userPrediction={allUserPredictions} 
      confirmed={confirmed} 
      aggregate={null} 
      profilePage={false} 
    />, 
    document.getElementById('predictionChart')
  );
}


// Display official forecaster's prediction when its row is clicked on
function createOrgChart(org, confirmed, id, allOrgPredictions) {
  var data = [];
  for (var i = 0; i < org['target_end_date'].length; i++) {
    var temp = {}
    temp['date'] = org['target_end_date'][i]
    temp['value'] = org['value'][i];
    data.push(temp);
  }
  
  $('tr').removeClass('clicked');
  $("[id='" + id + "']").addClass('clicked');
  if (selectedID !== id) {
    $('#predictionChart div').empty(); // reset predictionChart
  }
  selectedID = id;
  ReactDOM.render(
    <UserPredictionChart 
      forecast={null} 
      orgs={null} 
      userPrediction={allOrgPredictions} 
      confirmed={confirmed} 
      aggregate={null} 
      profilePage={false} 
    />, 
    document.getElementById('predictionChart')
  );
}


// Add rows with user data to the leaderboard table
function RenderUsersTable({ users, confirmed, interval, allUserPredictions }) {
  return users.map((user, index) => {
    var score = user["mse_score_" + interval];
    // ignore null MSE values
    if (score == null || typeof(score) != "number") {
      return;
    }
    return (
       <tr id={user.username} onClick={() => createUserChart(user, confirmed, user.username, allUserPredictions[user.username])}>
          <td>{user.username}</td>
          <td>{parseFloat(score).toFixed(2)}</td>
       </tr>
    );
 });
}


// Add rows with official forecast data to the leaderboard table
function RenderOrgsTable({ orgs, forecasts, confirmed, allOrgPredictions }) {
  return Object.entries(orgs).map( ([key, value]) => {
    // ignore null MSE values
    if (value == null) {
      return;
    }
    return (
      <tr id={key} style={{backgroundColor: colors[key], color: 'black'}} onClick={() => createOrgChart(forecasts[key], confirmed, key, allOrgPredictions[key])}>
          <td>{key}*</td>
          <td>{parseFloat(value).toFixed(2)}</td>
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
      confirmed: null,
      orgs: null,
      forecasts: null,
      interval: 'overall',
      predictionLength: 1,
      dropDownTitle: 'overall',
      aggregate: null,
      allUserPredictions: null,
      allOrgPredictions: null
    }
  }

  componentDidMount() {
    fetch('/user-data').then(res => res.json()).then(data => {
      this.setState({ users: data });
    });
    fetch('/us-mse-overall').then(res => res.json()).then(data => {
      this.setState({ orgs: data });
    });
    fetch('/all-user-prediction?category=us_daily_deaths').then(res => res.json()).then(data => {
      this.setState({ allUserPredictions: data });
    });
    fetch('/all-org-prediction').then(res => res.json()).then(data => {
      this.setState({ allOrgPredictions: data });
    });

    this.setState({ columns: [
        {
          Header: 'Username/Official Forecaster',
          accesor: 'username',
        },
        {
          Header: 'Score',
          accesor: 'mse_score',
        }
      ]
    });

    fetch('/us-inc-deaths-confirmed-wk-avg').then(res => res.json()).then(data => {
      this.setState({ confirmed: data });
    });

    fetch('/us-inc-deaths-forecasts').then(res => res.json()).then(data => {
      this.setState({ forecasts: data });
    });

    fetch('/us-agg-inc-deaths').then(res => res.json()).then(data => {
      this.setState({ aggregate: data });
    });
  }


  componentDidUpdate(prevProps, prevState) {
    // Table should sort by error
    if ($('#Score').asc === undefined) {
        $('#Score').asc = true;
    }
    var table = $('#Score').parents('table').eq(0)
    var rows = table.find('tr:gt(0)').toArray().sort(comparer($('#Score').index()))
    $('#Score').asc = !$('#Score').asc
    
    for (var i = 0; i < rows.length; i++) {
        table.append(rows[i])
    }

    function comparer(index) {
        return function(a, b) {
            var valA = getCellValue(a, index), valB = getCellValue(b, index)
            return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
        }
    }
    function getCellValue(row, index){ 
        return $(row).children('td').eq(index).text() 
    }
  }

  handleSelect = (e) => {
    this.setState({dropDownTitle: e});
    const score_map = {'overall': 'overall', '1-week-ahead': '1', '2-week-ahead': '2', '4-week-ahead': '4', '8-week-ahead': '8'};
    this.setState({interval: score_map[e]});
    fetch('/us-mse-' + e).then(res => res.json()).then(data => {
      this.setState({ orgs: data });
    });
  }


  render() {
    const tableStyle = {
      width: "48%",
      textAlign: "center",
      overflowY: "scroll",
      marginLeft: "12px"
    };
    
    var chartStyle = {
      position: "fixed",
      width: "50%",
      left: "50%",
      marginLeft: "10px",
    };

    //$("#delete-btn").remove();

    const { users, columns, confirmed, orgs, forecasts, interval, allUserPredictions, allOrgPredictions } = this.state;
    if (!users || !columns || !confirmed || !orgs || !forecasts || !allUserPredictions || !allOrgPredictions) return 'Loading...';

    return (
      <div>
        <br></br>
        <h2 style={{marginBottom: 0}}>Top Forecasts</h2>
        <small>* indicates an official forecaster as labelled by the CDC</small>
        <br></br>
        <div>
          <div className="main-instruction">
            <p>
              <b>
                The Top Forecasts page showcases the best predictions by all users of the site, ranked using our own scoring scheme. Each 
                row on the chart shows a user or University source along with a calculated score. 
               </b>
             </p>
            <p>Click on a row to view all predictions from a user. Hover over the prediction chart to see the exact values of the user's prediction.</p>
            </div>
          </div>

        <div>
          <Dropdown onSelect={this.handleSelect}>
            <Dropdown.Toggle variant="success" id="dropdown-basic">
              {this.state.dropDownTitle}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item eventKey="overall">overall</Dropdown.Item>
              <Dropdown.Item eventKey="1-week-ahead">1-week-ahead</Dropdown.Item>
              <Dropdown.Item eventKey="2-week-ahead">2-week-ahead</Dropdown.Item>
              <Dropdown.Item eventKey="4-week-ahead">4-week-ahead</Dropdown.Item>
              <Dropdown.Item eventKey="8-week-ahead">8-week-ahead</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          <br></br>
        </div>

        <div className="d-flex flex-row">
          <Table id="leaderboard" 
            columns={columns} 
            data={users} 
            confirmed={confirmed} 
            orgs={orgs} 
            forecasts={forecasts} 
            interval={interval} 
            allUserPredictions={allUserPredictions} 
            allOrgPredictions={allOrgPredictions}
            style={tableStyle} />
          <div id="predictionChart" className="text-center" style={chartStyle}><br></br>Click on a row to display all predictions from a user!</div>
        </div>
      </div>
    );
  }
}


export default Leaderboard;