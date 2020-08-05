import React, { Component } from 'react';
import { useHistory } from "react-router-dom";
import ReactDOM from 'react-dom';
import './Login.css';
import { Redirect } from "react-router";


class Login extends React.Component{
    constructor(props) {
        super(props)
        this.state = { username: '', password: '', loggedinstate: '', loginStatus: false }
      }  
      
      componentDidMount(){
        //this.isLoggedIn();
        
      }

    saveLogin(username, password) {
      return new Promise((resolve, reject) => {
        fetch('/login/',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"username": username, "password": password}),
        });
        resolve();
      })
        
    }

    wasSucess = () => {
      return new Promise((resolve, reject) => {
        fetch('/login/',{ method: 'GET'})
        .then((response) => response.json())
        .then((data) => {
          console.log(data)
          this.setState({loginStatus: data['status']})
          resolve(data);
        });
      })
  }
    

  updateLoginState = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        fetch('/login-status/')
        .then((response) => response.json())
        .then((data) => {
          this.setState({loginStatus: data['logged in']});
          console.log(data['logged in']);
          resolve(data['logged in']);
        });
      }, 200)
    })
		
}

    handleChange(event) {
      let name = event.target.name;
      if (name == 'username'){
        this.setState({ username: event.target.value})
      }
      if (name == 'password'){
        this.setState({ password: event.target.value})
      }
  
    }
    
    async handleSubmit(event) {
      console.log("submitting")
        event.preventDefault()
        await this.saveLogin(this.state.username, this.state.password)
        /*await this.wasSucess().then(status => {
          console.log(status);
        });*/
        await this.updateLoginState();
      }



    
      render() {
        if (this.state.loginStatus) {
          //return <Redirect to="/" />
          window.location.href ='/'
        }
        return (
          <form onSubmit={this.handleSubmit.bind(this)} className='form-group'>
            <h1>Sign In</h1>
            <label className='spanStyle'><b>Username</b></label>
            <br></br>
            <input
              type="text"
              value={this.state.username}
              onChange={this.handleChange.bind(this)}
              name='username'
            /><br></br>
            <span className='spanStyle'><b>Password</b></span>
            <br></br>
            <input
              type="password"
              value={this.state.password}
              onChange={this.handleChange.bind(this)}
              name='password'
              required
            />
            <br></br>
            
            <input type="submit" value="Submit" />
          </form>
        )
      }
}

export default Login;