from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_pymongo import PyMongo
from pymongo import MongoClient, DESCENDING
# from flask_talisman import Talisman
from passlib.hash import pbkdf2_sha256
from datetime import timedelta, date
from bson.json_util import dumps, loads
import json
from get_estimates import get_forecasts, get_accuracy_for_all_models, get_daily_forecasts_cases, get_daily_confirmed_df, get_daily_forecasts, get_aggregates, get_new_cases_us
from confirmed import get_us_new_deaths, get_us_confirmed, get_us_new_deaths_weekly_avg
from evaluate import get_mse, get_user_mse
from gaussian import get_gaussian_for_all
import uuid
from apscheduler.schedulers.background import BackgroundScheduler
import atexit


app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
# Talisman(app)
app.secret_key = "super secret key"
app.permanent_session_lifetime = timedelta(days=7)

# Get forecasts data when initially launching website6
forecast_data = get_forecasts()

# Get confirmed cases in US
us_data = get_us_confirmed()

us_inc_forecasts = get_daily_forecasts()
us_inc_confirmed = get_us_new_deaths()
us_inc_confirmed_wk_avg = get_us_new_deaths_weekly_avg(us_inc_confirmed)

us_inc_forecasts_cases = get_daily_forecasts_cases()
print("case count forecast fetched")
us_aggregates = None
us_aggregates_daily = None
us_mse = None
us_daily_cases_confirmed_new = get_new_cases_us()

# set up pymongo
#app.config["MONGO_URI"] = "mongodb://localhost:27017/covid19-forecast"
app.config['MONGO_URI'] = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
mongo = PyMongo(app)
data = {}


@app.route('/', defaults={'u_path': ''})
@app.route('/<path:u_path>')
def catch_all(u_path):
    print(repr(u_path))
    return app.send_static_file('index.html')


'''-----Functions to update variables and database on daily basis with background scheduler-----'''
def load_us_inc_confirmed():
    us_inc_confirmed = get_us_new_deaths()

def load_us_inc_confirmed_wk_avg():
    us_inc_confirmed_wk_avg = get_us_new_deaths_weekly_avg(us_inc_confirmed)

def load_us_inc_forecasts():
    us_inc_forecasts = get_daily_forecasts()

def update_errors():
    prediction = mongo.db.predictions.find({"category": "us_daily_deaths"})
    totdays = 150
    nowdate = datetime.now().date()
    startdate = nowdate - pd.Timedelta(days=totdays)
    usernames = list(prediction.distinct('username'))
    confirmed = json.loads(get_us_new_deaths_weekly_avg(get_us_new_deaths()))
    users = mongo.db.users


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
        users.update({"username": user}, {'$set': {"prediction": latest_user_preds}})



def save_daily_cases():
    today = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
    confirmed_df = get_daily_confirmed_df('2020-04-12', today)
    confirmed_df['date'] = confirmed_df['date'].astype(str) 
    dates = confirmed_df['date'].to_list()[1:]
    confirmed = confirmed_df['confirmed'].diff()[1:]
    confirmed_cases = dict(zip(dates, confirmed))
    confirmed_doc = mongo.db.confirmed.find({'category': 'daily_cases'})
    if confirmed_doc:
        print("data exists")
        mongo.db.confirmed.update_one({'category': 'daily_cases'}, 
            {'$set': 
                { "data": confirmed_cases }
            })
        print("data updated")
    else: 
        mongo.db.confirmed.insert_one({
            'category': 'daily_cases',
            'data': confirmed_cases
        })
        print("data inserted")
    print('success')

def add_vote(id, pred_model):
    vote = mongo.db.votes.find_one(
        {"user_id": id})
    # user already voted
    if vote:
        # edit old_vote
        mongo.db.votes.update_one({"user_id": id}, 
        {'$set': 
            { "prediction_model": pred_model, "date":str(date.today()) }
        })
    else: 
        mongo.db.votes.insert_one({
            'user_id': id,
            'prediction_model': pred_model,
            'date': str(date.today())
        })

def fetch_votes(pred_model):
    #check if valid arg
    return mongo.db.votes.count({'prediction_model':pred_model})

def get_score(pred_model):
    if pred_model == "Columbia":
        return 50
    else:
        return 0

def update_score(username, score):
    mongo.db.users.update_one({"username": username}, 
        {'$inc': 
            { "score": score }
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
    categories = ['us_daily_cases', 'us_daily_deaths']
    for category in categories:
        temp_prediction = get_user_prediction(temp_id, category, True)
        for p in temp_prediction:
            update_user_prediction(username, temp_prediction[p], category)
        #delete prediction
        mongo.db.predictions_unregistered.delete_many({"username": temp_id, "category": category})
    print('all stored')

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

def get_all_usernames():
    users = []
    usernames = mongo.db.users.find({}, {'username': 1})
    for user in usernames:
        users.append(user['username'])
    print(users)
    return users

# save_daily_cases()
# print("saved")

@app.before_first_request
def make_session_permanent():
    session.permanent = True

@app.route("/all-users", methods=['POST','GET'])
def all_users():
    return json.dumps(get_all_usernames())

@app.route("/user-prediction", methods=['POST','GET'])
def home():
    user_prediction = {}
    pred_category = request.args.get('category')
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], pred_category)
        # if 'temp_id' in session:
        #     user_prediction.update(get_user_prediction(session['temp_id'], pred_category, True))
    elif 'temp_id' in session:
        print('temp_id: ', session['temp_id'])
        user_prediction = get_user_prediction(session['temp_id'], pred_category, True)
        print(user_prediction)
    return json.dumps(user_prediction)



