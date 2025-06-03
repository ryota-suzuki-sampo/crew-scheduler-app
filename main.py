from flask import Flask
from models import db
import os
from dotenv import load_dotenv

load_dotenv()  # .env を読み込む（ローカル開発用）

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

@app.route("/")
def index():
    return "船員配乗管理アプリ（DB接続完了）"

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
