import React from 'react';
import './SignUp.css';
import { GoogleLogin } from 'react-google-login';
import { clientId } from '../../constants/data';
import { fetchData, requestOptions } from '../../utils/data';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEyeSlash, faEye } from '@fortawesome/free-solid-svg-icons'

class SignUp extends React.Component{
    constructor(props) {
       super(props)
      this.state = { 
        name:'', 
        email: '', 
        username: '', 
        password: '', 
        loginStatus: false,
        showPassword: "password",
        icon: faEye
      }
    }

    saveLogin(name, email, username, password) {
      return new Promise((resolve, reject) => {
        fetch('/signup/',requestOptions({"name": name, "email": email, "username": username, "password": password}));
        resolve();
      })
    }

    // {"name": name, "email": email, "username": username, "password": password}
    saveGoogleLogin(username, name, email) {
      return new Promise((resolve, reject) => {
        fetch('/login/?type=google', requestOptions({"username": username, "name": name, "email": email}));
        resolve();
      })
    }

    handleChange(event) {
      let name = event.target.name;
      if (name === 'name'){
        this.setState({ name: event.target.value});
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
      await this.saveLogin(this.state.name, this.state.email, this.state.username, this.state.password);
      await this.updateLoginState();
    }

    async validateToken(token) {
      console.log('validating token...')
      let data = await fetch("/token", requestOptions({"token": token}))
      let response = await data.json();
      if(response['valid']) {
        const name = response['name'];
        const email = response['email'];
        let username = "";
        if (email.includes("@")) {
          console.log("valid email")
          username = email.split("@")[0]
        }
        this.setState({name, email, username});
        console.log('token validated')
      }
      console.log('validation complete')
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

    async fetchTempLogin() {
      const accountInfo = await fetchData('/special-login');
      this.setState({username: accountInfo["username"], password: accountInfo["password"]});
    }
    
    componentDidMount() {
      if (this.props.special) {
        this.validateToken(this.props.match.params.token)
        // this.fetchTempLogin();
      }
      else {console.log('no token')}
    }

    togglePassword() {
      if (this.state.showPassword == "password") {
        this.setState({showPassword: "text", icon: faEyeSlash})
      } else {
        this.setState({showPassword: "password", icon: faEye})
      }
    }
    
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
            value={this.state.name}
            onChange={this.handleChange.bind(this)}
            name='name'
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
          <div className="password-container">
            <input 
              id="password-input"
              type={this.state.showPassword}
              value={this.state.password}
              onChange={this.handleChange.bind(this)}
              name='password'
              required
            />
            <FontAwesomeIcon onClick={this.togglePassword.bind(this)} id="eye-icon" icon={this.state.icon} />
          </div>
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