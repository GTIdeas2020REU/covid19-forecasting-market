import React from 'react';
import { useTable } from 'react-table';
import $ from 'jquery';
import ReactDOM from 'react-dom';
import { Dropdown } from 'react-bootstrap';
import LeaderboardChart from '../../components/LeaderboardChart';
import colors from '../../constants/colors';
import './Leaderboard.css'


// Create leaderboard table, consisting of user predictions and official forecasts
function Table({ columns, data, confirmed, orgs, forecasts, style }) {
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
        {<RenderOrgsTable orgs={orgs} forecasts={forecasts} confirmed={confirmed} />}
        {<RenderUsersTable users={data} confirmed={confirmed} />}
      </tbody>
    </table>
  )
}


var selectedID = ""; // var used to keep chart in place if same row was clicked
// Display user's prediction when user's row is clicked on
function createUserChart(user, confirmed, id) {
  $('tr').removeClass('clicked');
  $('#' + id).addClass('clicked');
  if (selectedID !== id) {
    $('#predictionChart div').empty(); // reset predictionChart
  }
  selectedID = id;
  ReactDOM.render(<LeaderboardChart userPrediction={user.prediction} confirmed={confirmed} />, document.getElementById('predictionChart'));
}

// Display official forecaster's prediction when its row is clicked on
function createOrgChart(org, confirmed, id) {
  var data = [];
  for (var i = 0; i < org['target_end_date'].length; i++) {
    var temp = {}
    temp['date'] = org['target_end_date'][i]
    temp['value'] = org['value'][i];
    data.push(temp);
  }
  
  $('tr').removeClass('clicked');
  $('#' + id).addClass('clicked');
  if (selectedID !== id) {
    $('#predictionChart div').empty(); // reset predictionChart
  }
  selectedID = id;
  ReactDOM.render(<LeaderboardChart userPrediction={data} confirmed={confirmed} />, document.getElementById('predictionChart'));
}


// Add rows with user data to the leaderboard table
function RenderUsersTable({ users, confirmed }) {
  return users.map((user, index) => {
    // score is always last key
    var score = Object.values(user)[Object.keys(user).length - 1];
    // ignore null MSE values
    if (score == null || typeof(score) != "number") {
      return;
    }
    return (
       <tr id={user.username + user.date} onClick={() => createUserChart(user, confirmed, user.username + user.date)}>
          <td>{user.username}</td>
          <td>{user.date}</td>
          <td>{parseFloat(score).toFixed(2)}</td>
       </tr>
    );
 });
}


// Add rows with official forecast data to the leaderboard table
function RenderOrgsTable({ orgs, forecasts, confirmed }) {
  return Object.entries(orgs).map( ([key, value]) => {
    // ignore null MSE values
    if (value == null) {
      return;
    }
    return (
      <tr id={key} style={{backgroundColor: colors[key]}} onClick={() => createOrgChart(forecasts[key], confirmed, key)}>
          <td>{key}*</td>
          <td>Ongoing</td>
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
      predictionLength: 1,
      dropDownTitle: 'overall'
    }
  }

  componentDidMount() {
    fetch('/user-data-overall').then(res => res.json()).then(data => {
      this.setState({ users: data });
    });
    fetch('/us-mse-overall').then(res => res.json()).then(data => {
      this.setState({ orgs: data });
    });

    this.setState({ columns: [
        {
          Header: 'Username/Official Forecaster',
          accesor: 'username',
        },
        {
          Header: 'Prediction Date/Status',
          accesor: 'date',
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

  }


  componentDidUpdate(prevProps, prevState) {
    // Table should sort by error when MSE header is clicked on
    $('#Score').click(function() {
      if (this.asc === undefined) {
          this.asc = true;
      }
      var table = $(this).parents('table').eq(0)
      var rows = table.find('tr:gt(0)').toArray().sort(comparer($(this).index()))
      this.asc = !this.asc
    
      if (!this.asc){
          rows = rows.reverse()
      }
      for (var i = 0; i < rows.length; i++) {
          table.append(rows[i])
      }
    })
    function comparer(index) {
        return function(a, b) {
            var valA = getCellValue(a, index), valB = getCellValue(b, index)
            return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
        }
    }
    function getCellValue(row, index){ 
        return $(row).children('td').eq(index).text() 
    }

    // Trigger click events to get orgs and users sorted together
    $('#Score').trigger("click");
    $('#Score').trigger("click");
    if (document.querySelector('#Score')) {
      document.querySelector('#Score').addEventListener("mousemove", function mouseOver(event) {
        let hoverText = document.querySelector(".score-hover");
        console.log(event.clientX);
        document.querySelector(".score-hover").style.left = `${event.clientX + 15}px`;
        document.querySelector(".score-hover").style.top = `${event.clientY -250}px`;
        document.querySelector(".score-hover").style.display = "block";
      })
      document.querySelector('#Score').addEventListener("mouseout", function mouseOut() {
        console.log("mouseout");
        document.querySelector(".score-hover").style.display = "none";
      })
    }
  }

  handleSelect = (e) => {
    this.setState({dropDownTitle: e});
    fetch('/user-data-' + e).then(res => res.json()).then(data => {
      this.setState({ users: data });
    });
    fetch('/us-mse-' + e).then(res => res.json()).then(data => {
      this.setState({ orgs: data });
      console.log(data);
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
      left: "50%",
      top: "30%"
    };

    $("#delete-btn").remove();

    const { users, columns, confirmed, orgs, forecasts } = this.state;
    if (!users || !columns || !confirmed || !orgs || !forecasts) return 'Loading...';
    //var dropdownTitle = this.state.predictionLength <= 1 ? ' week ahead' : 'weeks ahead'

    return (
      <div>
        <br></br>
        <h2 style={{marginBottom: 0}}>Top Forecasts</h2>
        <small>* indicates an official forecaster as labelled by the CDC</small>
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
        <div className="main">
          <div className="table">
            <Table id="leaderboard" columns={columns} data={users} confirmed={confirmed} orgs={orgs} forecasts={forecasts}  />
            {/* style={tableStyle} */}
            <div className="score-hover">Mean Squared Error</div>
          </div>
          <div className="chart">
            <div id="predictionChart" className="text-center" style={chartStyle}>Click on a row to display a user's prediction!</div>
          </div>
        </div>
      
      </div>
    );
  }
}


export default Leaderboard;