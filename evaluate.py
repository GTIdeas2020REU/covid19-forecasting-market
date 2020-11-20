from confirmed import get_us_new_deaths_weekly_avg, get_us_new_deaths
from get_estimates import get_daily_forecasts

import json
import pymongo
from sklearn.metrics import mean_squared_error

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
        user_pred_weekly = json.loads(get_us_new_deaths_weekly_avg(json.dumps(user_pred_daily)))

        confirmed_values = []
        prediction_values = []
        user_dates = list(user_pred_weekly.keys())
        user_values = list(user_pred_weekly.values())
        for d in user_dates:
            try:
                confirmed_values.append(confirmed[d])
                prediction_values.append(user_values[user_dates.index(d)])
            except:
                break

        if confirmed_values == []:
            continue

        if interval != 'overall':
            confirmed_values = confirmed_values[::-1][:interval]
            prediction_values = prediction_values[::-1][:interval]

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
user_prediction = {}
#prediction = mycol.find({})
prediction = mycol.find({"category": "us_daily_deaths"})
for p in prediction:
    #print("inside")
    #(date, prediction)
    #print(p)
    #print(p['prediction'])
    #user_prediction[p['date']] = p['prediction']
    temp = dict()
    temp[p['date']] = p['prediction']
    mse = get_user_mse(json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths())), temp)
    print(mse)
    if mse == None:
        continue
    mycol.update_one({"category": "us_daily_deaths", "date": p['date'].split('T')[0], }, 
        {'$set': 
            { "mse_score": list(mse.values())[0] }
        })
#print(user_prediction)
#print(get_user_mse(get_us_new_deaths_weekly_avg(get_us_new_deaths()), user_prediction))
'''

'''
myClient = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
client = pymongo.MongoClient(myClient)
mydb = client['covid19-forecast']
mycol = mydb['predictions']
prediction = mycol.find({"category": "us_daily_deaths"})
for p in prediction:
    temp = dict()
    temp[p['date']] = p['prediction']
    intervals = ['overall', 1, 2, 4, 8]
    for interval in intervals:
        mse = get_user_mse(json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths())), temp, interval)
        if mse == None:
            continue
        mycol.update({"category": "us_daily_deaths", "date": p['date'].split('T')[0], }, {'$set': {"mse_score_" + str(interval): list(mse.values())[0]}})
'''
