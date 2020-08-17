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


def get_us_new_deaths_weekly_avg(data):
    daily_deaths = json.loads(data)
    dates = list(daily_deaths.keys())[::-1]
    result = dict()
    n = 1
    tempDate = ""
    tempSum = 0
    for d in dates:
        tempSum += daily_deaths[d]
        datetime_obj = date(*(int(s) for s in d.split('-')))
        '''if datetime_obj.weekday() == 5:
            tempDate = d'''
        if n == 7:
            tempDate = d
            result[tempDate] = tempSum/7
            for i in range(dates.index(tempDate), dates.index(tempDate)-7, -1):
                result[dates[i]] = tempSum/7
            n = 0
            tempSum = 0
        n += 1

    result = dict(sorted(result.items()))
    return json.dumps(result)
        
#print(get_us_new_deaths_weekly_avg(get_us_new_deaths()))

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
    return cases_dict

