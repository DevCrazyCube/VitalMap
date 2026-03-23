from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import csv
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "vitalmap-secret-key"

DATA_FILE = "/static/data/births-and-deaths-projected-to-2100.csv"
SUBMISSION_FILE = "submissions.messages.json"



def load_dataset():
    rows = []

    with open(DATA_FILE, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            entity = row["Entiry"]
            code = row["Code"]
            year = int(row ["Year"])

            deaths_est = row["Deaths - Sex: all - Age: all - Variant: estimates"]
            deaths_med = row["Deaths - Sex: all - Age: all - Variant: medium"]
            births_est = row["Births - Sex: all - Age: all - Variant: estimates"]
            births_med = row["Births - Sex: all - Age: all - Variant: medium"]

            # pick estimates when available, otherwise medium projection
            deaths = deaths_est if deaths_est not in ("", None) else deaths_med
            births = births_est if births_est not in ("", None) else births_med

            if births in ("", None) or deaths in ("", None):
                continue

            births = float(births)
            deaths = float(deaths)

            rows.append({
                "entity": entity,
                "code": code,
                "year": year,
                "births": births,
                "deaths": deaths,
                "natural_growth": births - deaths
            })

            print(rows)
    return rows



