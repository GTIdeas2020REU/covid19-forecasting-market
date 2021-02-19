import React, { Component } from 'react';
import './LeaderboardTemp.css';
import { useTable } from 'react-table';
import $ from 'jquery';
import { tableColumns, topForecastsTableStyle, intervals } from '../../constants/data';
import colors from '../../constants/colors';
import UserPredictionChart from '../UserPredictionChart';
const style = topForecastsTableStyle;

const Table = ({ columns, data, renderUserChart, renderOrgChart, rawData }) => {
    // Use the state and functions returned from useTable to build UI
    const {
      getTableProps,
      getTableBodyProps,
      headerGroups,
    } = useTable({
      columns,
      data,
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
        <tbody {...getTableBodyProps()} className="main-body">
            {<RenderUserRows rawData={rawData} renderUserChart={renderUserChart}/>}
            {<RenderOrgRows rawData={rawData} renderOrgChart={renderOrgChart}/>}
        </tbody>
      </table>
    )
  }

const RenderUserRows = ({rawData, renderUserChart}) => {
    return rawData.allUserMSE.map(user => {
        let score = user[`mse_score_${intervals[rawData.interval]}_${rawData.category}`];
        if (!score) return;
        return (
            <tr id={user.username} onClick={() => renderUserChart(user.username)}>
                <td>{user.username}</td>
                <td>{parseFloat(score).toFixed(2)}</td>
            </tr>
        );
    })
}

const RenderOrgRows = ({rawData, renderOrgChart}) => {
    return Object.entries(rawData.allOrgMSE).map( ([key, value]) => {
        if (value == null) return;
        return (
            <tr id={key} style={{backgroundColor: colors[key], color: 'black'}} onClick={() => renderOrgChart(key)}>
                <td>{key}*</td>
                <td>{parseFloat(value).toFixed(2)}</td>
            </tr>
          );
    });
}

class LeaderboardTemp extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            rawData: null,
            selectedRow: "",
            chartRawData: null
        };
    }
    componentDidMount() {
        let { rawData } = this.props;
        this.setState({rawData})
    }
    componentDidUpdate() {
        let { rawData } = this.props;
        if (rawData !== this.state.rawData) {
            this.setState({rawData, chartRawData: null})
            this.setState({selectedRow: ""})
        }

        if ($('#Score').asc === undefined) {
            $('#Score').asc = true;
        }
        let table = $('#Score').parents('table').eq(0)
        let rows = table.find('tr:gt(0)').toArray().sort(comparer($('#Score').index()))
        $('#Score').asc = !$('#Score').asc
        
        for (let i = 0; i < rows.length; i++) {
            table.append(rows[i])
        }
    
        function comparer(index) {
            return function(a, b) {
                let valA = getCellValue(a, index), valB = getCellValue(b, index)
                return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
            }
        }
        function getCellValue(row, index){ 
            return $(row).children('td').eq(index).text() 
        }
    }

    renderUserChart = (username) => {
        const chartRawData = {"confirmed": this.state.rawData.confirmed, "user_prediction": this.state.rawData.allUserPredictions[username]};
        this.setState({selectedRow: username, chartRawData});
    }

    renderOrgChart = (org) => {
        const chartRawData = {"confirmed": this.state.rawData.confirmed, "user_prediction": this.state.rawData.allForecasts[org]};
        this.setState({selectedRow: org, chartRawData});
    }

    renderChart() {
        if (this.state.chartRawData != null) {
            return <UserPredictionChart rawData={this.state.chartRawData} loggedIn={false} category={this.state.rawData.category} />
        }
    }
    render() {
        if (this.state.rawData == null) return "bye"
        return(
            <div className="leaderboard-container">
                <div className="leaderboard-table">
                    <Table columns={tableColumns} data={this.state.rawData.allUserMSE} renderUserChart={this.renderUserChart} renderOrgChart={this.renderOrgChart} rawData={this.state.rawData} />
                </div>
                <div className="leaderboard-chart">
                    {this.state.selectedRow != "" && <h3 className="chart-username">{this.state.selectedRow}</h3> }
                    {this.state.chartRawData != null 
                    ? <UserPredictionChart rawData={this.state.chartRawData} loggedIn={false} category={this.state.rawData.category} />
                    : <div>Click on a row to display all predictions from a user!</div>}
                </div>
            </div>
        )
    }
}
export default LeaderboardTemp;