import psycopg2

# Connection details from your Render DB
conn = psycopg2.connect(
    dbname="study_db_gamx",
    user="root",
    password="mGc4H5IoMM3SlCPfSpeReoWlEa1cy5Dr",
    host="dpg-d34trn6r433s738c5560-a.virginia-postgres.render.com",
    port="5432",
    sslmode="require"   # Render requires SSL
)

cur = conn.cursor()

# Simple test query
cur.execute("SELECT * FROM user_login;")
print("Postgres version:", cur.fetchone())

cur.close()
conn.close()
