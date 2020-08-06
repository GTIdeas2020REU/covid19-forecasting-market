from confirmed import get_us_new_deaths_weekly_avg, get_us_new_deaths
from get_estimates import get_daily_forecasts

def get_mse():
    print(get_us_new_deaths_weekly_avg(get_us_new_deaths()))
    print(' ')
    print(get_daily_forecasts())

get_mse()