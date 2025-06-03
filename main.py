from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "船員配乗管理アプリ 起動中"

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))  # Railway用のPORT環境変数に対応
    app.run(host="0.0.0.0", port=port)
