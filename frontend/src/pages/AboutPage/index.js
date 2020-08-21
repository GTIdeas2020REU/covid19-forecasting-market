import React, { Component } from 'react';

const pstyle = {
    textAlign: 'left',
    marginLeft: '20px',
    fontSize: '20px',
     paddingLeft: '100px',
     paddingRight: '100px'
}

const h1style = {
    textAlign: 'left',
    marginLeft: '20px',
    fontSize: '40px',
    paddingLeft: '100px',
     paddingRight: '100px'
}

class AboutPage extends Component {
    render() {
        return(
            <div>
                <br></br>
                <h1 style={h1style}>About</h1>
                <h3></h3>
                <p style={pstyle}> 
                    This Aggregate COVID-19 site aims to show various past data readings of coronavirus data, as well as future predictions from various sources. 
                    Different forecasts relating to the COVID-19 pandemic are displayed, and users can make their own predictions about the future trajectory of 
                    factors relating to the pandemic such as daily deaths, hospitalizations and cases.
                    Our mission is to deliver future projections and collected data by providing the best information on the COVID-19 pandemic.
                </p>
                <br></br>
                <h1 style={h1style}>Privacy</h1>
                <p style={pstyle}>User-contributed forecast data is used to create aggregate forecasts and is displayed to other visitors on the "Top Forecasts" page. It may also be used, anonymized, for academic research purposes. Other than that, we do not and will not share or sell any user or visitor information for any reason.</p>

                 <small>Created by the Aggregators Team of the <a href='http://www.covideas20reu.org/about'>COV-IDEAS 2020 REU</a></small>
               
            </div>
        );  
    }
}

export default AboutPage;