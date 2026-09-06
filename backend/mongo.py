import pymongo
import json
import datetime



class myConnection:
    def __init__(self, dbName, collectionName, url):
        self.client = pymongo.MongoClient(url)
        self.db = self.client[dbName]
        self.col = self.db[collectionName]

    def insert(self, msg):
        airport_code = msg.get("airport_code")
        if not airport_code:
            raise ValueError("Airport data must include airport_code")

        return self.col.update_one(
            {"airport_code": airport_code},
            {"$setOnInsert": msg},
            upsert=True,
        )

    def airports(self):
        return list(
            self.col.find(
                {"icao": {"$exists": True}, "lat": {"$exists": True}, "lon": {"$exists": True}},
                {"_id": 0, "icao": 1, "name": 1, "city": 1, "country": 1, "lat": 1, "lon": 1},
            )
        )



class message:
    def __init__(self, pcap, event_type):
        self.pcap = pcap
        self.event_type = event_type

    def buildMsg(self):
        message = {
            "pcap" : self.pcap,
            "event_type" : self.event_type,
            "timestamp" : datetime.datetime.now().timestamp()
        }
        print(json.dumps(message))
        return message