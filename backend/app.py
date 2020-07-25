from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_pymongo import PyMongo
from pymongo import MongoClient, DESCENDING
from passlib.hash import pbkdf2_sha256
from datetime import timedelta, date
from bson.json_util import dumps, loads
import json
from get_estimates import get_forecasts, get_accuracy_for_all_models, get_daily_confirmed_df, get_daily_forecasts, get_aggregates
from confirmed import get_us_new_deaths, get_us_confirmed, get_us_new_deaths_weekly_avg
from gaussian import get_gaussian_for_all

app = Flask(__name__)
app.secret_key = "super secret key"
app.permanent_session_lifetime = timedelta(days=7)

# Get forecasts data when initially launching website6
forecast_data = get_forecasts()

# Get confirmed cases in US
us_data = get_us_confirmed()

us_inc_forecasts = get_daily_forecasts()
us_inc_confirmed = get_us_new_deaths()
us_inc_confirmed_wk_avg = get_us_new_deaths_weekly_avg(us_inc_confirmed)

# Get aggregate data
us_aggregates = get_aggregates(forecast_data)
us_aggregates_daily = get_aggregates(us_inc_forecasts)

# set up pymongo
#app.config["MONGO_URI"] = "mongodb://localhost:27017/covid19-forecast"
app.config['MONGO_URI'] = "mongodb+srv://test:test@cluster0-3qghj.mongodb.net/covid19-forecast?retryWrites=true&w=majority"
mongo = PyMongo(app)
data = {}

def add_vote(id, pred_model):
    vote = mongo.db.votes.find_one(
        {"user_id": id})
    # user already voted
    if vote:
        #print(vote)
        # edit old_vote
        mongo.db.votes.update_one({"user_id": id}, 
        {'$set': 
            { "prediction_model": pred_model, "date":str(date.today()) }
        })
        #vote['prediction_model'] = pred_model
        #vote['date'] = str(date.today())
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
    #(pred_model)
    if pred_model == "Columbia":
        #print('correct')
        return 50
    else:
        #print('incorrect')
        return 0

def update_score(username, score):
    mongo.db.users.update_one({"username": username}, 
        {'$inc': 
            { "score": score }
        })
    #print("score updated")
def delete_user_prediction(username, category):
    print(username)
    print(category)
    curr_date = date.today().strftime("%Y-%m-%d")
    print(mongo.db.predictions.find_one({"username": username, "category": category}))
    pred = mongo.db.predictions.delete_one({"username": username, "category": category, "date": curr_date})
    print(pred.deleted_count)
    print("deleted")

def update_user_prediction(username, data, category, a=None, higher=False, index=None):
    curr_date = date.today().strftime("%Y-%m-%d")
    print(curr_date)
    pred = mongo.db.predictions.find_one({"username": username, "category": category, "date": curr_date, })
    #print(pred)
    if pred:
        #print("already exists")
        mongo.db.predictions.update_one({"username": username, "category": category, "date": curr_date, }, 
        {'$set': 
            { "prediction": data }
        })
    else:
        mongo.db.predictions.insert_one({"username": username, "category": category, "date": curr_date, "prediction": data})

def get_user_prediction(username, category):
    user_prediction = {}
    prediction = mongo.db.predictions.find({"username": username, "category": category})
    for p in prediction:
        print("inside")
        #(date, prediction)
        print(p)
        print(p['prediction'])
        user_prediction[p['date']] = p['prediction']
    #user_prediction = exists['prediction']
    return user_prediction

def store_session(id, email, name, username):
    session['id'] = str(id)
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


@app.before_first_request
def make_session_permanent():
    session.permanent = True
    ''' Get forecasts data when initially launching website6
    data['us_cum_forecasts'] = get_forecasts()
    print("cum forecasts")
    # Get confirmed cases in US
    data['us_cum_confirmed'] = get_us_confirmed()
    print("cum confirmed")
    data['us_inc_forecasts'] = get_daily_forecasts()
    print("inc forecasts")
    # Get new deaths in US
    data['us_inc_confirmed'] = get_us_new_deaths()
    print("inc confirmed")'''


