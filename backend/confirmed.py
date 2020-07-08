import pandas as pd
import json
import requests
from datetime import date, datetime, timedelta

#return dataframe containing confirmed data for US
def get_us_data():
    df = pd.read_csv('https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv')
    df = df[df['location'] == 'United States']
    return df

def get_us_new_deaths():
    df = get_us_data()
    df = df[['date', 'new_deaths']]
    df.reset_index(drop=True, inplace=True)
    return json.dumps(pd.Series(df.new_deaths.values,index=df.date).to_dict())

# get confirmed cumulative deaths in the us
def get_us_confirmed():
    df = pd.read_csv("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv")
    df = df.loc[df['Country/Region'] == 'US']
    df = df.drop(['Province/State', 'Country/Region', 'Lat', 'Long'], axis=1)
    df.reset_index(drop=True, inplace=True)
    cases_dict = dict()
    for col in df.columns:
        d = datetime.strptime(col, "%m/%d/%y")
        d = d.strftime("%Y-%m-%d")
        cases_dict[d] = str(df.at[0, col])
    return json.dumps(cases_dict)
