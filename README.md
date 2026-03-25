# VitalMap

An interactive Flask web application that visualises global births, deaths, and
natural population growth from 1950 to 2100 on a D3.js choropleth world map.

---

## Features

- **Interactive world map** — choropleth colouring by births, deaths, or natural
  growth for any year from 1950 to 2100
- **Year slider** — slide through history and into UN medium-variant projections
- **Metric switcher** — three colour-coded views with appropriate scales
- **Hover tooltip** — instant data for every country you mouse over
- **Country click** — select a country to see exact figures and a linked trend chart
- **Trend chart** — births and deaths lines for the selected country over all 150 years
- **Country search** — type to find and highlight any country on the map
- **Contact form** — POST form that persists messages to a local JSON file
- **GSAP landing page** — cinematic scroll-based animations guiding users into the data

---

## Tech stack

| Layer      | Technology |
|------------|-----------|
| Backend    | Python 3 · Flask |
| Templating | Jinja2 |
| Data       | CSV via Python `csv` module |
| Map        | D3.js v7 · GeoJSON (Natural Earth) |
| Animations | GSAP 3 + ScrollTrigger |
| Frontend   | Vanilla JavaScript · HTML5 · CSS3 |

No React, TypeScript, Tailwind, or any component framework.

---

## Folder structure

```
VitalMap/
├── app.py                         Flask application + API routes
├── requirements.txt               Python dependencies
├── .gitignore
├── README.md
├── submissions/                   Contact form messages (gitignored)
│   └── messages.json
├── templates/
│   ├── base.html                  Shared layout (navbar, footer, CDN links)
│   ├── home.html                  Landing page (6 sections + GSAP)
│   ├── visualization.html         Map page (controls, map, details, trend)
│   └── contact.html               Contact form
└── static/
    ├── css/
    │   ├── variables.css          CSS custom properties (design tokens)
    │   └── styling.css            All component and page styles
    ├── js/
    │   ├── main.js                Shared utilities (nav, flash, formatNum)
    │   ├── home.js                GSAP animations for Home page
    │   └── vizualization.js       D3 map, tooltip, trend chart, controls
    └── data/
        ├── births-and-deaths-projected-to-2100.csv   Main dataset
        └── world.geojson          Natural Earth country shapes (ISO3 ids)
```

---

## Installation and running

```bash
# 1. Clone or unzip the project
cd VitalMap

# 2. Create and activate a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the Flask development server
python app.py

# 5. Open in browser
#    http://127.0.0.1:5000
```

---

## Routes

| Method | Route          | Description |
|--------|---------------|-------------|
| GET    | `/`           | Home page (landing) |
| GET    | `/visualization` | Interactive world map |
| GET    | `/contact`    | Contact form |
| POST   | `/contact`    | Submits form, saves to `submissions/messages.json` |
| GET    | `/api/data`   | Returns full normalised dataset as JSON |

---

## Dataset

**File:** `static/data/births-and-deaths-projected-to-2100.csv`
**Source:** Our World in Data
**Rows:** ~38 600 (200+ countries × 1950–2100)

The API normalises the two column variants:
- Uses *estimate* values for 1950–2023 (where available)
- Falls back to *medium projection* values for 2024–2100

Final shape per record: `entity`, `code`, `year`, `births`, `deaths`, `natural_growth`

---

## Map data

`static/data/world.geojson` — Natural Earth 110m country polygons
Each feature has an `id` field matching the ISO 3166-1 alpha-3 code (e.g. `"DEU"`, `"BRA"`),
which directly joins to the CSV `code` column.

---

## Notes

- Contact form messages are written to `submissions/messages.json` (excluded from git).
- The app runs in Flask debug mode by default — do not deploy to production as-is.
- All data visualisation is client-side; only the `/api/data` fetch hits the server.
