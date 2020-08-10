# covid19-forecasting-market

This Aggregate COVID-19 site aims to show various past data readings of coronavirus data, as well as future predictions from various sources. Different forecasts relating to the COVID-19 pandemic are displayed, and users can make their own predictions about the future trajectory of factors relating to the pandemic such as daily deaths, hospitalizations and cases. Our mission is to deliver future projections and collected data by providing the best information on the COVID-19 pandemic.

## Getting Started

Follow these steps to get the app running locally.

### Installation

First, set up a virtualenv as it is recommended to create an isolated environment to run this app.
```
$ cd backend
$ pip install virtualenv
$ virtualenv venv
$ source venv/bin/activate
```

Once you activate the virtual environment, install the required python libraries by using:
```
$ cd backend
$ pip install -r requirements.txt
```

Then, set the FLASK_APP and FLASK_DEBUG environment variables.
```
$ cd backend
$ export FLASK_APP=app.py
$ export FLASK_ENV=development
```

Once your backend is set up, install the following packages to run React.
* npm
```
$ cd ../frontend
$ npm install
```

To run the web application,
```
$ cd ../backend
$ flask run
$ cd ../frontend
$ npm start
```

## Built With

* [Flask](https://flask.palletsprojects.com/en/1.1.x/) - Backend
* [React](https://reactjs.org/) - Frontend

## Authors

* **Jacob Abernethy** -
* **Bo Waggoner** -
* **Rafael Frongillo** -
* **Aniruddha Murali** -
* **Rachel Ombok** -
* **Gayeon (Sarah) Yoo** -