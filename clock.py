import pymongo
import pandas as pd
import json
import time
from datetime import datetime,timedelta
from apscheduler.schedulers.background import BackgroundScheduler

from backend.get_estimates import get_forecasts, get_all_forecasts, get_accuracy_for_all_models, get_daily_forecasts_cases, get_daily_confirmed_df, get_daily_forecasts, get_aggregates, get_new_cases_us, get_daily_forecasts_hosps
from backend.confirmed import get_us_new_deaths, get_us_confirmed, get_weekly_avg, get_us_new_hospitalizations
from backend.evaluate import get_mse, get_user_mse, org_mse


myClient = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
client = pymongo.MongoClient(myClient)
mydb = client['covid19-forecast']


def update_new_death_org_errors():
    errors = []  # 0th index = 1, 1st = 2, 2nd = 4, 3rd = 8
    errors = mydb.org_errors
    
    for interval in [1, 2, 4, 8]:
        org_errors = org_mse(7*interval, "inc death")
        orgs = list(org_errors.keys())
        for org in orgs:
            org_exists = errors.find_one({"org": org})
            if org_exists:
                errors.update_one({"org": org}, 
                {'$set': 
                    { "mse_score_" + str(interval) + "_us_daily_deaths": org_errors[org] }
                })
            else:
                errors.insert_one({"org": org, "mse_score_" + str(interval) + "_us_daily_deaths": org_errors[org] })
    

    us_mse = get_mse(json.loads(get_weekly_avg(get_us_new_deaths())), get_daily_forecasts(event="inc death"), 'overall')
    orgs = list(us_mse.keys())
    for org in orgs:
        org_exists = errors.find({"org": org})
        if org_exists:
            errors.update_one({"org": org}, 
            {'$set': 
                { "mse_score_overall_us_daily_deaths": us_mse[org] }
            })
        else:
            errors.insert_one({"org": org, "mse_score_overall_us_daily_deaths": us_mse[org] })


def update_new_case_org_errors():
    errors = []  # 0th index = 1, 1st = 2, 2nd = 4, 3rd = 8
    errors = mydb.org_errors
    for interval in [1, 2, 4, 8]:
        org_errors = org_mse(7*interval, "inc case")
        orgs = list(org_errors.keys())
        for org in orgs:
            org_exists = errors.find_one({"org": org})
            if org_exists:
                errors.update_one({"org": org}, 
                {'$set': 
                    { "mse_score_" + str(interval) + "_us_daily_cases": org_errors[org] }
                })
            else:
                errors.insert_one({"org": org, "mse_score_" + str(interval) + "_us_daily_cases": org_errors[org] })

    us_mse = get_mse(json.loads(get_weekly_avg(json.dumps(get_new_cases_us()))), get_daily_forecasts_cases(), 'overall')
    orgs = list(us_mse.keys())
    for org in orgs:
        org_exists = errors.find({"org": org})
        if org_exists:
            errors.update_one({"org": org}, 
            {'$set': 
                { "mse_score_overall_us_daily_cases": us_mse[org] }
            })
        else:
            errors.insert_one({"org": org, "mse_score_overall_us_daily_cases": us_mse[org] })



def update_new_hosp_org_errors():
    errors = []  # 0th index = 1, 1st = 2, 2nd = 4, 3rd = 8
    errors = mydb.org_errors

    
    for interval in [1, 2, 4, 8]:
        org_errors = org_mse(7*interval, "inc hosp")
        orgs = list(org_errors.keys())
        for org in orgs:
            org_exists = errors.find_one({"org": org})
            if org_exists:
                errors.update_one({"org": org}, 
                {'$set': 
                    { "mse_score_" + str(interval) + "_us_daily_hosps": org_errors[org] }
                })
            else:
                errors.insert_one({"org": org, "mse_score_" + str(interval) + "_us_daily_hosps": org_errors[org] })
    

    us_mse = get_mse(get_us_new_hospitalizations(), get_daily_forecasts_hosps(), 'overall')
    orgs = list(us_mse.keys())
    for org in orgs:
        org_exists = errors.find({"org": org})
        #print(org)
        #print(org_exists)
        if org_exists:
            errors.update_one({"org": org}, 
            {'$set': 
                { "mse_score_overall_us_daily_hosps": us_mse[org] }
            })
        else:
            errors.insert_one({"org": org, "mse_score_overall_us_daily_hosps": us_mse[org] })



