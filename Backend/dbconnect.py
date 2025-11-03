
import psycopg2
from pgvector.psycopg2 import register_vector
from contextlib import contextmanager


@contextmanager
def get_cursor():
    conn = psycopg2.connect(
        dbname="study_db_hlh8",
        user="root",
        password="7jmM6QXxiXQDkdvon446ftlYVaixWqoL",
        host="dpg-d3onbjmmcj7s739ebggg-a.virginia-postgres.render.com",
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




