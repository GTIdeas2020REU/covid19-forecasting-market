import React from 'react';
import './Login.css';
import { GoogleLogin } from 'react-google-login';
import { clientId } from '../../constants/data';


class Login extends React.Component{
    constructor(props) {
      super(props)
      this.state = { username: '', password: '', loggedinstate: '', loginStatus: false }
    }  
      
    componentDidMount(){
      // console.log("", this.state.loginStatus);
    }

    saveLogin(username, password) {
      return new Promise((resolve, reject) => {
        fetch('/login/?type=normal',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({"username": username, "password": password}),
        });
        resolve();
      })
    }

    saveGoogleLogin(username, name, email) {
      console.log(username, name, email)
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

    wasSucess = () => {
      return new Promise((resolve, reject) => {
        fetch('/login/',{ method: 'GET'})
        .then((response) => response.json())
        .then((data) => {
          this.setState({loginStatus: data['status']});
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
            if (!data['logged in']){
                window.alert("Wrong username and/or password")
            }
            resolve(data['logged in']);
          });
        }, 200)
      })
		}

    handleChange(event) {
      let name = event.target.name;
      if (name === 'username'){
        this.setState({ username: event.target.value});
      }
      if (name === 'password'){
        this.setState({ password: event.target.value});
      }
  
    }
    
    async handleSubmit(event) {
      event.preventDefault();
      await this.saveLogin(this.state.username, this.state.password);
      /*await this.wasSucess().then(status => {
        console.log(status);
      });*/
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
      alert(
        `Failed to login.`
      );
    };

    render() {
      if (this.state.loginStatus) {
        //return <Redirect to="/" />
        window.location.href ='/';
      }
      return (
        <div>
          <form onSubmit={this.handleSubmit.bind(this)} className='form-group'>
            <h1>Sign In</h1>
            <label className='spanStyle'><b>Username</b></label>
            <br></br>
            <input
              type="text"
              value={this.state.username}
              onChange={this.handleChange.bind(this)}
              name='username'
            />
            <br></br>
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

export default Login;