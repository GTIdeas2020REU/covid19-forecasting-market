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
                <p style={pstyle}> 
                    This site aims to show various past data readings of coronavirus data, as well as future predictions from various sources. 
                    Different forecasts relating to the COVID-19 pandemic are displayed, and users can make their own predictions about the future trajectory of 
                    factors relating to the pandemic such as daily deaths, hospitalizations and cases.
                    Our mission is to deliver future projections and collected data by providing the best information on the COVID-19 pandemic.
                    <br></br><br></br>
                    With the large uncertainty about the future of the COVID-19 pandemic, prediction models can be critical planning tools for policymakers and public health officials.
                    By examining forecasts by individual users, this can help anticipate change in the upcoming months, as well as reduce uncertainty concerning the trajection of the pandemic.
                    After you are done exploring our site, we would appreciiate it if you could fill out <a href='https://docs.google.com/forms/d/e/1FAIpQLSe0-op5rJmW0aimj59Pj76cE0p9v3PQ9FtOSyHMLmfQhgo6PA/viewform?usp=sf_link'>this form</a> with any feedback or thoughts, thank you
                                for visiting COVIDforecasts.
                  
                </p>
                <br></br>
                <h1 style={h1style}>How we Score</h1>
                {/*<h3 style={h1style}>How we Score</h3>*/}
                <p style={pstyle}>
                    All of our predictions are ranked by calculuating the Mean Squared Error of each prediction model. Mean Squared Error is the average squared distance
                    between the estimated value and the exact value.
                </p>
                <br></br>
                <h1 style={h1style}>Privacy</h1>
                {/*<h3 style={h1style}>How we Score</h3>*/}
                <p style={pstyle}>User-contributed forecast data is used to create aggregate forecasts and is displayed to other visitors on the "Top Forecasts" page. It may also be used, anonymized, for academic research purposes. Other than that, we do not and will not share or sell any user or visitor information for any reason.</p>

                <br></br>
                <h1 style={h1style}><a href='https://github.com/GTIdeas2020REU/covid-19-data'>Our Sources</a></h1>
                {/*<h3 style={h1style}>How we Score</h3>*/}
                

                <small>Created by the Aggregators Team of the <a href='http://www.covideas20reu.org'>COV-IDEAS 2020 REU</a></small>
            </div>
        );  
    }
}

export default AboutPage;