import React from 'react';
import '../LogIn/Login.css';
import { GoogleLogin } from 'react-google-login';
import { clientId } from '../../constants/data';

class SignUp extends React.Component{
    constructor(props) {
       super(props)
      this.state = { nam:'', email: '', username: '', password: '', loginStatus: false }
    }

    saveLogin(nam, email, username, password) {
      return new Promise((resolve, reject) => {
        fetch('/signup/',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"name": nam, "email": email, "username": username, "password": password}),
        });
        resolve();
      })
    }
    
    saveGoogleLogin(username, name, email) {
      return new Promise((resolve, reject) => {
        fetch('/login/?type=google',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"username": username, "name": name, "email": email}),
        });
        resolve();
      })
    }

    handleChange(event) {
      let name = event.target.name;
      if (name === 'nam'){
        this.setState({ nam: event.target.value});
      }
      if (name === 'email'){
        this.setState({ email: event.target.value});
      }
      if (name === 'username'){
        this.setState({ username: event.target.value});
      }
      if (name === 'password'){
        this.setState({ password: event.target.value});
      }

    }

    updateLoginState = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          fetch('/login-status/')
          .then((response) => response.json())
          .then((data) => {
            this.setState({loginStatus: data['logged in']});
            if (!data['logged in']){
                window.alert("That username is already taken.")
            }
            resolve(data['logged in']);
          });
        }, 300)
      })
    }
    
    async handleSubmit(event) {
      event.preventDefault();
      await this.saveLogin(this.state.nam, this.state.email, this.state.username, this.state.password);
      await this.updateLoginState();
    }

    async onSuccess(res) {
      let name = res.profileObj.name
      let email = res.profileObj.email
      let username = email.slice(0, email.indexOf("@"));
      await this.saveGoogleLogin(username, name, email);
      await this.updateLoginState();
    };
  
    onFailure = (res) => {
      console.log("login failed")
    };
    
    render() {
      if (this.state.loginStatus) {
        //return <Redirect to="/" />
        window.location.href ='/';
      }
      return (
        <div>
          <form onSubmit={this.handleSubmit.bind(this)}>
          <h1>Sign Up</h1>
          <span className='signupSpan'><b>Name</b></span>
          <br></br>
          <input 
            type="text"
            value={this.state.nam}
            onChange={this.handleChange.bind(this)}
            name='nam'
            required
          />
          <br></br>
          <span className='signupSpan'><b>Email</b></span>
          <br></br>
          <input 
            type="text"
            value={this.state.email}
            onChange={this.handleChange.bind(this)}
            name='email'
            required
          />
          <br></br>
          <span style={{paddingRight:'280px'}}><b>Username</b></span>
          <br></br>
          <input 
            type="text"
            value={this.state.username}
            onChange={this.handleChange.bind(this)}
            name='username'
            required
          />
          <br></br>
          <span style={{paddingRight:'285px'}}><b>Password</b></span>
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
          <GoogleLogin
            clientId={clientId}
            buttonText="Sign in with Google"
            onSuccess={this.onSuccess.bind(this)}
            onFailure={this.onFailure.bind(this)}
            cookiePolicy={'single_host_origin'}
            style={{ marginTop: '100px' }}
            // isSignedIn={true}
          /> 
        </div>
      );
    }
}

export default SignUp;