def update_new_death_user_errors():
    prediction = mydb.predictions.find({"category": "us_daily_deaths"})
    totdays = 150
    nowdate = datetime.now().date()
    startdate = nowdate - pd.Timedelta(days=totdays)
    usernames = list(prediction.distinct('username'))
    confirmed = json.loads(get_weekly_avg(get_us_new_deaths()))
    users = mydb.users

    for interval in [1, 2, 4, 8]:
        checkdates = [(nowdate - pd.Timedelta(days=7*interval*j)).strftime('%Y-%m-%d') for j in range(int(totdays/7*interval))
                        if nowdate - pd.Timedelta(days=7*interval*j) >= startdate]
        for user in usernames:
            predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)]))
            dates_to_check = checkdates.copy()
            latest_user_preds = []
            n = len(predictions)

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
            mse = get_user_mse(confirmed, temp, interval, n)
            if mse != None:
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_deaths": list(mse.values())[0] / 10000000}})
            else:
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_deaths": None}})


    for user in usernames:
        checkdates = [(nowdate - pd.Timedelta(days=j)).strftime('%Y-%m-%d') for j in range(int(totdays))
                        if nowdate - pd.Timedelta(days=j) >= startdate]
        predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)]))
        dates_to_check = checkdates.copy()
        latest_user_preds = []
        n = len(predictions)

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
        
        if len(latest_user_preds) <= 7:
            continue

        temp = dict()
        temp['date'] = latest_user_preds
        mse = get_user_mse(confirmed, temp, 'overall', n)
        if mse != None:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_deaths": list(mse.values())[0] / 10000000}})
        else:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_deaths": None}})
        users.update_one({"username": user}, {'$set': {"prediction_us_daily_deaths": latest_user_preds}})



def update_new_case_user_errors():
    prediction = mydb.predictions.find({"category": "us_daily_cases"})
    totdays = 150
    nowdate = datetime.now().date()
    startdate = nowdate - pd.Timedelta(days=totdays)
    usernames = list(prediction.distinct('username'))
    confirmed = json.loads(get_weekly_avg(json.dumps(get_new_cases_us())))
    users = mydb.users

    for interval in [1, 2, 4, 8]:
        checkdates = [(nowdate - pd.Timedelta(days=7*interval*j)).strftime('%Y-%m-%d') for j in range(int(totdays/7*interval))
                        if nowdate - pd.Timedelta(days=7*interval*j) >= startdate]
        for user in usernames:
            predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_cases"}).sort([('date',-1)]))
            dates_to_check = checkdates.copy()
            latest_user_preds = []
            n = len(predictions)

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
            mse = get_user_mse(confirmed, temp, interval, n)
            if mse != None:
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_cases": list(mse.values())[0] / 100000000000}})
            else:
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_cases": None}})
    

    for user in usernames:
        checkdates = [(nowdate - pd.Timedelta(days=j)).strftime('%Y-%m-%d') for j in range(int(totdays))
                        if nowdate - pd.Timedelta(days=j) >= startdate]
        predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_cases"}).sort([('date',-1)]))
        dates_to_check = checkdates.copy()
        latest_user_preds = []
        n = len(predictions)

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

        if len(latest_user_preds) <= 7:
            continue
        temp = dict()
        temp['date'] = latest_user_preds
        mse = get_user_mse(confirmed, temp, 'overall', n)
        if mse != None:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_cases": list(mse.values())[0] / 100000000000}})
        else:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_cases": None}})
        users.update_one({"username": user}, {'$set': {"prediction_us_daily_cases": latest_user_preds}})


