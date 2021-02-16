from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_pymongo import PyMongo
from pymongo import MongoClient, DESCENDING
from flask_talisman import Talisman
from passlib.hash import pbkdf2_sha256
import pandas as pd
from datetime import timedelta, date, datetime
from bson.json_util import dumps, loads
import json
import os
import uuid

from backend.get_estimates import get_forecasts, get_all_forecasts, get_accuracy_for_all_models, get_daily_forecasts_cases, get_daily_confirmed_df, get_daily_forecasts, get_aggregates, get_new_cases_us, get_daily_forecasts_hosps, clean_forecast_data
from backend.confirmed import get_us_new_deaths, get_us_confirmed, get_weekly_avg, get_us_new_hospitalizations
from backend.evaluate import get_mse, get_user_mse, org_mse
from backend.gaussian import get_gaussian_for_all

from apscheduler.schedulers.background import BackgroundScheduler
from flask_apscheduler import APScheduler
import atexit


app = Flask(__name__, static_folder='build', static_url_path='')
#Talisman(app)
Talisman(app, content_security_policy=None)
app.secret_key = "super secret key"
app.permanent_session_lifetime = timedelta(days=7)
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()


# set up pymongo
#app.config["MONGO_URI"] = "mongodb://localhost:27017/covid19-forecast"
app.config['MONGO_URI'] = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
mongo = PyMongo(app)


# Random comment

#forecast_data = get_forecasts()

# Get confirmed cases in US
#us_data = get_us_confirmed()

# Get forecasts and confirmed data when initially launching website
us_inc_forecasts_deaths = mongo.db.vars.find_one({"var": "us_inc_forecasts_deaths"})['data']
us_inc_confirmed_deaths = get_us_new_deaths()
us_inc_confirmed_wk_avg_deaths = get_weekly_avg(us_inc_confirmed_deaths)
all_org_forecasts_deaths = mongo.db.vars.find_one({"var": "all_org_forecasts_deaths"})['data']

us_inc_forecasts_cases = mongo.db.vars.find_one({"var": "us_inc_forecasts_cases"})['data']
us_daily_cases_confirmed_new = get_new_cases_us()
us_inc_confirmed_wk_avg_cases = get_weekly_avg(json.dumps(us_daily_cases_confirmed_new))
all_org_forecasts_cases = mongo.db.vars.find_one({"var": "all_org_forecasts_cases"})['data']

us_inc_forecasts_hosps = mongo.db.vars.find_one({"var": "us_inc_forecasts_hosps"})['data']
us_daily_cases_confirmed_new = get_us_new_hospitalizations()
us_inc_confirmed_wk_avg_hosps = get_us_new_hospitalizations()
all_org_forecasts_hosps = mongo.db.vars.find_one({"var": "all_org_forecasts_hosps"})['data']


# Get aggregate data
us_aggregates = None
us_aggregates_daily = None
us_mse = None



''' Functions to update variables and database on daily basis '''
def load_us_inc_confirmed():
    us_inc_confirmed_deaths = get_us_new_deaths()

def load_us_inc_confirmed_wk_avg():
    us_inc_confirmed_wk_avg_deaths = get_weekly_avg(us_inc_confirmed_deaths)

def load_us_inc_forecasts():
    us_inc_forecasts_deaths = get_daily_forecasts(event="inc death")

def load_all_org_forecasts():
    all_org_forecasts_deaths = get_all_forecasts(event="inc death")


def update_errors():
    prediction = mongo.db.predictions.find({"category": "us_daily_deaths"})
    totdays = 150
    nowdate = datetime.now().date()
    startdate = nowdate - pd.Timedelta(days=totdays)
    usernames = list(prediction.distinct('username'))
    confirmed = json.loads(get_weekly_avg(get_us_new_deaths()))
    users = mongo.db.users


    for interval in [1, 2, 4, 8]:
        checkdates = [(nowdate - pd.Timedelta(days=7*interval*j)).strftime('%Y-%m-%d') for j in range(int(totdays/7*interval))
                        if nowdate - pd.Timedelta(days=7*interval*j) >= startdate]
        for user in usernames:
            predictions = mongo.db.predictions.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)])
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
        predictions = mongo.db.predictions.find({"username": user, "category": "us_daily_deaths"}).sort([('date',-1)])
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
        users.update({"username": user}, {'$set': {"prediction": latest_user_preds}})


