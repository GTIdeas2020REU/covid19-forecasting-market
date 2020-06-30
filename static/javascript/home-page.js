function collectData() {
  var data = null;
  $.ajax({
    url: '/forecasts',
    type: 'get',
    dataType: 'html',
    async: false,
    success: function(response) {
        data = $.parseJSON(response);
    } 
  });
  var orgs = Object.keys(data);
  
  var results = [];
  for (var i = 0; i < orgs.length; i++) {
    var forecast = data[orgs[i]];
    var dates = forecast.target_end_date;
    var values = forecast.value;

    var result = {};
    dates.forEach((key, i) => result[key] = values[i]);
    results.push(result);
  }

  return [results, orgs];
}


class Navbar extends React.Component {
    render() {
        return (
            <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
                <a class="navbar-brand" href="#">Navbar</a>
                <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNavAltMarkup">
                <div class="navbar-nav">
                    <a class="nav-item nav-link active" href="#">Home <span class="sr-only">(current)</span></a>
                    <a class="nav-item nav-link" href="#">About</a>
                </div>
                </div>
            </nav>
        );
    }
}


class LineChart extends React.Component {
  constructor(props) {
    super(props);
    this.chartRef = React.createRef();
  }

  componentDidMount() {
    this.myChart = new Chart(this.chartRef.current, {
      type: 'line',
      data: {
          labels: Object.keys(this.props.data),
          datasets: [{
              label: 'Estimated Cases',
              data: Object.values(this.props.data),
              backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
              ],
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              yAxes: [{
                  ticks: {
                      beginAtZero: true
                  }
              }]
          },
          title: {
            display: true,
            text: this.props.org,
            fontSize: 30
          }
      }
    });
  }

  render() {
    return <canvas ref={this.chartRef} />;
  }
}


class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: collectData()[0],
      orgs: collectData()[1]
    };
  }

  render() {
    return (
      <div>
        <Navbar/>
        <div>
          [Page content here]
        </div>
        <LineChart data={this.state.data[0]} org={this.state.orgs[0]} />
        <br></br>
        <LineChart data={this.state.data[1]} org={this.state.orgs[1]} />
        <br></br>
        <LineChart data={this.state.data[2]} org={this.state.orgs[2]} />
        <br></br>
      </div>
    )
  }
}

ReactDOM.render(
    <App />,
    document.getElementById('app')
);




