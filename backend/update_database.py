from info import getClient
from info import token

import pymongo
import github
import pandas as pd
import time

start = time.time()

client = pymongo.MongoClient(getClient())
mydb = client['covid19-forecast']
mycol = mydb['forecasts']

g = github.Github(token())

# Reichlab forecasts repo
repo = g.get_repo("reichlab/covid19-forecast-hub")
contents = repo.get_contents("data-processed")

# Get all necessary files
csv_files = []
dirs = set()
while contents:
    file_content = contents.pop(0)
    if file_content.type == "dir":
        contents.extend(repo.get_contents(file_content.path))
        dirs.add(file_content.name)
    else:
        raw_url = file_content.download_url
        #print(raw_url)
        if '.csv' in raw_url:
            csv_files.append(raw_url)
            split_url = raw_url.split('/')
            model_name = split_url[split_url.index('data-processed') + 1]

            df = pd.read_csv(raw_url)
            df = df.loc[(df['target'].str.contains("wk"))]

            for i in range(len(df)):
                row = df.iloc[i]
                if row['location'] != 'US':
                    location = int(row['location']) 
                else:
                    location = row['location']

                target = row['target'][row['target'].index('ahead') + 6:]
                forecast_type = row['type']
                quantile = float(row['quantile'])
                forecast_date = row['forecast_date']
                target_end_date = row['target_end_date']
                value = float(row['value'])

                # Inserting documents
                model_dict = {
                    'model': model_name, 
                    'location': location, 
                    'target': target,
                    'type': forecast_type,
                    'quantile': quantile,
                    'forecast_date': forecast_date,
                    'target_end_date': target_end_date,
                    'value': value
                }

                '''
                forecast_made = mycol.find_one({'model': model_name, 'location': location, 'target': target, 'quantile': quantile, 'target_end_date': target_end_date })
                if forecast_made:
                    mycol.update_one({'model': model_name, 'location': location, 'target': target, 'quantile': quantile, 'target_end_date': target_end_date },
                     {'$set': { "forecast_date": forecast_date, "value": value } })
                else:
                '''
                mycol.insert_one(model_dict)

end = time.time()
print(end-start)