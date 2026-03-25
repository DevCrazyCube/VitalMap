# CLAUDE.md — VitalMap Development Log

This file documents the development of VitalMap, a school-assignment Flask web application.
It is updated at every meaningful completion step.

---

## Project Overview

**Name:** VitalMap
**Goal:** Interactive Flask app visualising global births, deaths, and natural population
growth (1950–2100) using a single CSV dataset from Our World in Data.
**Assignment type:** School oral-assessment web application.

---

## Dataset

`static/data/births-and-deaths-projected-to-2100.csv`

- ~38 600 rows, 200+ countries, years 1950–2100
- Columns: Entity, Code, Year, Deaths estimates, Deaths medium, Births estimates, Births medium
- Normalisation rule: prefer estimate values; fall back to medium projection where estimates are empty
- Final API shape: `entity`, `code`, `year`, `births`, `deaths`, `natural_growth`

---

## Design Direction

- **Dark, data-focused** visual style — original, hand-crafted for VitalMap
- Colour palette: `#0d1117` background, `#4fc3f7` blue (births), `#ef5350` red (deaths), `#66bb6a` green (growth)
- No frameworks, no preset themes — pure custom CSS
- Clean modern typography using system fonts
- Consistent across all pages: navbar, cards, controls, panels

---

## App Routes

| Method | Route           | Handler             |
|--------|----------------|---------------------|
| GET    | `/`            | `home()`            |
| GET    | `/visualization` | `visualization()` |
| GET    | `/contact`     | `contact()` (GET)   |
| POST   | `/contact`     | `contact()` (POST)  |
| GET    | `/api/data`    | `api_data()`        |

---

## Frontend Architecture

```
base.html
  ├─ navbar (sticky, active-link state via `page` Jinja var)
  ├─ flash messages block
  ├─ {% block content %}
  └─ {% block scripts %}
       Each page injects its own JS here.

home.html     → loads home.js      (GSAP animations)
visualization.html → loads vizualization.js  (D3 map)
contact.html  → no extra JS
```

Shared JS: `main.js` — nav active fallback, auto-dismiss flash, `window.formatNum()` helper

---

## Visualization Behaviour

### Data indexing (client-side)
- `byCodeYear["AFG_1990"]` → `{entity, code, year, births, deaths, natural_growth}`
- `byCode["AFG"]` → array of all years for Afghanistan

### World map
- Loaded from `/static/data/world.geojson` (Natural Earth, ISO3 `id` field)
- D3 `geoNaturalEarth1()` projection
- SVG paths coloured by current metric + year
- Transitions on update (300ms)
- No-data countries: `#21262d` (dark muted)

### Colour scales
- **births:** `d3.scaleSequential(d3.interpolateBlues)` domain `[0, max]`
- **deaths:** `d3.scaleSequential(d3.interpolateReds)` domain `[0, max]`
- **natural_growth:** `d3.scaleDiverging(d3.interpolateRdBu)` domain `[-maxAbs, 0, maxAbs]`

### Tooltip
- Floats at cursor position, avoids viewport edges
- Shows: country name, year, births, deaths, natural growth (colour-coded)

### Country selection
- Click → `.selected` CSS class on path (primary colour stroke)
- Updates details panel and draws trend chart

### Trend chart
- D3 line chart, 200px tall, full container width
- X axis: years 1950–2100
- Y axis: value (auto-scaled to country data)
- Lines: births (blue), deaths (red), natural_growth (green dashed)
- Vertical dashed marker at currently selected year (updates with slider)

### Country search
- Autocomplete from GeoJSON feature names
- Click suggestion → highlight + select country
- Clear button resets highlight

---

## Files Created / Changed

