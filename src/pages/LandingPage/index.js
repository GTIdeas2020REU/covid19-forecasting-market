import React, { Component } from 'react';

class LandingPage extends Component {

    render() {
        return (
            <div>
                <div class="container landing">
                    <h1 class="logo">COVID-19 Prediction</h1>
                </div>
                <div class="landing">
                    <div class="title"> Welcome<br/>
                        <button class="button"><b><a href="#">Start</a></b></button>
                    </div>
                </div>
            </div>
        );
    }
}

export default LandingPage;