@app.route('/', defaults={'u_path': ''})
@app.route('/<path:u_path>')
def catch_all(u_path):
    print(repr(u_path))
    return app.send_static_file('index.html')

'''
@app.route('/', methods=['GET'])
def index():
    return app.send_static_file('index.html')
'''

def save_daily_cases():
    today = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
    confirmed_df = get_daily_confirmed_df('2020-04-12', today)
    confirmed_df['date'] = confirmed_df['date'].astype(str) 
    dates = confirmed_df['date'].to_list()[1:]
    confirmed = confirmed_df['confirmed'].diff()[1:]
    confirmed_cases = dict(zip(dates, confirmed))
    confirmed_doc = mongo.db.confirmed.find({'category': 'daily_cases'})
    if confirmed_doc:
        mongo.db.confirmed.update_one({'category': 'daily_cases'}, 
            {'$set': 
                { "data": confirmed_cases }
            })
    else: 
        mongo.db.confirmed.insert_one({
            'category': 'daily_cases',
            'data': confirmed_cases
        })



def delete_user_prediction(username, category):
    curr_date = date.today().strftime("%Y-%m-%d")
    pred = mongo.db.predictions.delete_one({"username": username, "category": category, "date": curr_date})

def update_user_prediction(username, data, category, unregistered=False, a=None, higher=False, index=None):
    curr_date = date.today().strftime("%Y-%m-%d")
    pred_db = mongo.db.predictions
    if unregistered:
        pred_db = mongo.db.predictions_unregistered
    pred = pred_db.find_one({"username": username, "category": category, "date": curr_date, })
    if pred:
        pred_db.update_one({"username": username, "category": category, "date": curr_date, }, 
        {'$set': 
            { "prediction": data }
        })
    else:
        pred_db.insert_one({"username": username, "category": category, "date": curr_date, "prediction": data })

def get_user_prediction(username, category, unregistered=False):
    user_prediction = {}
    pred_db = mongo.db.predictions
    if unregistered:
        pred_db = mongo.db.predictions_unregistered
    prediction = pred_db.find({"username": username, "category": category})
    for p in prediction:
        user_prediction[p['date']] = p['prediction']
    return user_prediction

def transfer_unregistered_user_predictions(temp_id, username):
    categories = ['us_daily_cases', 'us_daily_deaths', 'us_daily_hosps']
    for category in categories:
        temp_prediction = get_user_prediction(temp_id, category, True)
        for p in temp_prediction:
            update_user_prediction(username, temp_prediction[p], category)
        #delete prediction
        mongo.db.predictions_unregistered.delete_many({"username": temp_id, "category": category})

def store_session(id, email, name, username):
    session['id'] = str(id)
    session['email'] = email
    session['name'] = name
    session['username'] = username

def authenticate(username, password):
    user = mongo.db.users.find_one(
        {"username": username})
    if user:
        if pbkdf2_sha256.verify(password, user["password"]):
            store_session((user['_id']), user['email'], user['name'], user['username'])
            return True
    return False

def register(name, email, username, password):
    user = mongo.db.users.find_one(
        {"username": username})
    # user already exists
    if user:
        return False
    # add new user
    hashed = pbkdf2_sha256.hash(password)
    mongo.db.users.insert_one({
        'name': name,
        'email': email,
        'username': username,
        'password': hashed,
        'score': 0
    })
    new_user = mongo.db.users.find_one({'username': username})
    store_session((new_user['_id']), new_user['email'], new_user['name'], new_user['username'])
    return True
    
def google_login(username, name, email):
    user = mongo.db.users.find_one(
        {"username": username})
    if not user:
        password = str(uuid.uuid4())
        hashed = pbkdf2_sha256.hash(password)
        mongo.db.users.insert_one({
            'name': name,
            'email': email,
            'username': username,
            'password': hashed,
            'score': 0
        })
        user = mongo.db.users.find_one({'username': username})
    store_session((user['_id']), user['email'], user['name'], user['username'])
    print("google login successful")




@app.before_first_request
def make_session_permanent():
    session.permanent = True


@app.route("/user-prediction", methods=['POST','GET'])
def home():
    user_prediction = {}
    pred_category = request.args.get('category')
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], pred_category)
        # if 'temp_id' in session:
        #     user_prediction.update(get_user_prediction(session['temp_id'], pred_category, True))
    elif 'temp_id' in session:
        user_prediction = get_user_prediction(session['temp_id'], pred_category, True)
    return json.dumps(user_prediction)

