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
- Ocean: SVG `<radialGradient>` — `#0e2540` centre → `#060f1a` edge (deep navy)
- No-data countries: `#131f2e` (dark blue-gray, harmonises with ocean)

### Colour scales (dark-adapted "night atlas" palette)
- **births:** `d3.scaleSequential(_interpBirths)` — dark navy `#0b1e30` → luminous cyan `#4fc3f7`
- **deaths:** `d3.scaleSequential(_interpDeaths)` — very dark muted red `#1c080c` → coral-red `#ef5350`
- **natural_growth:** `d3.scaleDiverging(_interpGrowth)` — deep red `#9b1717` → dark slate `#1a2635` → steel blue `#1565c0`
- No-data countries: `#131f2e` (dark blue-gray, harmonises with ocean)

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

## Current Features Working (after refinement pass)

- [x] Map panning bounded by `translateExtent` — cannot drift off into void
- [x] Viz page is fully immersive — large header strip removed, map fills the stage
- [x] Floating year badge (top-centre, `#year-badge`) replaces the old header year display
- [x] Controls card: lighter (less padding, less opacity), no "Controls" label heading
- [x] Float cards: slightly reduced opacity/blur — feel lighter and less obtrusive
- [x] Body `viz-body` class applied server-side via Jinja (`base.html`) — no JS class injection
- [x] `{% block head %}` JS removed from visualization.html — cleaner template inheritance

---

## Current Features Working (after night-atlas map styling pass)

- [x] Ocean rendered as deep navy radial gradient (SVG defs `#ocean-gradient`)
- [x] No-data countries use dark blue-gray `#131f2e` (blends with ocean)
- [x] Births choropleth: dark navy → luminous cyan (dark-map adapted)
- [x] Deaths choropleth: dark muted red → coral-red (dark-map adapted)
- [x] Natural growth choropleth: deep red → dark slate → steel blue (dark-map adapted)
- [x] Country borders: subtle blue-gray `rgba(70,120,175,0.22)` at 0.3px
- [x] Graticule: barely-visible navy `rgba(30,75,140,0.10)` at 0.3px
- [x] Hover: `brightness(1.20)` filter + soft cyan-blue border stroke
- [x] Selected: 2px cyan stroke + `drop-shadow` glow
- [x] No-data hover: filter suppressed, cursor default preserved
- [x] Labels: lighter weight, thinner navy halo (1.8px) — no chunky capsule
- [x] Selected label: cyan semi-bold with minimal halo
- [x] Legend gradient bar updated to match dark-adapted scales

---

## Current Features Working (after home-page redesign + pan fix pass)

- [x] Map pan bounds: `translateExtent([[0,0],[W,H]])` — zero drift at zoom 1, correct freedom at higher zoom
- [x] Home story section: horizontal metric-row layout (not card grid) — births/deaths/growth as full-width rows with accent names, description, scale tag
- [x] Home why section: monumental stat blocks (4-column grid), single lead paragraph — no two-column layout
- [x] Home preview section: full-height D3 world map frame (min 380px, up to 68vh) — real map rendered by `drawPreviewMap()` in home.js
- [x] Home howto section: compact inline strip (4 steps in a flex row with arrow separators) — replaces card grid
- [x] Home CTA section: atmospheric radial glow element, kicker + large headline, no `.cta-final__sub` text block
- [x] `reveal-fade` class added — gentler 18px lift for rows and stat blocks, distinct from 40px `reveal-up`
- [x] GSAP targets updated in home.js to match new class names throughout all sections

---

## Current Features Working (after final polish pass)

- [x] Map pan bounds: sphere-projected `translateExtent(pathGen.bounds({type:"Sphere"}))` — prevents drift into empty margins above/below the sphere at any zoom level
- [x] MultiPolygon label centroid fix: `mainCentroid()` helper uses `d3.geoArea()` to find the largest polygon ring and returns its centroid — France, Norway, USA, Indonesia, Russia, etc. all labelled on their mainland
- [x] `panToCountry()` also uses `mainCentroid()` — search pans to correct landmass
- [x] `buildColorScale()` DOM scan removed — uses `state.allData` directly (always populated)
- [x] Label visibility updates RAF-throttled via `scheduleLabels()` — single DOM pass per rendered frame
- [x] Font-size counter-scaling moved inside `updateLabelVisibility()` — applied only to visible labels
- [x] Home story section: intro block removed (no kicker/lead paragraph above metric rows)
- [x] Metric rows simplified: index numbers and scale tags removed — just name + description
- [x] Home why section: lead paragraph removed — stat blocks stand alone
- [x] Preview overlay: title and hint text removed — CTA button only, map speaks for itself
- [x] Howto section: separator arrows removed — steps read naturally left-to-right
- [x] CTA section: kicker label removed — headline stands alone