def update_new_hosp_user_errors():
    prediction = mydb.predictions.find({"category": "us_daily_hosps"})
    totdays = 150
    nowdate = datetime.now().date()
    startdate = nowdate - pd.Timedelta(days=totdays)
    usernames = list(prediction.distinct('username'))
    confirmed = get_us_new_hospitalizations()
    users = mydb.users

    for interval in [1, 2, 4, 8]:
        checkdates = [(nowdate - pd.Timedelta(days=7*interval*j)).strftime('%Y-%m-%d') for j in range(int(totdays/7*interval))
                        if nowdate - pd.Timedelta(days=7*interval*j) >= startdate]
        for user in usernames:
            predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_hosps"}).sort([('date',-1)]))
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
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_hosps": list(mse.values())[0] / 10000000}})
            else:
                users.update_one({"username": user}, {'$set': {"mse_score_" + str(interval) + "_us_daily_hosps": None}})


    for user in usernames:
        checkdates = [(nowdate - pd.Timedelta(days=j)).strftime('%Y-%m-%d') for j in range(int(totdays))
                        if nowdate - pd.Timedelta(days=j) >= startdate]
        predictions = list(mydb.predictions.find({"username": user, "category": "us_daily_hosps"}).sort([('date',-1)]))
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

        if len(latest_user_preds) <= 7:
            continue
        temp = dict()
        temp['date'] = latest_user_preds
        mse = get_user_mse(confirmed, temp, 'overall')
        if mse != None:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_hosps": list(mse.values())[0] / 10000000}})
        else:
            users.update_one({"username": user}, {'$set': {"mse_score_overall_us_daily_hosps": None}})
        users.update_one({"username": user}, {'$set': {"prediction_us_daily_hosps": latest_user_preds}})



def update_vars():
    variables = mydb.vars 
    
    # us_inc_forecasts_deaths
    us_inc_forecasts_deaths = get_daily_forecasts(event="inc death")
    var_exists = variables.find_one({"var": "us_inc_forecasts_deaths"})
    if var_exists:
        variables.update_one({"var": "us_inc_forecasts_deaths"}, 
        {'$set': 
            { "data": us_inc_forecasts_deaths }
        })
    else:
        variables.insert_one({"var": "us_inc_forecasts_deaths", "data": us_inc_forecasts_deaths })

    # all_org_forecasts_deaths
    all_org_forecasts_deaths = get_all_forecasts(event="inc death")
    var_exists = variables.find_one({"var": "all_org_forecasts_deaths"})
    if var_exists:
        variables.update_one({"var": "all_org_forecasts_deaths"}, 
        {'$set': 
            { "data": us_inc_forecasts_deaths }
        })
    else:
        variables.insert_one({"var": "all_org_forecasts_deaths", "data": all_org_forecasts_deaths })

    # us_inc_forecasts_cases
    us_inc_forecasts_cases = get_daily_forecasts_cases()
    var_exists = variables.find_one({"var": "us_inc_forecasts_cases"})
    if var_exists:
        variables.update_one({"var": "us_inc_forecasts_cases"}, 
        {'$set': 
            { "data": us_inc_forecasts_cases }
        })
    else:
        variables.insert_one({"var": "us_inc_forecasts_cases", "data": us_inc_forecasts_cases })

    # all_org_forecasts_cases
    all_org_forecasts_cases = get_all_forecasts(event="inc case")
    var_exists = variables.find_one({"var": "all_org_forecasts_cases"})
    if var_exists:
        variables.update_one({"var": "all_org_forecasts_cases"}, 
        {'$set': 
            { "data": all_org_forecasts_cases }
        })
    else:
        variables.insert_one({"var": "all_org_forecasts_cases", "data": all_org_forecasts_cases })

    # us_inc_forecasts_hosps
    us_inc_forecasts_hosps = get_daily_forecasts_hosps()
    var_exists = variables.find_one({"var": "us_inc_forecasts_hosps"})
    if var_exists:
        variables.update_one({"var": "us_inc_forecasts_hosps"}, 
        {'$set': 
            { "data": us_inc_forecasts_hosps }
        })
    else:
        variables.insert_one({"var": "us_inc_forecasts_hosps", "data": us_inc_forecasts_hosps })
    
    # all_org_forecasts_hosps
    all_org_forecasts_hosps = get_all_forecasts(event="inc hosp")
    var_exists = variables.find_one({"var": "all_org_forecasts_hosps"})
    if var_exists:
        variables.update_one({"var": "all_org_forecasts_hosps"}, 
        {'$set': 
            { "data": all_org_forecasts_hosps }
        })
    else:
        variables.insert_one({"var": "all_org_forecasts_hosps", "data": all_org_forecasts_hosps })




scheduler = BackgroundScheduler()
scheduler.add_job(func=update_new_death_user_errors, trigger="interval", days=1)
scheduler.add_job(func=update_new_death_org_errors, trigger="interval", days=1)
scheduler.add_job(func=update_new_case_user_errors, trigger="interval", days=1)
scheduler.add_job(func=update_new_case_org_errors, trigger="interval", days=1)
scheduler.add_job(func=update_new_hosp_org_errors, trigger="interval", days=1)
scheduler.add_job(func=update_vars, trigger="interval", days=1)
scheduler.start()