@app.route("/all-user-prediction", methods=['POST','GET'])
def user_all_prediction():
    user_predictions = {}
    usernames = list(mongo.db.predictions.distinct('username'))
    pred_category = request.args.get('category')
    for username in usernames:
        user_predictions[username] = get_user_prediction(username, pred_category)
    return json.dumps(user_predictions)

@app.route("/all-org-prediction", methods=['POST','GET'])
def org_all_prediction():
    category = request.args.get('category')
    if category == "us_daily_deaths":
        return json.dumps(all_org_forecasts_deaths)
    elif category == "us_daily_cases":
        return json.dumps(all_org_forecasts_cases)
    elif category == "us_daily_hosps":
        return json.dumps(all_org_forecasts_hosps)
        
'''
@app.route("/us-cum-deaths-forecasts")
def us_cum_deaths_forecasts():
    return forecast_data
    #return data['us_cum_forecasts']
'''

# @app.route("/us-inc-deaths-forecasts")
# def us_inc_deaths_forecasts():
#     return us_inc_forecasts_deaths

@app.route("/forecasts", methods=['POST','GET'])
def forecasts():
    category = request.args.get('category')
    if category == "us_daily_deaths":
        return us_inc_forecasts_deaths
    elif category == "us_daily_cases":
        return us_inc_forecasts_cases
    elif category == "us_daily_hosps":
        return us_inc_forecasts_hosps


@app.route("/forecast-cleaned", methods=['POST','GET'])
def forecasts_cleaned():
    category = request.args.get('category')
    if category == "us_daily_deaths":
        return dumps(clean_forecast_data(us_inc_forecasts_deaths))
    elif category == "us_daily_cases":
        return dumps(clean_forecast_data(us_inc_forecasts_cases))
    elif category == "us_daily_hosps":
        return dumps(clean_forecast_data(us_inc_forecasts_hosps)) 

'''
@app.route("/us-cum-deaths-confirmed")
def us_cum_deaths_confirmed():
    return us_data
    #return data['us_cum_confirmed']
'''

# @app.route('/us-inc-deaths-confirmed')
# def us_inc_deaths_confirmed():
#     return us_inc_confirmed_deaths

# @app.route('/us-inc-deaths-confirmed-wk-avg')
# def us_inc_deaths_confirmed_wk_avg():
#     return us_inc_confirmed_wk_avg_deaths

@app.route('/confirmed-wk-avg', methods=['POST','GET'])
def confirmed_wk_avg():
    category = request.args.get('category')
    if category == "us_daily_deaths":
        return us_inc_confirmed_wk_avg_deaths
    elif category == "us_daily_cases":
        return us_inc_confirmed_wk_avg_cases
    elif category == "us_daily_hosps":
        return us_inc_confirmed_wk_avg_hosps

'''
@app.route('/us-agg-cum-deaths')
def us_agg_cum_deaths():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_deaths')
    us_aggregates = get_aggregates(forecast_data, user_prediction)
    return us_aggregates
'''


@app.route('/aggregate', methods=['POST','GET'])
def aggregate():
    category = request.args.get('category')
    user_prediction = {}
    forecast_data = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], category) 
    if category == "us_daily_deaths":   
        forecast_data = us_inc_forecasts_deaths
    elif category == "us_daily_cases":
        forecast_data = us_inc_forecasts_cases
    elif category == "us_daily_hosps":
        forecast_data = us_inc_forecasts_hosps
    return get_aggregates(forecast_data, user_prediction)
    

# @app.route('/us-agg-inc-deaths')
# def us_agg_inc_deaths():
#     user_prediction = {}
#     if 'id' in session:
#         user_prediction = get_user_prediction(session['username'], 'us_daily_deaths') 
#     us_aggregates_daily = get_aggregates(us_inc_forecasts_deaths, user_prediction)
#     return us_aggregates_daily

# @app.route('/us-agg-inc-cases')
# def us_agg_inc_cases():
#     user_prediction = {}
#     if 'id' in session:
#         user_prediction = get_user_prediction(session['username'], 'us_daily_cases') 
#     us_aggregates_daily = get_aggregates(us_inc_forecasts_cases, user_prediction)
#     return us_aggregates_daily

# @app.route('/us-daily-cases-confirmed')
# def us_daily_cases_confirmed():
#     return us_inc_confirmed_wk_avg_cases

