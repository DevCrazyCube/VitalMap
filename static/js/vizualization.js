/*
 * VitalMap — vizualization.js
 * D3.js choropleth world map with interactive controls,
 * country click, tooltip, details panel, and linked trend chart.
 */

(function () {
  "use strict";

  // ================================================================
  // STATE
  // ================================================================
  var state = {
    year:           2000,
    metric:         "births",
    selectedCode:   null,
    allData:        [],       // full dataset from /api/data
    byCodeYear:     {},       // key: "AFG_1990" → {births, deaths, natural_growth}
    byCode:         {},       // key: "AFG"      → [{year, births, deaths, ...}, ...]
    countryNames:   {},       // key: "AFG"      → "Afghanistan"
    geoFeatures:    [],       // GeoJSON features from world.geojson
    colorScale:     null,
    mapSvg:         null,
    projection:     null,
    pathGen:        null,
    trendSvg:       null
  };

  // ================================================================
  // METRIC META — labels, hints, colour interpolators
  // ================================================================
  var METRIC_META = {
    births: {
      label:       "Births",
      hint:        "Total births per year. Sequential blue colour scale.",
      interpolator: d3.interpolateBlues,
      diverging:   false
    },
    deaths: {
      label:       "Deaths",
      hint:        "Total deaths per year. Sequential red colour scale.",
      interpolator: d3.interpolateReds,
      diverging:   false
    },
    natural_growth: {
      label:       "Natural Growth (Births − Deaths)",
      hint:        "Positive = growing population. Negative = shrinking. Diverging red–blue scale.",
      interpolator: d3.interpolateRdBu,
      diverging:   true
    }
  };

  // ================================================================
  // INIT
  // ================================================================
  document.addEventListener("DOMContentLoaded", function () {
    setupControls();
    Promise.all([fetchData(), fetchGeo()])
      .then(function (results) {
        processData(results[0]);
        processGeo(results[1]);
        hideLoading();
        drawMap();
        updateLegend();
      })
      .catch(function (err) {
        console.error("VitalMap load error:", err);
        document.getElementById("map-loading").innerHTML =
          '<span style="color:#ef5350">Failed to load map data. Please refresh.</span>';
      });
  });

  // ================================================================
  // DATA LOADING
  // ================================================================

  function fetchData() {
    return fetch("/api/data").then(function (r) { return r.json(); });
  }

  function fetchGeo() {
    return fetch("/static/data/world.geojson").then(function (r) { return r.json(); });
  }

  function processData(rows) {
    state.allData = rows;
    rows.forEach(function (row) {
      var key = row.code + "_" + row.year;
      state.byCodeYear[key] = row;

      if (!state.byCode[row.code]) state.byCode[row.code] = [];
      state.byCode[row.code].push(row);
    });
  }

  function processGeo(geojson) {
    state.geoFeatures = geojson.features;
    // Build code → name lookup from GeoJSON properties
    geojson.features.forEach(function (f) {
      var code = f.id || (f.properties && f.properties.iso_a3);
      var name = f.properties && (f.properties.name || f.properties.NAME);
      if (code && name) state.countryNames[code] = name;
    });
  }

  function hideLoading() {
    var el = document.getElementById("map-loading");
    if (el) el.style.display = "none";
  }

  // ================================================================
  // CONTROLS SETUP
  // ================================================================

  function setupControls() {
    var yearSlider   = document.getElementById("year-slider");
    var yearDisplay  = document.getElementById("year-display");
    var headerYear   = document.getElementById("header-year");
    var metricSelect = document.getElementById("metric-select");
    var searchInput  = document.getElementById("country-search");
    var searchClear  = document.getElementById("search-clear");
    var suggestions  = document.getElementById("search-suggestions");

    // Year slider
    yearSlider.addEventListener("input", function () {
      state.year = parseInt(this.value);
      yearDisplay.textContent = state.year;
      headerYear.textContent  = state.year;
      updateMap();
      if (state.selectedCode) {
        updateDetails(state.selectedCode);
        updateYearMarker();
      }
    });

    // Metric dropdown
    metricSelect.addEventListener("change", function () {
      state.metric = this.value;
      document.getElementById("metric-hint").textContent = METRIC_META[state.metric].hint;
      updateMap();
      updateLegend();
    });

    // Country search
    searchInput.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      if (q.length < 2) {
        hideSuggestions();
        searchClear.classList.remove("visible");
        return;
      }
      searchClear.classList.add("visible");
      var matches = state.geoFeatures
        .filter(function (f) {
          var name = (f.properties && f.properties.name) || "";
          return name.toLowerCase().includes(q);
        })
        .slice(0, 8);

      if (matches.length === 0) {
        hideSuggestions();
        return;
      }

      suggestions.innerHTML = "";
      matches.forEach(function (f) {
        var name = f.properties.name;
        var code = f.id;
        var item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = name;
        item.addEventListener("click", function () {
          hideSuggestions();
          searchInput.value = name;
          searchClear.classList.add("visible");
          highlightCountry(code);
          selectCountry(code);
        });
        suggestions.appendChild(item);
      });
      suggestions.classList.add("visible");
    });

    searchInput.addEventListener("blur", function () {
      // small delay so click on suggestion registers first
      setTimeout(hideSuggestions, 180);
    });

    searchClear.addEventListener("click", function () {
      searchInput.value = "";
      searchClear.classList.remove("visible");
      hideSuggestions();
      clearHighlight();
    });

    function hideSuggestions() {
      suggestions.classList.remove("visible");
    }
  }

  // ================================================================
  // MAP DRAWING
  // ================================================================

  function drawMap() {
    var container = document.getElementById("map-container");
    var W = container.clientWidth  || 800;
    var H = container.clientHeight || 420;

    // Build projection
    state.projection = d3.geoNaturalEarth1()
      .scale(W / 6.5)
      .translate([W / 2, H / 2]);

    state.pathGen = d3.geoPath().projection(state.projection);

    // Create SVG
    state.mapSvg = d3.select("#map-container")
      .append("svg")
      .attr("width",  W)
      .attr("height", H);

    // Ocean / sphere background
    state.mapSvg.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere")
      .attr("d", state.pathGen);

    // Graticule lines
    var graticule = d3.geoGraticule()();
    state.mapSvg.append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", state.pathGen);

    // Build colour scale for current state
    state.colorScale = buildColorScale(state.metric);

    // Draw country paths
    state.mapSvg.selectAll(".country-path")
      .data(state.geoFeatures)
      .enter()
      .append("path")
        .attr("class", "country-path")
        .attr("d", state.pathGen)
        .attr("data-code", function (d) { return d.id || ""; })
        .attr("fill", function (d) {
          return countryFill(d, state.metric, state.year);
        })
        .classed("no-data", function (d) {
          var code = d.id;
          return !code || !state.byCodeYear[code + "_" + state.year];
        })
        .on("mousemove", onMouseMove)
        .on("mouseleave", onMouseLeave)
        .on("click", function (event, d) {
          var code = d.id;
          if (!code) return;
          selectCountry(code);
        });

    // Window resize → redraw
    window.addEventListener("resize", debounce(function () {
      d3.select("#map-container svg").remove();
      drawMap();
      if (state.selectedCode) {
        d3.selectAll(".country-path")
          .filter(function (d) { return d.id === state.selectedCode; })
          .classed("selected", true);
      }
    }, 300));
  }

  // Recolour all country paths when year/metric changes
  function updateMap() {
    state.colorScale = buildColorScale(state.metric);

    d3.selectAll(".country-path")
      .classed("no-data", function (d) {
        var code = d.id;
        return !code || !state.byCodeYear[code + "_" + state.year];
      })
      .transition()
      .duration(300)
      .attr("fill", function (d) {
        return countryFill(d, state.metric, state.year);
      });
  }

  // Return fill colour for a feature given current metric+year
  function countryFill(d, metric, year) {
    var code = d.id;
    if (!code) return "#21262d";
    var row = state.byCodeYear[code + "_" + year];
    if (!row) return "#21262d";
    var val = row[metric];
    if (val === undefined || val === null) return "#21262d";
    return state.colorScale(val);
  }

  // Build a D3 colour scale based on current data values for the year
  function buildColorScale(metric) {
    var meta = METRIC_META[metric];
    var values = [];

    d3.selectAll(".country-path").each(function (d) {
      var row = state.byCodeYear[(d.id || "") + "_" + state.year];
      if (row && row[metric] !== undefined) values.push(row[metric]);
    });

    // Fallback: if no paths drawn yet, scan allData
    if (values.length === 0) {
      state.allData.forEach(function (row) {
        if (row.year === state.year && row[metric] !== undefined) {
          values.push(row[metric]);
        }
      });
    }

    if (values.length === 0) {
      return function () { return "#21262d"; };
    }

    var minVal = d3.min(values);
    var maxVal = d3.max(values);

    if (meta.diverging) {
      // Diverging: centre at 0
      var maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
      // d3.interpolateRdBu goes red (low) → white → blue (high)
      return d3.scaleDiverging(meta.interpolator)
        .domain([-maxAbs, 0, maxAbs]);
    } else {
      // Sequential: light → dark
      return d3.scaleSequential(meta.interpolator)
        .domain([0, maxVal]);
    }
  }

  // ================================================================
  // TOOLTIP
  // ================================================================

  var tooltip = document.getElementById("map-tooltip");

  function onMouseMove(event, d) {
    var code = d.id;
    if (!code) return;

    var name = (d.properties && d.properties.name) || code;
    var row  = state.byCodeYear[code + "_" + state.year];

    document.getElementById("tt-name").textContent = name;
    document.getElementById("tt-year").textContent = "Year: " + state.year;

    if (row) {
      document.getElementById("tt-births").textContent = window.formatNum(row.births);
      document.getElementById("tt-deaths").textContent = window.formatNum(row.deaths);
      var gr = row.natural_growth;
      var grEl = document.getElementById("tt-growth");
      grEl.textContent = (gr >= 0 ? "+" : "") + window.formatNum(gr);
      grEl.style.color = gr >= 0 ? "var(--color-growth)" : "var(--color-deaths)";
    } else {
      document.getElementById("tt-births").textContent = "No data";
      document.getElementById("tt-deaths").textContent = "No data";
      document.getElementById("tt-growth").textContent = "No data";
      document.getElementById("tt-growth").style.color = "";
    }

    tooltip.style.display = "block";
    positionTooltip(event);
  }

  function onMouseLeave() {
    tooltip.style.display = "none";
  }

  function positionTooltip(event) {
    var pad = 14;
    var tw  = tooltip.offsetWidth  || 180;
    var th  = tooltip.offsetHeight || 120;
    var x   = event.clientX + pad;
    var y   = event.clientY + pad;

    if (x + tw > window.innerWidth  - pad) x = event.clientX - tw - pad;
    if (y + th > window.innerHeight - pad) y = event.clientY - th - pad;

    tooltip.style.left = x + "px";
    tooltip.style.top  = y + "px";
  }

  // ================================================================
  // COUNTRY SELECTION
  // ================================================================

  function selectCountry(code) {
    // Deselect previous
    d3.selectAll(".country-path").classed("selected", false);

    // Select new
    d3.selectAll(".country-path")
      .filter(function (d) { return d.id === code; })
      .classed("selected", true);

    state.selectedCode = code;
    updateDetails(code);
    drawTrendChart(code);
  }

  function highlightCountry(code) {
    clearHighlight();
    d3.selectAll(".country-path")
      .filter(function (d) { return d.id === code; })
      .classed("highlighted", true);
  }

  function clearHighlight() {
    d3.selectAll(".country-path").classed("highlighted", false);
  }

  // ================================================================
  // DETAILS PANEL
  // ================================================================

  function updateDetails(code) {
    var name = state.countryNames[code] || code;
    var row  = state.byCodeYear[code + "_" + state.year];

    document.getElementById("details-empty").style.display   = "none";
    document.getElementById("details-content").style.display = "block";

    document.getElementById("detail-country").textContent    = name;
    document.getElementById("detail-year-badge").textContent = "Data for " + state.year;

    if (row) {
      document.getElementById("detail-births").textContent = window.formatNum(row.births);
      document.getElementById("detail-deaths").textContent = window.formatNum(row.deaths);

      var gr    = row.natural_growth;
      var grEl  = document.getElementById("detail-growth");
      var indEl = document.getElementById("growth-indicator");

      grEl.textContent = (gr >= 0 ? "+" : "") + window.formatNum(gr);

      if (gr >= 0) {
        indEl.textContent = "↑ Population growing naturally";
        indEl.className   = "details-panel__growth-indicator growth-positive";
      } else {
        indEl.textContent = "↓ Population shrinking naturally";
        indEl.className   = "details-panel__growth-indicator growth-negative";
      }
    } else {
      document.getElementById("detail-births").textContent  = "No data";
      document.getElementById("detail-deaths").textContent  = "No data";
      document.getElementById("detail-growth").textContent  = "No data";
      document.getElementById("growth-indicator").textContent = "";
      document.getElementById("growth-indicator").className   = "details-panel__growth-indicator";
    }
  }

  // ================================================================
  // TREND CHART
  // ================================================================

  function drawTrendChart(code) {
    var name    = state.countryNames[code] || code;
    var records = state.byCode[code];

    // Update header text
    document.getElementById("trend-title").textContent    = name + " — Births & Deaths Trend";
    document.getElementById("trend-subtitle").textContent = "1950–2100 · estimates then medium projections";
    document.getElementById("trend-empty").style.display  = "none";
    document.getElementById("trend-legend").style.display = "flex";

    if (!records || records.length === 0) {
      document.getElementById("trend-chart-wrap").innerHTML =
        '<div class="trend-empty"><p>No trend data available for ' + name + '.</p></div>';
      return;
    }

    // Sort by year
    records = records.slice().sort(function (a, b) { return a.year - b.year; });

    // Remove previous SVG if any
    d3.select("#trend-chart-wrap svg").remove();

    var wrap = document.getElementById("trend-chart-wrap");
    var W    = wrap.clientWidth  || 660;
    var H    = 200;
    var margin = { top: 14, right: 20, bottom: 36, left: 62 };
    var iW   = W - margin.left - margin.right;
    var iH   = H - margin.top  - margin.bottom;

    var svg = d3.select("#trend-chart-wrap")
      .append("svg")
        .attr("width",  W)
        .attr("height", H);

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // X scale — years
    var xScale = d3.scaleLinear()
      .domain([1950, 2100])
      .range([0, iW]);

    // Y scale — values (births + deaths together)
    var allVals = records.flatMap(function (r) { return [r.births, r.deaths]; });
    var yMin = 0;
    var yMax = d3.max(allVals) * 1.05;

    var yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .nice()
      .range([iH, 0]);

    // X axis
    g.append("g")
      .attr("class", "trend-axis")
      .attr("transform", "translate(0," + iH + ")")
      .call(
        d3.axisBottom(xScale)
          .tickValues([1950, 1975, 2000, 2025, 2050, 2075, 2100])
          .tickFormat(d3.format("d"))
      );

    // Y axis
    g.append("g")
      .attr("class", "trend-axis")
      .call(
        d3.axisLeft(yScale)
          .ticks(5)
          .tickFormat(function (d) { return window.formatNum(d); })
      );

    // Line generators
    var lineBirths = d3.line()
      .x(function (r) { return xScale(r.year); })
      .y(function (r) { return yScale(r.births); })
      .defined(function (r) { return r.births != null; });

    var lineDeaths = d3.line()
      .x(function (r) { return xScale(r.year); })
      .y(function (r) { return yScale(r.deaths); })
      .defined(function (r) { return r.deaths != null; });

    var lineGrowth = d3.line()
      .x(function (r) { return xScale(r.year); })
      .y(function (r) { return yScale(Math.max(0, r.natural_growth)); })
      .defined(function (r) { return r.natural_growth != null; });

    // Draw lines
    g.append("path")
      .datum(records)
      .attr("class", "trend-line-births")
      .attr("d", lineBirths);

    g.append("path")
      .datum(records)
      .attr("class", "trend-line-deaths")
      .attr("d", lineDeaths);

    g.append("path")
      .datum(records)
      .attr("class", "trend-line-growth")
      .attr("d", lineGrowth);

    // Vertical marker for selected year
    state.trendSvg = { g: g, xScale: xScale, iH: iH };
    drawYearMarker(g, xScale, iH, state.year);
  }

  function drawYearMarker(g, xScale, iH, year) {
    g.selectAll(".trend-year-line").remove();
    g.append("line")
      .attr("class", "trend-year-line")
      .attr("x1", xScale(year))
      .attr("x2", xScale(year))
      .attr("y1", 0)
      .attr("y2", iH);
  }

  function updateYearMarker() {
    if (!state.trendSvg) return;
    var ts = state.trendSvg;
    drawYearMarker(ts.g, ts.xScale, ts.iH, state.year);
  }

  // ================================================================
  // LEGEND
  // ================================================================

  function updateLegend() {
    var meta      = METRIC_META[state.metric];
    var gradEl    = document.getElementById("legend-gradient");
    var lowEl     = document.getElementById("legend-low");
    var highEl    = document.getElementById("legend-high");
    var titleEl   = document.getElementById("legend-title");

    titleEl.textContent = meta.label;

    // Get value range for current year
    var values = [];
    state.allData.forEach(function (row) {
      if (row.year === state.year && row[state.metric] !== undefined) {
        values.push(row[state.metric]);
      }
    });

    if (values.length === 0) return;

    var minVal = d3.min(values);
    var maxVal = d3.max(values);

    if (meta.diverging) {
      var maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
      lowEl.textContent  = "−" + window.formatNum(maxAbs);
      highEl.textContent = "+" + window.formatNum(maxAbs);
      gradEl.style.background =
        "linear-gradient(to right, #ef5350, #fff, #1565c0)";
    } else {
      lowEl.textContent  = "0";
      highEl.textContent = window.formatNum(maxVal);
      if (state.metric === "births") {
        gradEl.style.background = "linear-gradient(to right, #e3f2fd, #1565c0)";
      } else {
        gradEl.style.background = "linear-gradient(to right, #ffebee, #b71c1c)";
      }
    }
  }

  // ================================================================
  // UTILITIES
  // ================================================================

  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      var args = arguments;
      var ctx  = this;
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

})();
