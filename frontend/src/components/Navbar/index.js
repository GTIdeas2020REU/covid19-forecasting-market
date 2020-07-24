import React from 'react';

class Navbar extends React.Component {
 

  render() {
    return (
     <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
       <a className="navbar-brand" href="#">Navbar</a>
       <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
         <span className="navbar-toggler-icon"></span>
       </button>
       <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
       <div className="navbar-nav">
         <a className="nav-item nav-link active" href="#">Home <span className="sr-only">(current)</span></a>
         <a className="nav-item nav-link" href="/about">About</a>
         <a className="nav-item nav-link" href="/signin">Sign in/Sign Up</a>
         <a className="nav-item nav-link" href="/profile">My Profile</a>
         <a className="nav-item nav-link" href="/leaderboard">Top Forecasts</a>
        
       </div>
       </div>
     </nav>
    );
  }
}

export default Navbar;