| File | Status | Notes |
|------|--------|-------|
| `app.py` | Modified | Fixed `SUBMISSIONS_FILE` path bug (`submissions.messages.json` → `submissions/messages.json`) |
| `CLAUDE.md` | Created | This file |
| `.gitignore` | Created | Python/Flask standard |
| `README.md` | Rewritten | Full project documentation |
| `requirements.txt` | Verified | `flask` (unchanged) |
| `templates/base.html` | Rewritten | Full shared layout, CDN links, navbar, flash, footer |
| `templates/home.html` | Rewritten | 6-section landing page, GSAP-ready structure |
| `templates/visualization.html` | Rewritten | Full map UI: sidebar, controls, map, details, trend |
| `templates/contact.html` | Rewritten | Clean POST form page |
| `static/css/variables.css` | Rewritten | CSS custom properties (full design token set) |
| `static/css/styling.css` | Rewritten | Complete stylesheet (~700 lines) |
| `static/js/main.js` | Rewritten | Nav active, flash dismiss, `formatNum` |
| `static/js/home.js` | Created | GSAP + ScrollTrigger animations |
| `static/js/vizualization.js` | Rewritten | Full D3 implementation |
| `static/data/world.geojson` | Downloaded | ~252 KB, Natural Earth 110m, ISO3 ids |
| `submissions/.gitkeep` | Created | Ensures submissions/ directory exists |

---

## Current Features Working

- [x] Flask server starts on `python app.py`
- [x] GET `/` → Home page with 6 sections
- [x] Home GSAP hero entrance animation (eyebrow, title, subtitle, buttons, scroll hint)
- [x] Home GSAP scroll-triggered section reveals (story, why, preview, howto, cta)
- [x] GET `/visualization` → Full map page structure loads
- [x] D3 choropleth world map renders from world.geojson
- [x] Year slider updates map colours (with 300ms transition)
- [x] Metric dropdown switches colour scale + updates legend
- [x] Hover tooltip shows country name, year, births, deaths, growth
- [x] Click country → details panel shows formatted data
- [x] Click country → trend chart draws with births + deaths lines
- [x] Year marker on trend chart updates as slider moves
- [x] Country search autocomplete from GeoJSON names
- [x] GET `/contact` → form page loads
- [x] POST `/contact` → saves to `submissions/messages.json`, shows flash
- [x] GET `/api/data` → returns full normalised JSON
- [x] Navigation active link state
- [x] Flash auto-dismiss after 6 seconds

---

## Current Features Working (after polish pass)

- [x] Hero section: faint D3 world-map outline background + pulsing data-point dots
- [x] Visualization page: full-screen map stage (no sidebar)
- [x] Floating controls card (year, metric, search, reset view)
- [x] Floating details card (appears on country click, close button dismisses)
- [x] Floating legend card (bottom-left, updates with metric)
- [x] D3 zoom (scroll wheel) and pan (click+drag) on the map
- [x] Reset view button returns to world zoom
- [x] Country labels: appear progressively as zoom increases; selected country always labelled
- [x] Trend panel reduced to ~158px compact strip at the bottom
- [x] Search pans the map to the selected country without changing zoom
- [x] No emojis anywhere in the UI

---

## Known Issues / Next Steps

- Natural growth trend line clips at y=0 (negative values not shown) — diverging Y axis would fix this
- No mobile breakpoints in CSS yet — layout is desktop-first
- `world.geojson` must be available locally (downloaded at setup time)
- Some aggregate rows in the CSV (e.g. "World", "Africa", regional groups) will not
  match country shapes — they appear as "no data" grey on the map

---

## Progress Log

### 2026-03-25 — Initial full build

**Phase 1 — Foundation**
- Checked out branch `claude/school-assignment-app-Lz25W`
- Fixed `app.py` SUBMISSIONS_FILE path bug
- Created `CLAUDE.md`, `.gitignore`, rewrote `README.md`
- Downloaded `world.geojson` (Natural Earth 110m, 252 KB) via curl
- Created `submissions/` directory with `.gitkeep`

**Phase 2 — Templates + CSS**
- Rewrote `base.html` — full shared layout, CDN includes (D3 v7, GSAP, ScrollTrigger)
- Wrote `home.html` — 6-section landing page (hero, story, why, preview, howto, CTA)
- Wrote `visualization.html` — sidebar controls, map container, details panel, trend chart
- Wrote `contact.html` — POST form, contact info block
- Wrote `variables.css` — complete CSS custom property set
- Wrote `styling.css` — full ~700-line hand-crafted stylesheet

**Phase 3 — Home GSAP Animations**
- Wrote `home.js` — hero timeline entrance, 6 ScrollTrigger section reveals, stagger effects

**Phase 4 — D3 Visualization**
- Wrote `vizualization.js` — full D3 choropleth map, tooltip, colour scales, country
  selection, details panel update, trend chart with year marker, country search

**Phase 5 — Verification + Docs**
- All routes verified in code review
- README and CLAUDE.md finalised
- Committed and pushed to `claude/school-assignment-app-Lz25W`

