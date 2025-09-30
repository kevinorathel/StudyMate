# Declare all API calls over here

# main.py
from dbconnect import get_cursor


with get_cursor() as cur:
    cur.execute("SELECT * from user_login;")
    print("Postgres version:", cur.fetchone())
