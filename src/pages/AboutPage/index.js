import React, { Component } from 'react';
import emailjs from 'emailjs-com';
import { Form, Accordion, Card, Button, Container, Row, Col } from 'react-bootstrap';
import './About.css';

class AboutPage extends Component {

    constructor(props) {
        super(props);
        this.state= {
            name:'',
            email:'',
            message:''
        }
    }
    handleNameChange(event) {
        event.preventDefault();
        this.setState({ name: event.target.value });
    }
  
    handleEmailChange(event) {
        event.preventDefault();
        this.setState({ email: event.target.value });
    }
  
    handleMessageChange(event) {
        event.preventDefault();
        this.setState({ message: event.target.value });
    }
   
    sendEmail(e) {
        const templateParams = {
            from_name: this.state.name + " (" + this.state.email + ") ",
            to_name: 'COVIDForecasts Team',
            message: this.state.message
        };
        e.preventDefault();
        emailjs.send('service_amj28ob', 'template_5mwhleh', templateParams, 'user_2wBZ9qESfc8nrcHgF0SKm')
          .then((result) => {
              console.log(result.text);
          }, (error) => {
              console.log(error.text);
          });
         
          this.setState({
            name: '',
            email: '',
            message: '',
          });
      }
      /*
      emailjs.send("service_amj28ob","template_5mwhleh",{
from_name: "tester",
to_name: "bloop",
message: "yello",
reply_to: "question",
});
      */

    render() {
        return(
            <div class="about-container">
                <div class='about-section about'>
                    <h1>About</h1>
                    <p> 
                        This Aggregate COVID-19 site aims to show various past data readings of coronavirus data, as well as future predictions from various sources. 
                        Different forecasts relating to the COVID-19 pandemic are displayed, and users can make their own predictions about the future trajectory of 
                        factors relating to the pandemic such as daily deaths, hospitalizations and cases.
                        Our mission is to deliver future projections and collected data by providing the best information on the COVID-19 pandemic.
                    </p>
                </div>
                <div class="about-section privacy">
                    <h1>Privacy</h1>
                    <p>User-contributed forecast data is used to create aggregate forecasts and is displayed to other visitors on the "Top Forecasts" page. It may also be used, anonymized, for academic research purposes. Other than that, we do not and will not share or sell any user or visitor information for any reason.</p>
                </div>
                <div class="about-section contact">
                    <h1>Contact Us</h1>
                    <p>Complete the form below and we will get back to you as soon as possible!</p>
                    <Form className='form-contact'>
                        <Form.Group controlId="formBasicName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control 
                            value={this.state.name}
                            type="name" 
                            placeholder="Enter name" 
                            onChange={this.handleNameChange.bind(this)}
                            />
                        </Form.Group>

                        <Form.Group controlId="formBasicEmail">
                            <Form.Label>Email address</Form.Label>
                            <Form.Control 
                            value={this.state.email}
                            onChange={this.handleEmailChange.bind(this)} 
                            type="email" 
                            placeholder="Enter email" 
                            />
                        </Form.Group>

                        <Form.Group controlId="ControlTextarea1">
                            <Form.Label>Message</Form.Label>
                            <Form.Control 
                            value={this.state.message}
                            onChange={this.handleMessageChange.bind(this)} 
                            as="textarea" 
                            rows={3} 
                            />
                            <Form.Text className="text-muted">
                            We'll never share your email with anyone else.
                            </Form.Text>
                        </Form.Group>
                        <div id="contact-form-submit">
                            <Button 
                                onClick={this.sendEmail.bind(this)} 
                                bg='light' 
                                variant='dark'
                                type='submit'
                            > 
                                Submit
                            </Button>
                        </div>
                    </Form>

                </div>
                
                    <small>Created by the Aggregators Team of the <a href='http://www.covideas20reu.org/about'>COV-IDEAS 2020 REU</a></small>
            </div>
        );  
    }
}

export default AboutPage;