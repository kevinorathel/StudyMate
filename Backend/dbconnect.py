
import psycopg2
from contextlib import contextmanager


@contextmanager
def get_cursor():
    conn = psycopg2.connect(
        dbname="study_db_gamx",
        user="root",
        password="mGc4H5IoMM3SlCPfSpeReoWlEa1cy5Dr",
        host="dpg-d34trn6r433s738c5560-a.virginia-postgres.render.com",
        port="5432",
        sslmode="require"
    )
    cur = conn.cursor()
    try:
        yield cur
        conn.commit()
    finally:
        cur.close()
        conn.close()
