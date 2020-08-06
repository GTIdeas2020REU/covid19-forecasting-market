from confirmed import get_us_new_deaths_weekly_avg, get_us_new_deaths
from get_estimates import get_daily_forecasts

import json
from sklearn.metrics import mean_squared_error 

def get_mse(confirmed, forecasts):
    #confirmed = json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths()))
    #forecasts = get_daily_forecasts()
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