import string
import secrets
from random_username.generate import generate_username
import pandas as pd
import random


def generate_password():
    alphabet = string.ascii_letters + string.digits
    while True:
        password = ''.join(secrets.choice(alphabet) for i in range(10))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and sum(c.isdigit() for c in password) >= 3):
            break
    return password

def get_valid_special_users():
    df = pd.read_csv('backend/special_users.csv')
    df = df.filter(items=['Name', 'Email'])
    df = df.rename(columns={"Name": "name", "Email": "email"})
    df = df.dropna()
    df.to_csv('valid users.csv')
    return df.to_dict('records')
