import json
import os
import threading
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
import time

from dotenv import load_dotenv
from mongo import myConnection

from flask import Flask, jsonify, request

load_dotenv(Path(__file__).with_name(".env"))

APP_HOST = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT = int(os.getenv("APP_PORT", "8181"))
AEROAPI_KEY = os.getenv("AEROAPI_KEY")

app = Flask(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
mongo = myConnection("Flights", "Airports", MONGO_URI)
AIRPORTS_COOLDOWN_SECONDS = 60
airport_import_lock = threading.Lock()
airport_import_active = False

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.get("/")
def home():
    return jsonify({
        "message": "Flight tracker API is running",
        "status": "ok",
    })


@app.get("/api/airports")
def airports():
    try:
        return jsonify({"airports": mongo.airports()})
    except Exception as exc:
        app.logger.error("Unable to read airports: %s", exc)
        return jsonify({"error": "Unable to load airport data"}), 500


@app.route("/api/flights", methods=["GET", "OPTIONS"])
def flights():
    if request.method == "OPTIONS":
        response = app.make_response("")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    lat = request.args.get("lat", default="28.156468684830465", type=float)
    lon = request.args.get("lon", default="-82.50010740795891", type=float)
    dist = request.args.get("dist", default="250", type=int)

    url = f"https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}"

    try:
        req = Request(url, headers={"User-Agent": "flight-track/1.0"})
        with urlopen(req, timeout=20) as response:
            data = json.load(response)
    except (HTTPError, URLError, ValueError) as exc:
        return jsonify({"error": f"Unable to fetch ADS-B data: {exc}"}), 502

    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True, host=APP_HOST, port=APP_PORT)