---

## Current Features Working (after cinematic landing pass)

- [x] CTA language fully unified: "Open the Map" used in navbar, hero, preview, and final CTA
- [x] 6 sections → 4 sections: story + why merged into `.narrative`; howto + cta-final merged into `.cta-final`
- [x] All ScrollTrigger animations bidirectional: `toggleActions: "play reverse play reverse"`
- [x] Preview: parallax on map background — depth effect

---

## Current Features Working (after landing page cinematic redo)

- [x] Hero: unchanged — atmospheric D3 background, pulsing dots, GSAP timeline entrance
- [x] Story section: three demographic forces as giant chapter headings (`clamp(4rem, 9vw, 8rem)`)
  — metric word (births / deaths / growth) in full accent colour, stacked above indented text
  — left-border accent line per chapter (coloured per metric at 28% opacity)
  — each chapter has its own ScrollTrigger: metric slides from left, text fades up behind it
- [x] Gateway section: D3 world map at `min(88vh, 760px)` height — the visual portal into the product
  — vignette overlay (radial-gradient, dark edges / clear centre)
  — overlay content: thin uppercase label + `Open the Map` button with CSS glow-pulse
  — GSAP parallax on map background (`scale: 1.12`, `scrub: 1.5`, y: `-5%` → `5%`)
  — content fades up bidirectionally on enter/exit
- [x] Finale section: centred, surface background, single headline + two buttons
  — scale-from-slightly-smaller entrance (`scale: 0.96` → `scale: 1`), bidirectional
- [x] CTA unified: "Open the Map" everywhere — navbar, hero, gateway, finale
- [x] All GSAP bidirectional (`toggleActions: "play reverse play reverse"`)
- [x] `drawGatewayMap()` replaces `drawPreviewMap()` — uses `#gateway-map-bg` / `#gateway-frame` IDs

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

### 2026-03-25 — Night-atlas map styling pass

**Goal:** Integrate the map fully into the dark visual language of the site. The previous
map used light D3 colour scales (interpolateBlues, interpolateReds, interpolateRdBu) that
produce light colours at low values — fine on white backgrounds, but disconnected on the
dark design.

**Ocean**
- Replaced flat `#0a0f14` sphere fill with an SVG `<radialGradient>` (`#ocean-gradient`)
- Centre: `#0e2540` (deep navy blue) → 55%: `#091929` → edge: `#060f1a`
- Inline `.attr("fill", "url(#ocean-gradient)")` on the sphere path; CSS `.sphere` retained as fallback

**Country fills**
- Replaced D3 built-in interpolators with three custom functions defined before METRIC_META:
  - `_interpBirths`: `#0b1e30` → `#4fc3f7` — dark navy to luminous cyan
  - `_interpDeaths`: `#1c080c` → `#ef5350` — near-black muted red to coral-red
  - `_interpGrowth` (diverging): `#9b1717` → `#1a2635` → `#1565c0`
- Low values now blend smoothly into the ocean base instead of turning white/light
- No-data fill: `#21262d` → `#131f2e` (dark blue-gray, harmonises with ocean)

**Borders**
- Default stroke: `#30363d` (gray) → `rgba(70, 120, 175, 0.22)` at 0.3px — subtle blue-gray
- Coastlines are visible as the slightly darker ocean contrast; no separate treatment needed
- Graticule: `var(--color-border-soft)` → `rgba(30, 75, 140, 0.10)` — barely-visible navy grid

**Hover**
- Removed harsh near-white stroke (`#e6edf3`) → soft cyan-blue `rgba(130, 195, 240, 0.65)` at 0.7px
- Added `filter: brightness(1.20)` — country brightens subtly on hover
- Added `filter` to the CSS transition list for smoothness
- No-data countries: hover filter suppressed (`filter: none`), border reset

