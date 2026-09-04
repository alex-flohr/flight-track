import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, jsonify, request

app = Flask(__name__)



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
    app.run(debug=True, host="0.0.0.0", port=8181)