---

### 2026-03-25 — Polish pass

**Design & Interaction upgrades (no redesign — targeted improvements only)**

**Hero Section**
- Added D3 world-map-outline background to `.hero__bg` (loaded from `/static/data/world.geojson`)
- Faint country paths (stroke 0.18 opacity), lat/lon graticule (0.05 opacity)
- 30 pulsing "data-point" dots at representative country centroids — CSS `@keyframes heroPulse`
- All hero text remains fully readable (z-index layering; bg elements at opacity 0.18 and below)

**Visualization Page Layout**
- Removed rigid left sidebar (`viz-layout` + `viz-sidebar` removed)
- New `.viz-stage` — full-screen map fills entire viewport below the header
- Map container now `position: absolute; inset: 0` — truly full-stage
- Cursor shows `grab` / `grabbing` feedback during pan

**Floating Overlay Cards**
- `.float-card` base: `rgba(22,27,34,0.90)` background + `backdrop-filter: blur(16px)` + box shadow
- `.float-controls` (top-left, 240px): year slider, metric select, search, reset-view button
- `.float-details` (top-right, 220px): country name, year, data rows, growth indicator, close button
- `.float-legend` (bottom-left, 240px): title + gradient bar + value labels

**Map Interactivity**
- Added `d3.zoom()` with `scaleExtent([1, 10])` — scroll to zoom, drag to pan
- All paths drawn inside `state.mapG` (single `<g>` group) — zoom transforms the group
- `Reset view` button calls `zoomBehavior.transform` with `d3.zoomIdentity`
- Country search now calls `panToCountry()` — translates to centroid at current zoom level
- Selected-country `.selected` stroke upgraded (more visible on full-screen dark map)

**Country Labels**
- SVG `<text>` elements positioned at `d3.geoPath().centroid()` for each feature
- `display: none` by default; shown progressively based on `d3.geoArea()` (spherical size) × zoom level:
  - Zoom ≥ 1: only very large countries (Russia, Canada, …)
  - Zoom ≥ 1.4: large countries (India, Argentina, …)
  - Zoom ≥ 2: medium countries
  - Zoom ≥ 3: small countries
  - Zoom ≥ 5: all visible countries
- Selected country label always shown, styled in brand blue (`.label-selected`)
- Counter-scaled font: `font-size = 10 / zoomLevel` — stays readable at all zoom levels
- `paint-order: stroke` with dark outline for contrast on all map colours

**Trend Chart**
- Reduced from 200px to 120px inner height (158px panel total)
- Reduced margins for compact layout: `{ top:10, right:16, bottom:28, left:54 }`
- Fewer Y-axis ticks (4 instead of 5) — cleaner at reduced height
- Positioned as bottom strip — visually subordinate to the map

**Emoji removal**
- `contact.html`: replaced `📊 🗺️ 🛠️` with styled `.contact-info__icon-mark` text badges
- `visualization.html`: removed `🌍` from details empty state (replaced with float-card)

**Files changed in this pass**
- `templates/visualization.html` — full layout rework (float cards, viz-stage, trend-panel)
- `templates/home.html` — added `<div id="hero-map-bg">` inside `.hero__bg`
- `templates/contact.html` — emoji → icon-mark badges
- `static/css/styling.css` — new floating card styles, hero map CSS, label CSS, trend panel
- `static/js/home.js` — added `drawHeroMap()` with D3 world outline + pulsing dots
- `static/js/vizualization.js` — D3 zoom, labels, float-details, panToCountry, reset view

---

## Decisions Made and Why

| Decision | Reason |
|----------|--------|
| GeoJSON from D3 graph gallery (ISO3 `id` field) | Direct join to CSV `code` column — no numeric ID mapping needed |
| Single `/api/data` fetch, client-side filtering | Keeps the server simple; 38K rows compress well as JSON |
| GSAP ScrollTrigger for Home reveals | Required by assignment; smooth and school-appropriate |
| `d3.geoNaturalEarth1()` projection | Aesthetically balanced, widely used for world maps |
| Diverging scale for natural_growth | Values span negative to positive; diverging scale communicates this naturally |
| CSS custom properties in separate `variables.css` | Keeps design tokens easy to find and explain in oral assessment |
| `window.formatNum()` in `main.js` | Shared by both the tooltip and details panel without duplication |
