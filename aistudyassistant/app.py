
from flask import Flask
from flask_cors import CORS

from aistudyassistant.routes.auth import auth_bp

app = Flask(__name__)
app.secret_key = "dev-secret"  # later move to .env

CORS(app, supports_credentials=True)

app.register_blueprint(auth_bp)

@app.route("/api/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(debug=True)