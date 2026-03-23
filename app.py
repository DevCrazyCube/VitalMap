from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import csv
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "vitalmap-secret-key"

DATA_FILE = "static/data/births-and-deaths-projected-to-2100.csv"
SUBMISSIONS_FILE = "submissions.messages.json"



def load_dataset():
    rows = []

    with open(DATA_FILE, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:

            # create variables out of all rows
            entity = row["Entity"]
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

            # add everything to list
            rows.append({
                "entity": entity,
                "code": code,
                "year": year,
                "births": births,
                "deaths": deaths,
                "natural_growth": births - deaths
            })

    return rows



def save_contact_message(name, email, message):
    os.makedirs("submissions", exist_ok=True)

    existing = []
    if os.path.exists(SUBMISSIONS_FILE):
        with open(SUBMISSIONS_FILE, "r", encoding="utf-8") as file:
            try:
                existing = json.load(file)
            except json.JSONDecodeError:
                existing = []

    existing.append({
        "name": name,
        "email": email,
        "message": message,
        "submitted_at": datetime.utcnow().isoformat()
    })

    with open(SUBMISSIONS_FILE, "w", encoding="utf-8") as file:
        json.dump(existing, file, indent=2)



# / App routing / #

@app.route("/")
def home():
    return render_template("home.html", page="home")


@app.route("/visualization")
def visualization():
    return render_template("visualization.html", page="visualization")


@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip()
        message = request.form.get("message", "").strip()

        if not name or not email or not message:
            flash("Please fill in all fields.", "error")
            return redirect(url_for("contact"))

        save_contact_message(name, email, message)
        flash("Your message has been submitted successfully.", "success")
        return redirect(url_for("contact"))

    return render_template("contact.html", page="contact")


@app.route("/api/data")
def api_data():
    data = load_dataset()
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True)
