import pandas as pd
from sklearn.metrics import mean_squared_error
import json
import requests
from datetime import date, datetime, timedelta


# Get forecast data for all models as linked in model-links.csv
def get_forecasts():
    file = open('backend/orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('backend/model-links.csv', 'r')
    models = dict()
    for line in file:
        df = pd.read_csv(line.strip())
        df = df.loc[df['location'] == 'US']
        df = df.loc[df['type'] == 'point']
        df = df.loc[df['target'].str.contains("cum death")]
        df = df.sort_values(by=['forecast_date', 'target_end_date'])
        df = df[['target_end_date', 'value']]
        df = df.drop_duplicates()
        JSON = df.to_json()
        models[orgs.pop()] = df.to_dict('list')
    return models


# Get forecast data for all models as linked in model-links.csv
def get_daily_forecasts(event):
    file = open('backend/orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('backend/model-links.csv', 'r')
    models = dict()
    for line in file:
        df = pd.read_csv(line.strip())
        df = df.loc[(df['location'] == 'US') & (df['target'].str.contains(event))]
        if len(df) == 0:
            orgs.pop()
            continue
        df.value = df.value.astype('float')
        df['value'] = df['value'].div(7)
        df = df.sort_values(by=['forecast_date', 'target_end_date'])
        df = df[['forecast_date', 'target_end_date', 'value']]
        df = df.drop_duplicates(subset=['target_end_date'], keep='last')
        models[orgs.pop()] = df.to_dict('list')
    return models


def get_all_forecasts(event):
    file = open('backend/orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('backend/model-links.csv', 'r')
    all_forecasts = dict()
    for line in file:
        df = pd.read_csv(line.strip())
        df = df.loc[(df['location'] == 'US') & (df['target'].str.contains(event))]
        if len(df) == 0:
            orgs.pop()
            continue
        df = df.groupby('forecast_date')
        model = orgs.pop()
        all_forecasts[model] = {}
        for date, group in df:
            group = group[['target_end_date', 'value', 'forecast_date']]
            group = group.sort_values(by=['target_end_date'])
            data = []
            # Each prediction made on a day
            for i in range(len(group)):
                temp = {}
                temp['date'] = group['target_end_date'].iloc[i]
                temp['forecast_date'] = group['forecast_date'].iloc[i]
                if event != "inc hosp":
                    temp['value'] = float(group['value'].iloc[i])/7
                else:
                    temp['value'] = float(group['value'].iloc[i])
                temp['defined'] = True
                data.append(temp)
            all_forecasts[model][date] = data
        #print(all_forecasts)
    return all_forecasts


def get_daily_forecasts_cases():
    file = open('backend/orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('backend/model-links.csv', 'r')
    models = dict()
    for line in file:
        df = pd.read_csv(line.strip())

        df = df.loc[(df['location'] == 'US') & (df['target'].str.contains("inc case"))]
        df.value = df.value.astype('float')
        df['value'] = df['value'].div(7)
        df = df.sort_values(by=['forecast_date', 'target_end_date'])
        df = df[['forecast_date', 'target_end_date', 'value']]
        df = df.drop_duplicates(subset=['target_end_date'], keep='last')
        models[orgs.pop()] = df.to_dict('list')
    return models


def get_daily_forecasts_hosps():
    file = open('backend/orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('backend/model-links.csv', 'r')
    models = dict()
    for line in file:
        df = pd.read_csv(line.strip())

        df = df.loc[(df['location'] == 'US') & (df['target'].str.contains("inc hosp"))]
        df.value = df.value.astype('float')
        df = df.sort_values(by=['forecast_date', 'target_end_date'])
        df = df[['forecast_date', 'target_end_date', 'value']]
        df = df.drop_duplicates(subset=['target_end_date'], keep='last')
        models[orgs.pop()] = df.to_dict('list')
    return models


# Get aggregate data (average of all forecasts including user prediction)
def get_aggregates(forecast_data, user_prediction):
    aggregate_json = dict()
    forecast_json = forecast_data

    for org in forecast_json.keys():
        data = forecast_json[org]
        dates = data['target_end_date']
        values = data['value']
        for i in range(len(dates)):
            if dates[i] not in aggregate_json:
                aggregate_json[dates[i]] = [values[i]]
            else:
                aggregate_json[dates[i]].append(values[i])

    if len(user_prediction) > 0:
        '''for key in user_prediction.keys():
            #print(key)
            user_prediction[key] = [d for d in user_prediction[key] if d['defined'] is True]'''
        #print(user_prediction)
        pred_date = list(user_prediction.keys())[-1]
        preds = user_prediction[pred_date]
        for i in range(len(preds)):
            T_index = preds[i]['date'].index('T')
            date = preds[i]['date'][:T_index]
            value = preds[i]['value']
            if date not in aggregate_json:
                #aggregate_json[date] = [value]
                continue
            else:
                aggregate_json[date].append(value)

    dates_removed = []
    for date in aggregate_json:
        if aggregate_json[date] == [0]:
            dates_removed.append(date)
            continue
        aggregate_json[date] = sum(aggregate_json[date])/len(aggregate_json[date])

    # Any dates without an actual forecast value are removed
    for date in dates_removed:
        del aggregate_json[date]
    return aggregate_json

def filter_undefined(prediction):
    #print(prediction)
    return prediction['defined'] is True

#pass in the df containing confirmed and predicted values
def get_mse(model_df):
    confirmed = model_df['confirmed']
    predicted = model_df['value']
    return mean_squared_error(confirmed, predicted)

def get_accuracy_for_all_models():
    errors = []
    start_date = '2020-05-02'
    end_date = '2020-06-01'
    #end_date = str(date.today() - timedelta(days=2)) #2 days prior
    confirmed = get_daily_confirmed_df(start_date, end_date)
    data = requests.get('http://localhost:5000/forecasts').json()
    for model in data:
        #print(model)
        df = pd.DataFrame.from_records(data[model])
        df = df[df['target_end_date'] >= start_date]
        df = df[df['target_end_date'] <= end_date]
        #df = df[df['target_end_date'] <= str(date.today() - timedelta(days=2))]
        ls = []
        for index, row in df.iterrows():
            #fetch date from df and convert to date object
            d = datetime.strptime(row['target_end_date'], '%Y-%m-%d').date()
            #fetch confirmed cases for date d
            num_c = confirmed[confirmed['date'] == d]['confirmed']
            ls.append(num_c.item())
            #list.append(get_daily_confirmed(d))
        df['confirmed'] = ls
        error = get_mse(df)
        #print(error)
        errors.append({'model': model, 'error':error})
    return json.dumps(errors)


# date format: y-m-d string, ex)06-28-2020
# return a dataframe containing confirmed cases from start_date to end_date (inclusive)
def get_daily_confirmed_df(start_date, end_date):
    dates = []
    confirmed = []
    curr_d = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_d = datetime.strptime(end_date, '%Y-%m-%d').date()
    while curr_d <= end_d:
        #!!!should the date be a string?
        dates.append(curr_d)
        num_confirmed = get_daily_confirmed(curr_d)
        confirmed.append(num_confirmed)
        curr_d += timedelta(days=1)
    temp = {'date': dates, 'confirmed': confirmed}
    return pd.DataFrame(temp)


# pass in date object not string
def get_daily_confirmed(d):
    #convert date object to string in m-d-y format
    d = d.strftime('%m-%d-%Y')
    github_dir_path = 'https://github.com/CSSEGISandData/COVID-19/raw/master/csse_covid_19_data/csse_covid_19_daily_reports_us/'
    file_path = github_dir_path + d + '.csv'
    data = pd.read_csv(file_path)
    return data['Confirmed'].sum()
    # catch error!!


def get_new_cases_us():
    path = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/jhu/new_cases.csv'
    df = pd.read_csv(path).fillna(0)
    df = df[['date', 'United States']]
    df = df.set_index('date')
    return df.to_dict()['United States']

def clean_forecast_data(forecast):
    orgs = forecast.keys()
    forecast_cleaned = []
    for org in orgs:
        data_raw = forecast[org]
        dates = data_raw.get('target_end_date')
        values = data_raw.get('value')
        data_cleaned = {}
        for i, date in enumerate(dates):
            data_cleaned[date] = values[i]
        forecast_cleaned.append({'name': org, 'data': data_cleaned})
    return forecast_cleaned