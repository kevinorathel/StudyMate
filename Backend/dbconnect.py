
import psycopg2
from pgvector.psycopg2 import register_vector
from contextlib import contextmanager

import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()


@contextmanager
def get_cursor():
    conn = psycopg2.connect(
        dbname=os.environ["DATABASE_NAME"],
        user=os.environ["DATABASE_USER"],
        password=os.environ["DATABASE_PASSWORD"],
        host=os.environ["DATABASE_HOST"],
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