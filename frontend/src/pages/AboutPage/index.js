import React, { Component } from 'react';

const pstyle = {
    textAlign: 'left',
    marginLeft: '20px',
    fontSize: '20px'
  }

const h1style = {
    textAlign: 'left',
    marginLeft: '20px',
    fontSize: '40px'

}

class AboutPage extends Component {

    

    render() {
        return(
            <div >
        <h1 style={h1style}>About</h1>
        <h3></h3>
        <p style={pstyle}> 

            This Aggregate COVID-19 site aims to show various past data readings of coronavirus data, as well as future predictions from various sources. 
                 Different forecasts relating to the COVID-19 pandemic are displayed, and users can 
            make their own predictions about the future trajectory of factors relating to the pandemic such as daily deaths,
            hospitalizations and cases.

        
        Our mission is to deliver future projections and collected data by providing the best information on the COVID-19 pandemic.</p>
        <br></br>
        <h3 style={h1style}>How we Score</h3>
        <p></p>
        </div>
            );
        
    }
}

export default AboutPage;