**Selected state**
- Cyan stroke kept (`var(--color-primary)`) at 2px
- Added `filter: drop-shadow(0 0 5px rgba(79,195,247,0.48))` — luminous glow
- Hover-over-selected intensifies glow slightly

**Labels**
- Fill: `var(--color-text)` (#e6edf3, too bright) → `rgba(185, 210, 230, 0.70)` (muted light)
- Font-weight: medium → normal (lighter, less aggressive)
- Halo stroke-width: 3px → 1.8px (removes chunky capsule appearance)
- Halo colour: `rgba(13,17,23,0.75)` → `rgba(6,15,26,0.55)` (deeper navy, lower opacity)
- Selected label: semi-bold, 2px halo — readable without being heavy

**Legend gradient bar**
- births: `linear-gradient(#e3f2fd → #1565c0)` → `linear-gradient(#0b1e30 → #4fc3f7)`
- deaths: `linear-gradient(#ffebee → #b71c1c)` → `linear-gradient(#1c080c → #ef5350)`
- natural_growth: `linear-gradient(#ef5350, #fff, #1565c0)` → `linear-gradient(#9b1717, #1a2635, #1565c0)`

**Files changed in this pass**
- `static/js/vizualization.js` — custom interpolators, SVG defs/gradient, no-data color, legend
- `static/css/styling.css` — country-path rules, graticule, sphere fallback, label system

---

### 2026-03-25 — Refinement pass (layout, pan bounds, controls)

**Pan bounds**
- Added `d3.zoom().translateExtent([[-W*1.5,-H*1.5],[W*2.5,H*2.5]])` in `drawMap()`
- Prevents the map from drifting more than 1.5× the viewport width/height off-screen
- Reset view button still works cleanly; zoom/pan fully preserved

**Header removal**
- Removed the full-width `.viz-header` band (title + subtitle + big year badge)
- Replaced with a small `.viz-year-badge` floating pill (top-centre of the stage, `id="year-badge"`)
- Updated `setupControls()` to update `#year-badge` instead of the removed `#header-year`
- Map stage now fills all space below the navbar — more immersive

**Controls lighter feel**
- Removed the "Controls" float-card header row from the HTML
- Reduced `.float-controls` padding (`space-5` → `space-4`) and gap (`space-4` → `space-3`)
- Reduced card width 240px → 220px
- Slightly reduced `.float-card` base opacity and shadow — less obtrusive overlay

**Template/HTML structure**
- `base.html`: added `class="{{ 'viz-body' if page == 'visualization' else '' }}"` to `<body>`
  — class is now applied server-side (Jinja) instead of via JS at runtime
- `visualization.html`: removed `{% block head %}` JS script entirely
- HTML structure remains valid: DOCTYPE, html, head, body all present in base.html
- All child templates extend base.html correctly

**Files changed in this pass**
- `templates/base.html` — `viz-body` class via Jinja on `<body>`
- `templates/visualization.html` — removed header strip, removed JS head block, added year badge, removed "Controls" card header
- `static/css/styling.css` — removed `.viz-header` rules, added `.viz-year-badge` rules, lighter `.float-card` and `.float-controls`
- `static/js/vizualization.js` — `translateExtent`, `yearBadge` replaces `headerYear`

---

### 2026-03-25 — Home page redesign + pan bounds fix

**Pan bounds fix**
- `translateExtent([[0, 0], [W, H]])` — the correct D3 pattern
- At zoom 1: no panning (map fills viewport exactly)
- At zoom k>1: panning allowed within the map's world bounds × k, no drift possible
- Previous `[-W*1.5, -H*1.5]` to `[W*2.5, H*2.5]` was too permissive and didn't scale with zoom

**Story section redesign**
- Removed generic 3-card grid
- New horizontal metric-row layout: full-width rows with index number, large accent name, description, scale tag
- Rows separated by subtle border lines — feels like a table of contents or editorial list
- Hover lifts the row slightly and adds a faint background — interactive without being heavy
- New `.story__intro` replaces `.story__header` — kicker + lead paragraph intro

**Why section redesign**
- Removed two-column text + stats layout
- New: single lead paragraph above, four stat blocks in a 4-column grid below
- `.stat-block` replaces `.stat-card` — larger value numbers (`clamp(2.25rem, 4vw, 3rem)`), hover state
- Stats now feel monumental, not like a dashboard widget
- `reveal-fade` stagger on stat blocks (not `from`, which caused jump on re-entry)

**Preview section redesign**
- Removed fake SVG blob placeholder
- Full-height frame (`min(68vh, 580px)`) with actual D3 world map rendered by `drawPreviewMap()`
- Map uses night-atlas palette: `#071929` ocean, `#14202d` countries, `rgba(79,130,180,0.30)` borders
- Vignette overlay (`radial-gradient`) keeps text readable over the map
- Single large CTA button + hint text — nothing else in the frame
- Feels like a real doorway into the map experience

**How-to section redesign**
- Removed 4-box card grid
- New compact horizontal flex row: 4 steps with `→` separators
- Minimal — step number, title, one-line description
- Padding reduced to `var(--space-12)` — quick to scan, not a manual
- `reveal-fade` stagger with `stagger: 0.10`

**CTA section redesign**
- Added `.cta-final__glow` — decorative radial gradient element (no emoji, no image)
- Added `.cta-final__kicker` — uppercase label above the headline
- Headline: "Every country. Every year. All in one map." — more direct and cinematic
- Font size scaled with `clamp(2rem, 4vw, 3rem)` — responsive
- Removed `.cta-final__sub` prose paragraph — headline does the work

**Pacing improvements**
- Background rhythm: bg (hero) → bg (story) → surface (why) → bg (preview) → surface (howto+CTA)
- Story and why sections have less equal padding (space-20) vs. hero-height sections
- Preview section breaks the rhythm completely — full height, no container, cinematic
- Howto and CTA are deliberately lighter/shorter after the heavy preview

**New CSS class: `reveal-fade`**
- 18px initial translateY (vs. 40px for `reveal-up`) — gentler for rows and blocks
- Used in story rows, stat blocks, howto steps

**Files changed in this pass**
- `static/js/vizualization.js` — `translateExtent([[0,0],[W,H]])` (correct pan bounds)
- `templates/home.html` — full section restructure (story, why, preview, howto, cta-final)
- `static/css/styling.css` — replaced all home-page section CSS; added `.reveal-fade`
- `static/js/home.js` — updated GSAP targets; added `drawPreviewMap()`
- `CLAUDE.md` — updated

---

### 2026-03-25 — Final polish pass (correctness, performance, declutter)

**Map correctness**
- `mainCentroid(feature, pathGen)` helper added to `vizualization.js`
  - For `MultiPolygon` features, iterates all polygon rings via `d3.geoArea()` and returns
    the centroid of the largest ring — always the mainland
  - Used in both the label-drawing loop and `panToCountry()` — fixes France, Norway, USA,
    Indonesia, Russia, and any other country with distant territories
- Pan bounds now use `state.pathGen.bounds({type:"Sphere"})` as `translateExtent`
  - This is the pixel bounding box of the projected sphere — the real map boundary
  - Prevents drift into the empty SVG margins above/below the sphere at all zoom levels
  - Previous `[[0,0],[W,H]]` included the full SVG rectangle (which is taller than the sphere)

**Performance**
- `buildColorScale()` DOM scan removed — the `d3.selectAll(".country-path").each()` block
  was redundant (allData is always loaded before drawMap runs); now uses allData directly
- Zoom handler no longer bulk-updates all ~250 label font-sizes on every animation frame
- `scheduleLabels()` RAF gate: coalesces rapid zoom events into one DOM pass per frame
- Font-size counter-scaling moved inside `updateLabelVisibility()` — applied only to visible
  labels (a small fraction of all labels at typical zoom levels)

**Home page declutter**
- `story__intro` block removed (kicker "Three numbers…" + lead paragraph)
- Metric rows simplified to 2-column grid (name + description only) — index numbers and
  scale-tag pills removed; `.metric-row` CSS updated from 4 → 2 column grid template
- `why__lead` paragraph removed — stat blocks are self-explanatory at this point
- Preview overlay reduced to CTA button only — map background makes the product obvious
- Howto `→` separator elements removed — steps read cleanly without punctuation
- CTA kicker "The data is waiting" removed — headline stands alone

**Files changed in this pass**
- `static/js/vizualization.js` — mainCentroid, sphere translateExtent, RAF labels, buildColorScale
- `templates/home.html` — story intro, metric row index/tag, why lead, preview overlay, howto sep, CTA kicker removed
- `static/css/styling.css` — removed corresponding dead CSS rules; metric-row grid updated
- `static/js/home.js` — removed obsolete story/why reveal-up GSAP targets
- `CLAUDE.md` — updated

---

### 2026-03-25 — Cinematic landing pass (unity, CTA, animation, structure)

**Problem addressed:** Landing felt like six independent template blocks rather than one guided experience. CTA language was inconsistent across four locations. Animations were all identical fade-ups.

**CTA unification**
- Navbar: "Open Map" → "Open the Map"
- Hero: "Explore the Map" → "Open the Map"
- Preview: "Enter the Map →" → "Open the Map"
- Final CTA: "Open VitalMap →" → "Open the Map"
- Secondary hero CTA: "Learn more ↓" → "See the data ↓" (more directional)
- Secondary final CTA: "Send a message" → "Contact" (minimal, consistent)

**Structural merge (6 → 4 sections)**
- `section.story` + `section.why` merged → `section.narrative`
  - Metric rows (births/deaths/growth) now share the same container as the scale strip
  - Scale strip replaces boxed stat-block cards — just raw numbers with separator lines
  - One section instead of two eliminates the "stacked blocks" feeling
- `section.howto` + `section.cta-final` merged → `section.cta-final`
  - How-to steps (`cta-step`) now sit at the top of the CTA section above a separator line
  - The CTA headline and buttons below feel like a natural conclusion
  - One section instead of two removes a visual weight repetition

**Animation upgrades (distinct per section)**
- Metric rows: `fromTo` slide-from-left (`x: -50` → `x: 0`) — data-reveal feeling, not generic fade-up
- Scale stats: `fromTo` scale-up (`scale: 0.85` → `scale: 1`) with `back.out(1.4)` — spring overshoot
- Preview map background: GSAP parallax (`scale: 1.1`, `scrub: 1.5`, y: `-4%` → `4%`) — depth, cinematic
- CTA inner: scale-from-slightly-smaller (`scale: 0.96`) + fade-up — more impactful end moment
- CTA steps: standard fade-up with stagger — kept simple, lighter than the section above it

**Bidirectional scroll**
- All ScrollTrigger animations use `toggleActions: "play reverse play reverse"`
- Elements animate back out when user scrolls up through a section
- Preview parallax uses `scrub: 1.5` — continuous parallax in both directions
- Result: page feels alive at every scroll position, not just on first entry

**Visual depth additions**
- Narrative section: barely-visible left-edge cyan gradient (`rgba(79,195,247,0.025)`) — breaks flat bg
- Preview overlay: vignette deepened (`0.32 → 0.72`) — more atmospheric portal feeling
- Scale strip: vertical separator borders between stats (no cards/boxes) — data-table aesthetic

**Files changed in this pass**
- `templates/home.html` — 6→4 sections, CTA unification, new HTML structure throughout
- `templates/base.html` — navbar CTA: "Open Map" → "Open the Map"
- `static/css/variables.css` — added `--space-7: 1.75rem`
- `static/css/styling.css` — removed story+why CSS, new narrative CSS, removed howto CSS, updated cta-final CSS
- `static/js/home.js` — full animation rewrite: fromTo, bidirectional, parallax, scale-reveal
- `CLAUDE.md` — updated

---

### 2026-03-25 — Landing page cinematic redo (story + gateway + finale)

**Problem addressed:** Previous landing page iterations (editorial rows, data strip, ending split) felt
either like a generic marketing site or disconnected template blocks. Required a genuinely different
structural and visual approach.

**Structure — 4 sections (hero → story → gateway → finale)**
- Hero: unchanged
- Story: three demographic chapters stacked with `clamp(4rem, 9vw, 8rem)` metric headings
  — births/deaths/growth as chapter titles in full accent colour, text indented below with coloured left-border
  — each chapter has its own ScrollTrigger (fires as the individual chapter enters view)
- Gateway: D3 world map at `min(88vh, 760px)` — the dominant visual portal into the product
  — radial-gradient vignette (clear centre, dark edges) — map glows through
  — overlay: uppercase label + glow-pulse "Open the Map" button only — no other content
  — GSAP parallax (`scale: 1.12`, `scrub: 1.5`)
- Finale: centred, single strong headline, two buttons — scale-from-slightly-smaller entrance

**Animation design**
- Story chapters: per-chapter timeline — metric slides from left (`x: -60`), text fades up (`y: 28`) — each fires independently as chapter scrolls in
- Gateway content: `opacity: 0, y: 40` → reveal, bidirectional
- Finale: `scale: 0.96, y: 24` → `scale: 1`, bidirectional
- All ScrollTrigger: `toggleActions: "play reverse play reverse"` — fully bidirectional

**Copy decisions**
- Story text: narrative / observational — references only what is directly visible or derivable from the 1950–2100 dataset; no unsupported macroeconomic claims
- Gateway overlay: minimal — label + CTA only, the map communicates the product
- Finale headline: "The full story is in the map." — conclusive bridge from story to action

**Files changed in this pass**
- `templates/home.html` — new 4-section structure (story/gateway/finale replaces editorial/data-strip/preview/ending)
- `static/css/styling.css` — removed editorial+data-strip+preview+ending CSS; added story+gateway+finale CSS
- `static/js/home.js` — per-chapter story GSAP, gateway parallax+reveal, finale scale-in; `drawGatewayMap()` replaces `drawPreviewMap()`
- `CLAUDE.md` — updated

---

### 2026-03-25 — Globe zoom-to-map transition pass

**Problem addressed:** The previous globe intro was a decorative spinner with a plain crossfade.
Globe appeared, rotated, then faded out separately as the flat map faded in — two independent
elements, no visual connection between them. The goal was a dimensional transition: the globe
zooms toward the camera, its ocean floods the viewport, the flat map resolves through that
surface, and the map is established as the environment the text enters against.

**Core mechanism**
- GSAP `scale: 4.0` on `#hero-globe-bg` (a viewport-sized, flex-centred container)
- At scale 4.0 a ~520px globe SVG becomes ~2080px — wider than any common display
- `.hero { overflow: hidden }` clips the expanding globe at the hero boundary
- The globe's dark navy ocean edge (`#040d18`) nearly matches the page background (`#0d1117`)
- The flat map underneath (also dark navy) bleeds through during the zoom — continuous surface
- The viewer perceives: "we zoomed into the globe — this is now the interface"

**D3 timer restructure**
- Timer was previously started inside `d3.json().then()` — delayed 50–300ms by GeoJSON fetch
- Restructured: timer starts synchronously after sphere+graticule are drawn
- `var countryPaths = null` in outer closure — timer checks `if (countryPaths)` on each tick
- Countries added inside `.then()` — running timer picks them up on next tick, no restart
- Result: ocean orb is visibly rotating from the first frame of the GSAP fade-in

**New GSAP hero timeline (absolute time positions)**
- 0.10s: globe fades in (0.6s, power2.out)
- 1.15s: zoom push begins (scale 1→4.0, 0.9s, **power2.in** — slow-start acceleration)
- 1.15s: motion blur builds in parallel (filter blur 0→8px, 0.9s, power2.in — sells camera speed)
- 1.40s: flat map bleeds through dark ocean surface (opacity 0→0.9, 0.6s, power2.inOut)
- 1.85s: globe exits while still zooming (opacity 1→0, 0.5s); onComplete stops timer + resets scale/blur
- 2.10s: map settles to full opacity (0.3s)
- 2.15s–3.20s: text cascade (eyebrow, title, sub, actions, scroll hint)
- Total settle: ~3.9s

**CSS additions**
- `#hero-globe-bg`: `transform-origin: 50% 50%` (explicit), `will-change: transform, opacity, filter`
- `#hero-map-bg`: `will-change: opacity`

**Files changed in this pass**
- `static/js/home.js` — D3 timer restructure in `drawHeroGlobe()`; new GSAP hero timeline
- `static/css/styling.css` — `will-change` and `transform-origin` on `#hero-globe-bg`/`#hero-map-bg`
- `CLAUDE.md` — updated

---

### 2026-03-25 — Hero and landing polish pass (authored identity, globe intro)

**Problem addressed:** Landing page felt like "premium AI template slop" — system fonts, uppercase
cyan eyebrow, standard fade-up animations, decorative map background with no authored signature move.

**Typography**
- Added web fonts via Google Fonts CDN: **Space Grotesk** (300–700) for all sans text,
  **JetBrains Mono** (400–500) for mono/data labels
- Updated `--font-sans` and `--font-mono` tokens in `variables.css`
- Space Grotesk is geometric + humanist, technical-adjacent — distinct from system-ui without
  being sci-fi or gimmicky; immediately gives the site a curated, authored identity
- Hero title: `letter-spacing` tightened to -2px, `font-feature-settings: "ss01" 1` (single-story
  `a` alternate), `max-width` narrowed to 720px to match the new line break
- Story chapter metric words: `letter-spacing` reduced from -3px to -2px for Space Grotesk optically
- Hero sub: `font-size` 1.05rem (was 1.125rem), `line-height` 1.7 (was 1.8), `max-width` 520px

**Eyebrow redesign**
- Removed the uppercase-cyan-badge pattern (the most common "AI template" signal)
- New structure: mono `01` tag (faint, `--color-text-faint`) + descriptor text in muted sans
- No `text-transform: uppercase`, no accent colour — reads as a data-system field label
- Markup: `<span class="hero__eyebrow-tag">01</span><span class="hero__eyebrow-text">...</span>`

**Title line break**
- "The World Is / Being Rewritten" → "The World / Is Being Rewritten"
- "The World" alone on line 1 = short declarative subject header
- Full predicate "Is Being Rewritten" in accent colour on line 2 = more visual mass

**Hero background gradient**
- Added a third radial gradient: deep-navy pool centred at 50% 55% — gives the globe a visual
  "surface" to sit against; barely perceptible but removes the flat-background float feel

**Globe intro sequence (signature moment)**
- New `#hero-globe-bg` layer added to `.hero__bg` (z-index:1, before `#hero-map-bg`)
- New `drawHeroGlobe()` function in `home.js`:
  - D3 `geoOrthographic` projection, sphere diameter = `min(innerWidth/H * 0.72, 520px)`
  - Centered via CSS flexbox on parent
  - Ocean: SVG `radialGradient` (`#globe-ocean-grad`) off-centre highlight (#0e2540 → #040d18)
  - Graticule: faint cyan (0.07 opacity), country paths: #0f2033 fill, 0.18 cyan border
  - CSS `filter: drop-shadow(0 0 48px rgba(79,195,247,0.22)) drop-shadow(0 0 12px ...)` — luminous orb
  - `d3.timer` starts after GeoJSON loads: 10°/sec west rotation from -15° yaw, -25° tilt
  - Timer reference stored on `container._d3timer` for cleanup
- `#hero-map-bg` now starts at `opacity: 0` (added to CSS)

**New GSAP hero timeline (globe → crossfade → text cascade)**
- Uses absolute time positions (numeric second argument to `.to()`) for explicit beat control
- 0.10s: Globe fades in (0.6s, power2.out)
- 1.30s: Globe fades out AND flat map fades in simultaneously (0.8s crossfade, power2.inOut)
- 1.30s onComplete: D3 timer stopped to free CPU
- 1.70s: Eyebrow (y:20→0, 0.6s, power3.out)
- 1.95s: Title (y:30→0, 0.85s, **power4.out** — heavier decel for display type)
- 2.30s: Sub (y:20→0, 0.65s)
- 2.55s: Actions (y:16→0, 0.55s)
- 2.75s: Scroll hint (0.7s)
- Total settle: ~3.45s — brief system-boot feel, not a loading screen
- Graceful fallback: if GSAP fails to load, all elements shown at opacity:1 immediately

**Files changed in this pass**
- `templates/base.html` — Google Fonts preconnect + stylesheet link
- `static/css/variables.css` — `--font-sans` and `--font-mono` updated
- `templates/home.html` — `#hero-globe-bg` div added; eyebrow markup restructured; title rebroken
- `static/css/styling.css` — globe layer CSS, `#hero-globe-bg` + `.hero__globe-svg`, `#hero-map-bg`
  opacity:0, hero bg gradient (third pool added), eyebrow CSS restructured, title letter-spacing
  + font-feature-settings, sub size/line-height, story metric letter-spacing
- `static/js/home.js` — `drawHeroGlobe()` added; `DOMContentLoaded` handler rewritten with new
  absolute-position GSAP timeline; story/gateway/finale sections unchanged
- `CLAUDE.md` — updated

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
