import { fetchData } from "../utils/data";

export const titles = {
    "us_daily_cases": ["US Daily Reported Cases", "Daily Reported Cases in the US"],
    "us_daily_deaths": ["US Daily Deaths", "Daily Deaths in the US"],
    "us_daily_hosps": ["US Daily COVID-19 Hopitalizations", "Daily COVID-19 Hospitalizations in the US"]
}

export const forecastIdentifiers = {
    'Columbia University': 'columbia',
    'Georgia Tech': 'georgia-tech',
    'UCLA': 'ucla',
    'IHME': 'ihme',
    'Youyang Gu': 'youyang-gu',
    'LANL': 'lanl',
    'University of Michigan': 'umich',
    'USC': 'usc',
    'University of Texas': "utexas",
    'University of Virginia': 'uva',
    'MIT': 'mit'
}

export const intervals = {
    'overall': 'overall', 
    '1-week-ahead': '1', 
    '2-week-ahead': '2', 
    '4-week-ahead': '4', 
    '8-week-ahead': '8'
};

export const clientId =
  '402236147588-0nqb97ecrkeo6hulb2f1t2886lqj5b9i.apps.googleusercontent.com';

export class Data {
    constructor(category, chartType, interval="overall") {
        this.category = category;
        this.interval = interval
        this.chartType = chartType;
        this.confirmed = `/confirmed-wk-avg?category=${category}`;
        this.forecast = `/forecast-cleaned?category=${category}`;
        this.aggregate = `/aggregate?category=${category}`;
        this.userPrediction = `/user-prediction?category=${category}`;
        this.orgMSE = `/us-mse-${interval}?category=${category}`;
        this.userMSE = "/user-data";
        this.allForecasts = `/all-org-prediction?category=${category}`
        this.allUserPredictions = `/all-user-prediction?category=${category}`
    }
    update(category, interval) {
        category = category === "" ? this.category : category;
        interval = interval === "" ? this.interval : interval;
        this.interval = interval;
        this.category = category;
        this.confirmed = `/confirmed-wk-avg?category=${category}`;
        this.forecast = `/forecast-cleaned?category=${category}`;
        this.aggregate = `/aggregate?category=${category}`;
        this.userPrediction = `/user-prediction?category=${category}`;
        this.orgMSE = `/us-mse-${interval}?category=${category}`;
        this.allForecasts = `/all-org-prediction?category=${category}`
        this.allUserPredictions = `/all-user-prediction?category=${category}`
    }
}

export class RawData {
    constructor(category, interval, chartType, endPoints) {
        this.category = category;
        this.interval = interval;
        this.chartType = chartType;
        this.endPoints = endPoints;
        this.confirmed = null;
        this.allUserMSE = null;
        this.allOrgMSE = null;
        this.allForecasts = null;
        this.allUserPredictions = null;
    }
    async fetchRawData() {
        this.confirmed = await fetchData(this.endPoints.confirmed);
        this.allUserMSE = await fetchData(this.endPoints.userMSE);
        this.allOrgMSE = await fetchData(this.endPoints.orgMSE);
        this.allForecasts = await fetchData(this.endPoints.allForecasts);
        this.allUserPredictions = await fetchData(this.endPoints.allUserPredictions);
    }
}

export const US_INC_DEATH_MAIN = new Data("us_daily_deaths", "main");
export const US_INC_CASE_MAIN = new Data("us_daily_cases", "main");
export const US_INC_HOSP_MAIN = new Data("us_daily_hosps", "main");
export const US_INC_DEATH_USER = new Data("us_daily_deaths", "user");
export const US_INC_CASE_USER = new Data("us_daily_cases", "user");
export const US_INC_HOSP_USER = new Data("us_daily_hosps", "user");


export const tableColumns = [
    {
      Header: 'Username/Official Forecaster',
      accesor: 'username',
    },
    {
      Header: 'Score',
      accesor: 'mse_score',
    }
];

export const topForecastsTableStyle = {
    width: "100%",
    textAlign: "center",
    overflowY: "scroll",
    // margin: "0 1rem 0 1rem"
  };
  
export const chartStyle = {
    position: "fixed",
    width: "50%",
    left: "50%",
    marginLeft: "10px",
};