# @app.route('/us-daily-cases-forecast')
# def us_daily_cases_forecast():
#     return dumps(us_inc_forecasts_cases)



'''-----Forecast evaluation routes-----'''

@app.route('/us-mse-overall', methods=['POST','GET'])
def us_mse():
    us_mse = None
    errors = mongo.db.org_errors
    category = request.args.get('category')
    if category == "us_daily_deaths":
        us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg_deaths), us_inc_forecasts_deaths, 'overall')
    elif category == "us_daily_cases":
        us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg_cases), us_inc_forecasts_cases, 'overall')
    elif category == "us_daily_hosps":
        us_mse = get_mse(us_inc_confirmed_wk_avg_hosps, us_inc_forecasts_hosps, 'overall')
    return us_mse


@app.route('/us-mse-1-week-ahead', methods=['POST','GET'])
def us_mse1():
    us_mse = None
    errors = mongo.db.org_errors
    category = request.args.get('category')
    if category == "us_daily_deaths":
        scores = errors.find({}, {"org": 1, "mse_score_1_us_daily_deaths": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_1_us_daily_deaths"]
    elif category == "us_daily_cases":
        scores = errors.find({}, {"org": 1, "mse_score_1_us_daily_cases": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_1_us_daily_cases"]
    elif category == "us_daily_hosps":
        scores = errors.find({}, {"org": 1, "mse_score_1_us_daily_hosps": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_1_us_daily_hosps"]
    return us_mse

@app.route('/us-mse-2-week-ahead', methods=['POST','GET'])
def us_mse2():
    us_mse = None
    errors = mongo.db.org_errors
    category = request.args.get('category')
    if category == "us_daily_deaths":
        scores = errors.find({}, {"org": 1, "mse_score_2_us_daily_deaths": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_2_us_daily_deaths"]
    elif category == "us_daily_cases":
        scores = errors.find({}, {"org": 1, "mse_score_2_us_daily_cases": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_2_us_daily_cases"]
    elif category == "us_daily_hosps":
        scores = errors.find({}, {"org": 1, "mse_score_2_us_daily_hosps": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_2_us_daily_hosps"]
    return us_mse

@app.route('/us-mse-4-week-ahead', methods=['POST','GET'])
def us_mse4():
    us_mse = None
    errors = mongo.db.org_errors
    category = request.args.get('category')
    if category == "us_daily_deaths":
        scores = errors.find({}, {"org": 1, "mse_score_4_us_daily_deaths": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_4_us_daily_deaths"]
    elif category == "us_daily_cases":
        scores = errors.find({}, {"org": 1, "mse_score_4_us_daily_cases": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_4_us_daily_cases"]
    elif category == "us_daily_hosps":
        scores = errors.find({}, {"org": 1, "mse_score_4_us_daily_hosps": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_4_us_daily_hosps"]
    return us_mse

@app.route('/us-mse-8-week-ahead', methods=['POST','GET'])
def us_mse8():
    us_mse = None
    errors = mongo.db.org_errors
    category = request.args.get('category')
    if category == "us_daily_deaths":
        scores = errors.find({}, {"org": 1, "mse_score_8_us_daily_deaths": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_8_us_daily_deaths"]
    elif category == "us_daily_cases":
        scores = errors.find({}, {"org": 1, "mse_score_8_us_daily_cases": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_8_us_daily_cases"]
    elif category == "us_daily_hosps":
        scores = errors.find({}, {"org": 1, "mse_score_8_us_daily_hosps": 1})
        us_mse = dict()
        for item in scores:
            us_mse[item["org"]] = item["mse_score_8_us_daily_hosps"]
    return us_mse


@app.route('/user-mse')
def user_mse():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_deaths') 
    mse = get_user_mse(json.loads(us_inc_confirmed_wk_avg_deaths), user_prediction, 'overall')
    return json.dumps(mse)



@app.route('/update/', methods=['GET', 'POST'])
def update_prediction():
    if request.method == 'POST':
        data = request.json
        #replace username with user id
        if 'id' in session:
            update_user_prediction(session['username'], data['data'], data['category'])
            return "Success"
        elif 'temp_id' not in session: #unregistered user
            print("session empty")
            session['temp_id'] = str(uuid.uuid4())
        update_user_prediction(session['temp_id'], data['data'], data['category'], True)
        return 'Done'
    return 'None'

@app.route('/delete/', methods=["POST"])
def delete():
    if request.method == 'POST':
        if 'id' in session:
            delete_user_prediction(session['username'], request.json['category'])
        else:
            print("session empty")
        return "Success"  
    return "None"
    
#          body: JSON.stringify({"username": username, "name": name, "email": email}),

@app.route('/login/', methods=['POST','GET'])
def login():
    if (request.method == 'POST'):
        login_type = request.args.get('type')
        data = request.json
        if login_type == 'google':
            username = data.get('username')
            name = data.get('name')
            email = data.get('email')
            google_login(username, name, email)
            if 'temp_id' in session:
                transfer_unregistered_user_predictions(session['temp_id'], username)
                print('all predictions transferred')
                session.pop('temp_id')
            print('google login done')
            print(session)
            return "Success"
        elif login_type == 'normal':
            username = data['username']
            password = data['password']
            if authenticate(username, password):
                #store temp user predictions
                if 'temp_id' in session:
                    transfer_unregistered_user_predictions(session['temp_id'], username)
                    print('all predictions transferred')
                    session.pop('temp_id')
                return "Success"
            else:
                flash("Invalid username or password. Please try again", "error")
                return "Fail"
    else:
        if 'id' in session:
            print("True")
            return dumps({'status': True})
        else: 
            print("False")
            return dumps({'status': False})

@app.route('/signup/', methods=['POST'])
def signup():
    if request.method == "POST":
        data = request.json
        email = data['email']
        name = data['name']
        username = data['username']
        password = data['password']
        if register(name, email, username, password):
            #store temp user predictions
            if 'temp_id' in session:
                transfer_unregistered_user_predictions(session['temp_id'], username)
                print('all predictions transferred')
                session.pop('temp_id')
            print("registered")
            return 'Success'
        else:
            print("Username is already taken")
            return 'Fail'
    else:
        print("invalid method")
        return 'None'



@app.route("/logout/", methods=["POST"])
def logout():
    if request.method == "POST":
        if 'temp_id' in session:
            session.pop('temp_id')
        if 'id' in session:
            session.pop('id')
            session.pop('name')
            session.pop('username')
            session.pop('email')
            print("logout was a sucess")
    return 'None'

@app.route('/login-status/', methods=["GET"])
def user_status():
    if 'id' in session:
        return dumps({
            'logged in': True,
            'id': session['id'],
            'name': session['name'],
            'email': session['email'],
            'username': session['username']
        })
    else:
        return dumps({'logged in': False})



'''-----User score route-----'''

@app.route('/user-data')
def leaderboard():
    usernames = list(mongo.db.predictions.distinct('username'))
    users = []
    for user in usernames:
        user_data = list(mongo.db.users.find({"username": user}).limit(1))[0]
        user_data.pop('email')
        user_data.pop('password')
        user_data.pop('_id')
        users.append(user_data)
    return dumps(users)



@app.route('/user')
def profile():
    user = {}
    if 'id' in session:
        user = mongo.db.users.find({'username': session['username']})
    return json.dumps(user)

@app.route('/action/', methods=["POST"])
def addbio():
    user = {}
    if request.method == 'POST':
        bio = request.values.get('bio')
        location = request.values.get('location')
    if 'id' in session:
        user = mongo.db.users.find({'username': session['username']})
    user.insert({'bio':bio, 'location':location})
    #redirect('/user')



# Shut down the scheduler when exiting the app
#atexit.register(lambda: scheduler.shutdown())

if __name__ == "__main__":
    # Schedule jobs to perform functions once a day 
    #scheduler = BackgroundScheduler()
    app.apscheduler.add_job(func=load_us_inc_confirmed, trigger="interval", days=1, id='0')
    app.apscheduler.add_job(func=load_us_inc_confirmed_wk_avg, trigger="interval", days=1, id='1')
    #app.apscheduler.add_job(func=load_us_inc_forecasts, trigger="interval", days=1, id='2')
    #app.apscheduler.add_job(func=load_all_org_forecasts, trigger="interval", days=1, id='3')
    #app.apscheduler.add_job(func=update_errors, trigger="interval", days=1, id='5')
    app.apscheduler.add_job(func=save_daily_cases, trigger="interval", days=1, id='6')
    #scheduler.start()

    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=os.environ.get('PORT', 80), ssl_context='adhoc')
    #app.run(debug=True)
