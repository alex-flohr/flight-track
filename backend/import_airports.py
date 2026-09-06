import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")


def import_airports(json_path):
    with json_path.open(encoding="utf-8") as file:
        airports = json.load(file)

    if not isinstance(airports, list):
        raise ValueError("Airport JSON must contain an array of airport records")

    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    client = MongoClient(mongo_uri)
    collection = client["Flights"]["Airports"]
    collection.create_index("icao", unique=True)

    operations = []
    skipped = 0
    for airport in airports:
        icao = airport.get("icao")
        if not icao:
            skipped += 1
            continue

        operations.append(
            UpdateOne({"icao": icao}, {"$set": airport}, upsert=True)
        )

    if not operations:
        return 0, 0, skipped

    result = collection.bulk_write(operations)
    return result.upserted_count, result.modified_count, skipped


def main():
    parser = argparse.ArgumentParser(
        description="Import airport JSON into MongoDB Flights.Airports by ICAO code."
    )
    parser.add_argument(
        "json_path",
        nargs="?",
        type=Path,
        default=BASE_DIR / "airports.json",
        help="Path to the airport JSON array",
    )
    args = parser.parse_args()

    inserted, updated, skipped = import_airports(args.json_path)
    print(f"Inserted: {inserted}; updated: {updated}; skipped without ICAO: {skipped}")


if __name__ == "__main__":
    main()
