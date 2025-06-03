from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models import db
from routes import api
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
app.register_blueprint(api)

@app.route("/")
def index():
    return "船員配乗管理アプリ（DB接続完了）"

# ✅ 一時的にテーブル作成
with app.app_context():
    print("📦 Creating tables...")
    db.create_all()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
