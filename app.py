print("APP.PY IS RUNNING")

from flask import Flask

app = Flask(__name__)

@app.route("/")
def home():
    return "Flask is running!"

if __name__ == "__main__":
    print("STARTING SERVER...")
    app.run(debug=True)
