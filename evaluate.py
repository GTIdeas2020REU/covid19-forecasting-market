from confirmed import get_us_new_deaths_weekly_avg, get_us_new_deaths
from get_estimates import get_daily_forecasts

import json
import time
import pymongo
from sklearn.metrics import mean_squared_error
import pandas as pd
from datetime import datetime,timedelta

def get_mse(confirmed, forecasts, interval):
    result = dict()

    for model in forecasts.keys():
        model_dates = forecasts[model]['target_end_date']
        model_values = forecasts[model]['value']

        confirmed_values = []
        prediction_values = []
        for d in model_dates:
            try:
                confirmed_values.append(confirmed[d])
                prediction_values.append(model_values[model_dates.index(d)])
            except:
                break

        if interval != 'overall':
            confirmed_values = confirmed_values[::-1][:interval]
            prediction_values = prediction_values[::-1][:interval]

        mse = mean_squared_error(confirmed_values, prediction_values)
        result[model] = mse

    return result


def org_mse(interval):
    nowdate = datetime.now().date()
    startdate = datetime(2020, 1, 25, 0, 0).date()
    totdays = (nowdate - startdate).days
    file = open('orgs.csv', 'r')
    orgs = []
    for line in file:
        orgs.append(line.strip())
    orgs = orgs[::-1]

    file = open('model-links.csv', 'r')
    checkdates = [startdate + pd.Timedelta(days=interval*j) for j in range(int(totdays/interval))
                    if startdate + pd.Timedelta(days=interval*j) <= nowdate]
    confirmed = json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths()))
    outcomes = pd.DataFrame(confirmed.items(), columns=['date', 'value'])
    outcomes = outcomes.set_index('date')
    performance = {}
    for line in file:
        df = pd.read_csv(line.strip())
        model = orgs.pop()
        relevant_preds = df[
            (df['location'] == 'US') &
            (pd.to_datetime(df['target_end_date'], format='%Y-%m-%d').isin(checkdates)) &
            (df['target'].str.contains("inc death")) &
            ((pd.to_datetime(df['target_end_date'], format='%Y-%m-%d') - pd.to_datetime(df['forecast_date'], format='%Y-%m-%d')).apply(lambda delt: delt.days) >= interval)
        ].sort_values('forecast_date').drop_duplicates('target_end_date',keep='last')
        
        # If interval is not applicable to model
        if len(relevant_preds) == 0:
            performance[model] = None
            continue
        relevant_preds['value'] /= 7
        true_results = outcomes.loc[relevant_preds['target_end_date']]
        scores = (relevant_preds['value'].to_numpy() - true_results.to_numpy())**2
        performance[model] = scores.mean()
    return performance


def get_user_mse(confirmed, user_prediction, interval):
    user_dates = []
    user_values = []
    result = dict()

    for date in list(user_prediction.keys()):
        user_pred_daily = {}
        current_pred = user_prediction[date]

        for d in current_pred:
            user_dates.append(d['date'].split('T')[0])
            user_values.append(d['value'])
            user_pred_daily[d['date'].split('T')[0]] = d['value']
        if interval != 'overall':
            user_pred_weekly = user_pred_daily
        else:
            user_pred_weekly = json.loads(get_us_new_deaths_weekly_avg(json.dumps(user_pred_daily)))

        confirmed_values = []
        prediction_values = []
        user_dates = list(user_pred_weekly.keys())
        user_values = list(user_pred_weekly.values())
        for d in user_dates:
            try:
                if d in confirmed:
                    confirmed_values.append(confirmed[d])
                    prediction_values.append(user_values[user_dates.index(d)])
            except:
                break

        if confirmed_values == []:
            continue
        mse = mean_squared_error(confirmed_values, prediction_values)
        result[date] = mse

    if result == {}:
        return None
    
    return result




'''
myClient = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
client = pymongo.MongoClient(myClient)
mydb = client['covid19-forecast']
mycol = mydb['predictions']
prediction = mycol.find({"category": "us_daily_deaths"})


totdays = 150
nowdate = datetime.now().date()
startdate = nowdate - pd.Timedelta(days=totdays)
usernames = list(prediction.distinct('username'))
confirmed = json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths()))
users = mydb['users']


for interval in [1, 2, 4, 8]:
    checkdates = [(nowdate - pd.Timedelta(days=7*interval*j)).strftime('%Y-%m-%d') for j in range(int(totdays/7*interval))
                    if nowdate - pd.Timedelta(days=7*interval*j) >= startdate]
    for user in usernames:
        predictions = mycol.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)])
        dates_to_check = checkdates.copy()
        latest_user_preds = []

        # Loop through all the user's predictions
        for pred in predictions:
            datemade = pred['date']
            # User's prediction array for a single prediction
            for p in pred['prediction']:
                fordate = p['date'].split('T')[0]
                date_diff = (datetime.strptime(fordate, '%Y-%m-%d').date() - datetime.strptime(datemade, '%Y-%m-%d').date()).days
                # If for date is one of the check dates and meets interval requirement
                if fordate in dates_to_check and date_diff >= 7*interval:
                    dates_to_check.remove(fordate)
                    latest_user_preds.append(p)
                    break
            if len(dates_to_check) == 0:
                break

        temp = dict()
        temp['date'] = latest_user_preds
        mse = get_user_mse(confirmed, temp, interval)
        if mse != None:
            users.update({"username": user}, {'$set': {"mse_score_" + str(interval): list(mse.values())[0]}})
        else:
            users.update({"username": user}, {'$set': {"mse_score_" + str(interval): None}})


for user in usernames:
    checkdates = [(nowdate - pd.Timedelta(days=j)).strftime('%Y-%m-%d') for j in range(int(totdays))
                    if nowdate - pd.Timedelta(days=j) >= startdate]
    predictions = mycol.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)])
    dates_to_check = checkdates.copy()
    latest_user_preds = []

    # Loop through all the user's predictions
    for pred in predictions:
        datemade = pred['date']
        # User's prediction array for a single prediction
        for p in pred['prediction']:
            fordate = p['date'].split('T')[0]
            # If for date is one of the check dates
            if fordate in dates_to_check and (datetime.strptime(fordate, '%Y-%m-%d').date() - datetime.strptime(datemade, '%Y-%m-%d').date()).days >= 1:
                dates_to_check.remove(fordate)
                latest_user_preds.append(p)
        if len(dates_to_check) == 0:
            break

    temp = dict()
    temp['date'] = latest_user_preds
    mse = get_user_mse(confirmed, temp, 'overall')
    if mse != None:
        users.update({"username": user}, {'$set': {"mse_score_overall": list(mse.values())[0]}})
    else:
        users.update({"username": user}, {'$set': {"mse_score_overall": None}})
    latest_user_preds = sorted(latest_user_preds, key=lambda k: k['date']) 
    users.update({"username": user}, {'$set': {"prediction": latest_user_preds}})
'''