'''-----Data collection routes-----'''

@app.route("/us-cum-deaths-forecasts")
def us_cum_deaths_forecasts():
    return forecast_data

@app.route("/us-inc-deaths-forecasts")
def us_inc_deaths_forecasts():
    return us_inc_forecasts

@app.route("/us-cum-deaths-confirmed")
def us_cum_deaths_confirmed():
    return us_data

@app.route('/us-inc-deaths-confirmed')
def us_inc_deaths_confirmed():
    return us_inc_confirmed

@app.route('/us-inc-deaths-confirmed-wk-avg')
def us_inc_deaths_confirmed_wk_avg():
    return us_inc_confirmed_wk_avg

@app.route('/us-agg-cum-deaths')
def us_agg_cum_deaths():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_deaths')
    us_aggregates = get_aggregates(forecast_data, user_prediction)
    return us_aggregates

@app.route('/us-agg-inc-deaths')
def us_agg_inc_deaths():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_deaths') 
    us_aggregates_daily = get_aggregates(us_inc_forecasts, user_prediction)
    return us_aggregates_daily

@app.route('/us-agg-inc-cases')
def us_agg_inc_cases():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_cases') 
    us_aggregates_daily = get_aggregates(us_inc_forecasts_cases, user_prediction)
    return us_aggregates_daily

@app.route('/us-daily-cases-confirmed')
def us_daily_cases_confirmed():
    # save_daily_cases()
    # return 'done'
    # confirmed_cases = {}
    # for data in mongo.db.confirmed.find({'category': 'daily_cases'}):
    #     confirmed_cases = dict(data['data'])
    confirmed_cases = get_us_new_deaths_weekly_avg(dumps(us_daily_cases_confirmed_new))
    return confirmed_cases
    # return dumps(us_daily_cases_confirmed_new)

@app.route('/us-daily-cases-forecast')
def us_daily_cases_forecast():
    return dumps(us_inc_forecasts_cases)
    # return json.dumps(confirmed_cases)



'''-----Forecast evaluation routes-----'''

@app.route('/us-mse-overall')
def us_mse():
    us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg), us_inc_forecasts, 'overall')
    return us_mse

@app.route('/us-mse-1-week-ahead')
def us_mse1():
    us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg), us_inc_forecasts, 1)
    return us_mse

@app.route('/us-mse-2-week-ahead')
def us_mse2():
    us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg), us_inc_forecasts, 2)
    return us_mse

@app.route('/us-mse-4-week-ahead')
def us_mse4():
    us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg), us_inc_forecasts, 4)
    return us_mse

@app.route('/us-mse-8-week-ahead')
def us_mse8():
    us_mse = get_mse(json.loads(us_inc_confirmed_wk_avg), us_inc_forecasts, 8)
    return us_mse

@app.route('/user-mse')
def user_mse():
    user_prediction = {}
    if 'id' in session:
        user_prediction = get_user_prediction(session['username'], 'us_daily_deaths') 
    mse = get_user_mse(json.loads(us_inc_confirmed_wk_avg), user_prediction, 'overall')
    return json.dumps(mse)



'''-----User updating routes-----'''

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
    


'''-----Authentication routes-----'''

@app.route('/login/', methods=['POST','GET'])
def login():
    if (request.method == 'POST'):
        data = request.json
        username = data['username']
        password = data['password']
        if authenticate(username, password):
            print("logged in")
            #store temp user predictions
            if 'temp_id' in session:
                transfer_unregistered_user_predictions(session['temp_id'], username)
                print('all predictions transferred')
                session.pop('temp_id')
            return "Success"
        else:
            print("not logged in")
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
        print("here it is: ", name, username, password)
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



'''-----User score routes-----'''

@app.route('/user-data')
def leaderboard():
    usernames = list(mongo.db.predictions.distinct('username'))
    users = []
    for user in usernames:
        users.append(list(mongo.db.users.find({"username": user}).limit(1))[0])
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

@app.route("/total")
def total():
    results = {}
    for model in forecast_data:
        results[model] = fetch_votes(model)
    return json.dumps(results)


'''-----Schedule jobs to perform functions once a day-----'''
scheduler = BackgroundScheduler()
scheduler.add_job(func=load_us_inc_confirmed, trigger="interval", seconds=86400)
scheduler.add_job(func=load_us_inc_confirmed_wk_avg, trigger="interval", seconds=86400)
scheduler.add_job(func=load_us_inc_forecasts, trigger="interval", seconds=86400)
scheduler.add_job(func=update_errors, trigger="interval", seconds=86400)
scheduler.add_job(func=save_daily_cases, trigger="interval", seconds=43200)
scheduler.start()

# Shut down the scheduler when exiting the app
atexit.register(lambda: scheduler.shutdown())


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=os.environ.get('PORT', 80), ssl_context='adhoc')