@app.route("/user-prediction", methods=['POST','GET'])
def home():
    pred_category = request.args.get('category')
    print(pred_category)
    print("done")
    user_prediction = get_user_prediction('testUsername', pred_category)
    print(user_prediction)
    return json.dumps(user_prediction)

@app.route("/us-cum-deaths-forecasts")
def us_cum_deaths_forecasts():
    return forecast_data
    #return data['us_cum_forecasts']

@app.route("/us-inc-deaths-forecasts")
def us_inc_deaths_forecasts():
    return us_inc_forecasts
    #return data['us_inc_forecasts']

@app.route("/us-cum-deaths-confirmed")
def us_cum_deaths_confirmed():
    return us_data
    #return data['us_cum_confirmed']

@app.route('/us-inc-deaths-confirmed')
def us_inc_deaths_confirmed():
    return us_inc_confirmed
    #return data['us_inc_confirmed']

@app.route('/us-inc-deaths-confirmed-wk-avg')
def us_inc_deaths_confirmed_wk_avg():
    return us_inc_confirmed_wk_avg

@app.route('/us-agg-cum-deaths')
def us_agg_cum_deaths():
    return us_aggregates

@app.route('/us-agg-inc-deaths')
def us_agg_inc_deaths():
    return us_aggregates_daily

@app.route('/update/', methods=['GET', 'POST'])
def update():
    if request.method == 'POST':
        data = request.json
        print(data)
        #replace username with user id
        update_user_prediction('testUsername', data['data'], data['category'])
        return "Success"
    return 'None'

@app.route('/delete/', methods=["POST"])
def delete():
    if request.method == 'POST':
        print(request.json)
        delete_user_prediction('testUsername', request.json['category'])
        print("prediction deleted!")
        return "Success"  
    return "None"
    

@app.route('/login/', methods=['POST','GET'])
def login():
    if request.method == 'POST':
        data = request.json
        username = data['username']
        password = data['password']
        #print(username, password)
        if authenticate(username, password):
            return "Success"
        else:
            flash("Invalid username or password. Please try again", "error")
            return "Fail"
    else:
        if 'id' in session:
            return "Already logged in"
    return 'None'

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
            #return redirect(url_for("home"))
            return 'Success'
        else:
            flash("Username is already taken")
            return 'Fail'
            #return redirect(url_for("signin"))
    else:
        print("hmmm")
        #return redirect(url_for("signin"))
    return 'None'


@app.route("/logout/", methods=["POST"])
def logout():
    if request.method == "POST":
        if 'id' in session:
            session.pop('id')
            session.pop('name')
            session.pop('username')
            print("logut was a sucess")
    return 'Nonee'

@app.route('/user-status/')
def user_status():
    if 'id' in session:
        return dumps({
            'logged in': True,
            'id': session['id'],
            'name': session['name'],
            'username': session['username']
        })
    else:
        return dumps({'logged in': False})


@app.route('/user-data')
def leaderboard():
    all_users = list(mongo.db.users.find({},{'name': 1, 'score': 1}).sort('score',-1))
    return dumps(all_users)

@app.route('/user')
def profile():
    user = mongo.db.users.find({'username': session['username']})
    return json.dumps(user)

@app.route('/action/', methods=["POST"])
def addbio():
    if request.method == 'POST':
        bio = request.values.get('bio')
        location = request.values.get('location')
    user = mongo.db.users.find({'username': session['username']})
    user.insert({'bio':bio, 'location':location})
    #redirect('/user')

@app.route("/total")
def total():
    results = {}
    for model in forecast_data:
        results[model] = fetch_votes(model)
    return json.dumps(results)

if __name__ == "__main__":
    app.run(debug=True)
