from confirmed import get_us_new_deaths_weekly_avg, get_us_new_deaths
from get_estimates import get_daily_forecasts

import json
from sklearn.metrics import mean_squared_error 

def get_mse(confirmed, forecasts):
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

        mse = mean_squared_error(confirmed_values, prediction_values)
        result[model] = mse

    return result


def get_user_mse(confirmed, user_prediction):
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

        mse = mean_squared_error(confirmed_values, prediction_values)
        result[date] = mse
    
    return result