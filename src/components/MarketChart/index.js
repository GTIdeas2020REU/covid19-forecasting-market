// import React from 'react';


// class MarketChart extends React.Component {
//     constructor(props) {
//         super(props);
//         this.chartRef = React.createRef();
//         this.state = {
//             data: null,
//             orgs: null,
//         };
//     }

//     componentDidMount() {
//         fetch('/total').then(res => res.json()).then(data => {
//             this.setState({data: Object.values(data), orgs: Object.keys(data)});
//             this.renderChart();
//         });
//     }

//     renderChart() {
//         var colors = {
//             'Columbia': 'rgb(172, 204, 230)',
//             'Georgia Tech': 'rgb(179, 163, 105)',
//             'UCLA': 'rgb(39, 116, 174)',
//             'IHME': 'rgb(87, 175, 85)',
//             'Youyang Gu': 'rgb(196, 129, 14)'
//         };
//         var colorArr = [];
//         for (var i = 0; i < this.state.orgs.length; i++) {
//             colorArr.push(colors[this.state.orgs[i]]);
//         }
//         var data = {
//             datasets: [{
//                 data: this.state.data,
//                 backgroundColor: colorArr,
//             }],
//             labels: this.state.orgs
//         };

//         this.myChart = new Chart(this.chartRef.current, {
//             type: 'doughnut',
//             data: data,
//             options: {
//                 responsive: true
//             }
//         })
//     }

//     render() {
//         const { data, orgs } = this.state;
//         if (!data || !orgs) return 'Loading...';

//         return (
//             <div className="chart-container" style={{position: "relative", width: "80vw", margin: "0 10%"}}>
//                 <canvas ref={this.chartRef} />
//             </div>
//         );
//     }
// }

// export default MarketChart;
