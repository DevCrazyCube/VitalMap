/*
 * VitalMap — vizualization.js
 * D3.js choropleth world map: zoom/pan, country labels, floating panels,
 * tooltip, details card, linked trend chart, country search.
 */

(function () {
  "use strict";

  // ================================================================
  // STATE
  // ================================================================
  var state = {
    year:          2000,
    metric:        "births",
    selectedCode:  null,
    zoomLevel:     1,
    allData:       [],      // filtered, real mapped-country rows only
    byCodeYear:    {},      // "AFG_1990" → row object
    byCode:        {},      // "AFG"      → sorted array of rows
    countryNames:  {},      // "AFG"      → "Afghanistan"
    geoFeatures:   [],      // GeoJSON features
    colorScale:    null,
    mapSvg:        null,
    mapG:          null,    // main <g> group — zoom transforms this
    projection:    null,
    pathGen:       null,
    zoomBehavior:  null,
    trendSvg:      null,
    trendResizeObserver: null
  };

  // ================================================================
  // DARK-ADAPTED COLOUR INTERPOLATORS
  // ================================================================

  // Births: dark navy → luminous cyan-blue
  var _interpBirths = function (t) {
    return d3.interpolateRgb("#0b1e30", "#4fc3f7")(t);
  };

  // Deaths: very dark muted red → coral-red
  var _interpDeaths = function (t) {
    return d3.interpolateRgb("#1c080c", "#ef5350")(t);
  };

  // Natural growth: deep red → dark slate → steel blue
  var _interpGrowth = function (t) {
    if (t < 0.5) return d3.interpolateRgb("#9b1717", "#1a2635")(t * 2);
    return d3.interpolateRgb("#1a2635", "#1565c0")((t - 0.5) * 2);
  };

  // ================================================================
  // METRIC META
  // ================================================================
  var METRIC_META = {
    births: {
      label:        "Births",
      hint:         "Total births per year. Sequential blue colour scale.",
      interpolator: _interpBirths,
      diverging:    false
    },
    deaths: {
      label:        "Deaths",
      hint:         "Total deaths per year. Sequential red colour scale.",
      interpolator: _interpDeaths,
      diverging:    false
    },
    natural_growth: {
      label:        "Natural Growth (Births − Deaths)",
      hint:         "Positive = growing population. Negative = shrinking. Diverging red–blue scale.",
      interpolator: _interpGrowth,
      diverging:    true
    }
  };

  // ================================================================
  // INIT
  // ================================================================
  document.addEventListener("DOMContentLoaded", function () {
    setupControls();
    setupTrendResizeHandle();
    Promise.all([fetchData(), fetchGeo()])
      .then(function (results) {
        processGeo(results[1]);
        processData(results[0]);   // after geo so we can filter to mapped countries
        hideLoading();
        drawMap();
        updateLegend();
        setupTrendResizeObserver();
      })
      .catch(function (err) {
        console.error("VitalMap load error:", err);
        var loadingEl = document.getElementById("map-loading");
        if (loadingEl) {
          loadingEl.innerHTML =
            '<span style="color:#ef5350">Failed to load map data. Please refresh.</span>';
        }
      });
  });

  // ================================================================
  // DATA
  // ================================================================

  function fetchData() {
    return fetch("/api/data").then(function (r) { return r.json(); });
  }

  function fetchGeo() {
    return fetch("/static/data/world.geojson").then(function (r) { return r.json(); });
  }

  function processGeo(geojson) {
    state.geoFeatures = geojson.features;

    geojson.features.forEach(function (f) {
      var code = f.id || (f.properties && f.properties.iso_a3);
      var name = f.properties && (f.properties.name || f.properties.NAME);

      if (code && name) state.countryNames[code] = name;

      // Pre-compute spherical area (steradians) for label-visibility decisions
      f._area = d3.geoArea(f);
    });
  }

  function processData(rows) {
    // Only keep rows that correspond to actual mapped countries
    state.allData = rows.filter(function (row) {
      return row.code && state.countryNames[row.code];
    });

    state.byCodeYear = {};
    state.byCode = {};

    state.allData.forEach(function (row) {
      state.byCodeYear[row.code + "_" + row.year] = row;
      if (!state.byCode[row.code]) state.byCode[row.code] = [];
      state.byCode[row.code].push(row);
    });

    // Pre-sort each country's array by year
    Object.keys(state.byCode).forEach(function (code) {
      state.byCode[code].sort(function (a, b) { return a.year - b.year; });
    });
  }

  function hideLoading() {
    var el = document.getElementById("map-loading");
    if (el) el.style.display = "none";
  }

  // ================================================================
  // CONTROLS
  // ================================================================

  // bottom panel resize handler
  function setupTrendResizeHandle() {
  var panel = document.getElementById("trend-panel");
  var handle = document.getElementById("trend-resize-handle");
  if (!panel || !handle) return;

  var startY = 0;
  var startHeight = 0;
  var dragging = false;

  handle.addEventListener("mousedown", function (e) {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    startHeight = panel.offsetHeight;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;

    var delta = startY - e.clientY;
    var nextHeight = startHeight + delta;

    nextHeight = Math.max(120, Math.min(420, nextHeight));
    panel.style.height = nextHeight + "px";
  });

  window.addEventListener("mouseup", function () {
    if (!dragging) return;
    dragging = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    if (state.selectedCode) {
      drawTrendChart(state.selectedCode);
    }
  });
}

  function setupControls() {
    var yearSlider   = document.getElementById("year-slider");
    var yearDisplay  = document.getElementById("year-display");
    var yearBadge    = document.getElementById("year-badge");
    var metricSelect = document.getElementById("metric-select");
    var searchInput  = document.getElementById("country-search");
    var searchClear  = document.getElementById("search-clear");
    var suggestions  = document.getElementById("search-suggestions");
    var resetBtn     = document.getElementById("reset-view");
    var detailsClose = document.getElementById("details-close");

    // Year slider
    if (yearSlider) {
      yearSlider.addEventListener("input", function () {
        state.year = parseInt(this.value, 10);
        if (yearDisplay) yearDisplay.textContent = state.year;
        if (yearBadge) yearBadge.textContent = state.year;

        updateMap();
        updateLegend();

        if (state.selectedCode) {
          updateDetails(state.selectedCode);
          updateYearMarker();
        }
      });
    }

    // Metric select
    if (metricSelect) {
      metricSelect.addEventListener("change", function () {
        state.metric = this.value;
        var hintEl = document.getElementById("metric-hint");
        if (hintEl) hintEl.textContent = METRIC_META[state.metric].hint;

        updateMap();
        updateLegend();
      });
    }

    // Search input
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.trim().toLowerCase();
        if (q.length < 2) {
          hideSuggestions();
          if (searchClear) searchClear.classList.remove("visible");
          return;
        }

        if (searchClear) searchClear.classList.add("visible");

        var matches = state.geoFeatures
          .filter(function (f) {
            return ((f.properties && f.properties.name) || "").toLowerCase().includes(q);
          })
          .slice(0, 8);

        if (!matches.length) {
          hideSuggestions();
          return;
        }

        if (suggestions) {
          suggestions.innerHTML = "";

          matches.forEach(function (f) {
            var name = f.properties.name;
            var code = f.id;
            var item = document.createElement("div");
            item.className   = "suggestion-item";
            item.textContent = name;

            item.addEventListener("click", function () {
              hideSuggestions();
              searchInput.value = name;
              if (searchClear) searchClear.classList.add("visible");
              panToCountry(code);
              selectCountry(code);
            });

            suggestions.appendChild(item);
          });

          suggestions.classList.add("visible");
        }
      });

      searchInput.addEventListener("blur", function () {
        setTimeout(hideSuggestions, 200);
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        searchClear.classList.remove("visible");
        hideSuggestions();
        clearHighlight();
      });
    }

    // Reset view
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!state.mapSvg || !state.zoomBehavior) return;
        state.mapSvg.transition().duration(600).ease(d3.easeCubicInOut)
          .call(state.zoomBehavior.transform, d3.zoomIdentity);
      });
    }

    // Close details card
    if (detailsClose) {
      detailsClose.addEventListener("click", function () {
        var card = document.getElementById("details-card");
        if (card) card.style.display = "none";
        d3.selectAll(".country-path").classed("selected", false);
        d3.selectAll(".country-label").classed("label-selected", false);
        state.selectedCode = null;
      });
    }

    function hideSuggestions() {
      if (suggestions) suggestions.classList.remove("visible");
    }
  }

  // ================================================================
  // MAP DRAWING
  // ================================================================

  function drawMap() {
    var container = document.getElementById("map-container");
    if (!container) return;

    var W = container.clientWidth  || 900;
    var H = container.clientHeight || 480;

    // Projection — slightly tighter scale to use full height
    state.projection = d3.geoNaturalEarth1()
      .scale(W / 6.2)
      .translate([W / 2, H / 2]);

    state.pathGen = d3.geoPath().projection(state.projection);

    d3.select("#map-container svg").remove();

    // Root SVG
    state.mapSvg = d3.select("#map-container")
      .append("svg")
      .attr("width",  W)
      .attr("height", H);

    // SVG defs — ocean gradient
    var defs = state.mapSvg.append("defs");
    var oceanGrad = defs.append("radialGradient")
      .attr("id", "ocean-gradient")
      .attr("cx", "50%").attr("cy", "50%").attr("r", "55%");

    oceanGrad.append("stop").attr("offset", "0%")  .attr("stop-color", "#0e2540");
    oceanGrad.append("stop").attr("offset", "55%") .attr("stop-color", "#091929");
    oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#060f1a");

    // Single group that receives all zoom transforms
    state.mapG = state.mapSvg.append("g").attr("class", "map-root");

    // Ocean sphere — filled with the radial gradient
    state.mapG.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "sphere")
      .attr("d", state.pathGen)
      .attr("fill", "url(#ocean-gradient)");

    // Lat/lon grid
    state.mapG.append("path")
      .datum(d3.geoGraticule()())
      .attr("class", "graticule")
      .attr("d", state.pathGen);

    // Build colour scale
    state.colorScale = buildColorScale(state.metric);

    // Country paths
    state.mapG.selectAll(".country-path")
      .data(state.geoFeatures)
      .enter()
      .append("path")
      .attr("class", "country-path")
      .attr("d", state.pathGen)
      .attr("data-code", function (d) { return d.id || ""; })
      .attr("fill", function (d) { return countryFill(d); })
      .classed("no-data", function (d) {
        return !d.id || !state.byCodeYear[d.id + "_" + state.year];
      })
      .on("mousemove", onMouseMove)
      .on("mouseleave", onMouseLeave)
      .on("click", function (event, d) {
        if (d.id) selectCountry(d.id);
      });

    // Country labels
    var labelsG = state.mapG.append("g").attr("class", "country-labels");
    state.geoFeatures.forEach(function (f) {
      var centroid = mainCentroid(f, state.pathGen);
      if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

      labelsG.append("text")
        .datum(f)
        .attr("class", "country-label")
        .attr("data-code", f.id || "")
        .attr("x", centroid[0])
        .attr("y", centroid[1])
        .text((f.properties && f.properties.name) || "")
        .style("display", "none");
    });

    // D3 zoom + pan behaviour
    var sBounds = state.pathGen.bounds({ type: "Sphere" });
    state.zoomBehavior = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent(sBounds)
      .on("zoom", function (event) {
        state.mapG.attr("transform", event.transform);
        state.zoomLevel = event.transform.k;
        scheduleLabels();
      });

    state.mapSvg.call(state.zoomBehavior);

    // Redraw on window resize
    window.addEventListener("resize", debounce(function () {
      var savedCode = state.selectedCode;
      drawMap();
      updateLegend();

      if (savedCode) {
        selectCountry(savedCode);
      }
    }, 300));
  }

  // ================================================================
  // MAP UPDATE (year / metric change)
  // ================================================================

  function updateMap() {
    state.colorScale = buildColorScale(state.metric);

    d3.selectAll(".country-path")
      .classed("no-data", function (d) {
        return !d.id || !state.byCodeYear[d.id + "_" + state.year];
      })
      .transition()
      .duration(300)
      .attr("fill", function (d) { return countryFill(d); });
  }

  function countryFill(d) {
    var code = d.id;
    if (!code) return "#131f2e";

    var row = state.byCodeYear[code + "_" + state.year];
    if (!row) return "#131f2e";

    var val = row[state.metric];
    if (val == null) return "#131f2e";

    return state.colorScale(val);
  }

  function buildColorScale(metric) {
    var meta = METRIC_META[metric];
    var values = [];

    state.allData.forEach(function (row) {
      if (
        row.year === state.year &&
        row[metric] != null &&
        state.countryNames[row.code]
      ) {
        values.push(row[metric]);
      }
    });

    if (!values.length) return function () { return "#21262d"; };

    var minVal = d3.min(values);
    var maxVal = d3.max(values);

    if (meta.diverging) {
      var maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
      return d3.scaleDiverging(meta.interpolator).domain([-maxAbs, 0, maxAbs]);
    }

    return d3.scaleSequential(meta.interpolator).domain([0, maxVal]);
  }

  // ================================================================
  // COUNTRY LABELS
  // ================================================================

  var _labelRafPending = false;
  function scheduleLabels() {
    if (_labelRafPending) return;
    _labelRafPending = true;

    requestAnimationFrame(function () {
      _labelRafPending = false;
      updateLabelVisibility();
    });
  }

  function updateLabelVisibility() {
    var z        = state.zoomLevel || 1;
    var fontSize = (10 / z) + "px";

    d3.selectAll(".country-label").each(function (d) {
      var area     = d._area || 0;
      var selected = d.id === state.selectedCode;

      var show =
        selected                    ||
        (z >= 5   && area > 0.0003) ||
        (z >= 3   && area > 0.002)  ||
        (z >= 2   && area > 0.01)   ||
        (z >= 1.4 && area > 0.04)   ||
        (z >= 1   && area > 0.12);

      var el = d3.select(this);
      if (show) {
        el.style("display", "block")
          .style("font-size", fontSize)
          .classed("label-selected", selected);
      } else {
        el.style("display", "none")
          .classed("label-selected", false);
      }
    });
  }

  function mainCentroid(feature, pathGen) {
    if (!feature.geometry) return pathGen.centroid(feature);
    if (feature.geometry.type !== "MultiPolygon") return pathGen.centroid(feature);

    var best = null;
    var bestArea = -1;

    feature.geometry.coordinates.forEach(function (polyCoords) {
      var area = d3.geoArea({ type: "Polygon", coordinates: polyCoords });
      if (area > bestArea) {
        bestArea = area;
        best = polyCoords;
      }
    });

    if (!best) return pathGen.centroid(feature);
    return pathGen.centroid({ type: "Polygon", coordinates: best });
  }

  // ================================================================
  // TOOLTIP
  // ================================================================

  var tooltip = document.getElementById("map-tooltip");

  function onMouseMove(event, d) {
    if (!tooltip) return;

    var code = d.id;
    if (!code) return;

    var name = (d.properties && d.properties.name) || code;
    var row  = state.byCodeYear[code + "_" + state.year];

    document.getElementById("tt-name").textContent = name;
    document.getElementById("tt-year").textContent = "Year: " + state.year;

    if (row) {
      document.getElementById("tt-births").textContent = window.formatNum(row.births);
      document.getElementById("tt-deaths").textContent = window.formatNum(row.deaths);

      var gr   = row.natural_growth;
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
    if (tooltip) tooltip.style.display = "none";
  }

  function positionTooltip(event) {
    if (!tooltip) return;

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
    d3.selectAll(".country-path").classed("selected", false);
    d3.selectAll(".country-label").classed("label-selected", false);

    d3.selectAll(".country-path")
      .filter(function (d) { return d.id === code; })
      .classed("selected", true);

    state.selectedCode = code;
    updateLabelVisibility();
    updateDetails(code);
    drawTrendChart(code);
  }

  function panToCountry(code) {
    var feature = state.geoFeatures.find(function (f) { return f.id === code; });
    if (!feature || !state.mapSvg || !state.zoomBehavior) return;

    var centroid = mainCentroid(feature, state.pathGen);
    if (!centroid || isNaN(centroid[0])) return;

    var container = document.getElementById("map-container");
    var W = container.clientWidth;
    var H = container.clientHeight;
    var k = state.zoomLevel || 1;

    var tx = W / 2 - centroid[0] * k;
    var ty = H / 2 - centroid[1] * k;

    state.mapSvg.transition().duration(500).ease(d3.easeCubicInOut)
      .call(state.zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
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

    var card = document.getElementById("details-card");
    if (!card) return;

    card.style.display = "block";

    document.getElementById("detail-country").textContent    = name;
    document.getElementById("detail-year-badge").textContent = state.year;

    if (row) {
      document.getElementById("detail-births").textContent = window.formatNum(row.births);
      document.getElementById("detail-deaths").textContent = window.formatNum(row.deaths);

      var gr    = row.natural_growth;
      var grEl  = document.getElementById("detail-growth");
      var indEl = document.getElementById("growth-indicator");

      grEl.textContent = (gr >= 0 ? "+" : "") + window.formatNum(gr);

      if (gr >= 0) {
        indEl.textContent = "Growing naturally";
        indEl.className   = "details-panel__growth-indicator growth-positive";
      } else {
        indEl.textContent = "Shrinking naturally";
        indEl.className   = "details-panel__growth-indicator growth-negative";
      }
    } else {
      document.getElementById("detail-births").textContent = "No data";
      document.getElementById("detail-deaths").textContent = "No data";
      document.getElementById("detail-growth").textContent = "No data";
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

    var titleEl = document.getElementById("trend-title");
    var subEl   = document.getElementById("trend-subtitle");
    var emptyEl = document.getElementById("trend-empty");
    var legendEl = document.getElementById("trend-legend");

    if (titleEl) titleEl.textContent = name + " — Population Trend";
    if (subEl) subEl.textContent = "1950–2100  ·  estimates then medium projections";
    if (emptyEl) emptyEl.style.display = "none";
    if (legendEl) legendEl.style.display = "flex";

    if (!records || !records.length) {
      document.getElementById("trend-chart-wrap").innerHTML =
        '<div class="trend-empty"><p>No trend data for ' + name + '.</p></div>';
      return;
    }

    d3.select("#trend-chart-wrap svg").remove();

    var wrap   = document.getElementById("trend-chart-wrap");
    var W      = wrap.clientWidth || 700;
    var wrapHeight = wrap.clientHeight || 120;
    var H      = Math.max(120, wrapHeight);

    var margin = { top: 10, right: 16, bottom: 28, left: 54 };
    var iW     = W - margin.left - margin.right;
    var iH     = H - margin.top  - margin.bottom;

    var svg = d3.select("#trend-chart-wrap")
      .append("svg")
      .attr("width",  W)
      .attr("height", H);

    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var xScale = d3.scaleLinear()
      .domain([1950, 2100])
      .range([0, iW]);

    var allVals = records.flatMap(function (r) { return [r.births, r.deaths]; });
    var yScale  = d3.scaleLinear()
      .domain([0, d3.max(allVals) * 1.08])
      .nice()
      .range([iH, 0]);

    g.append("g")
      .attr("class", "trend-axis")
      .attr("transform", "translate(0," + iH + ")")
      .call(
        d3.axisBottom(xScale)
          .tickValues([1950, 1975, 2000, 2025, 2050, 2075, 2100])
          .tickFormat(d3.format("d"))
          .tickSize(3)
      );

    g.append("g")
      .attr("class", "trend-axis")
      .call(
        d3.axisLeft(yScale)
          .ticks(4)
          .tickFormat(function (d) { return window.formatNum(d); })
          .tickSize(3)
      );

    function makeLine(yAccessor, definedFn) {
      return d3.line()
        .x(function (r) { return xScale(r.year); })
        .y(function (r) { return yScale(yAccessor(r)); })
        .defined(definedFn);
    }

    var lineBirths = makeLine(
      function (r) { return r.births; },
      function (r) { return r.births != null; }
    );

    var lineDeaths = makeLine(
      function (r) { return r.deaths; },
      function (r) { return r.deaths != null; }
    );

    var lineGrowth = makeLine(
      function (r) { return Math.max(0, r.natural_growth); },
      function (r) { return r.natural_growth != null; }
    );

    g.append("path").datum(records).attr("class", "trend-line-births").attr("d", lineBirths);
    g.append("path").datum(records).attr("class", "trend-line-deaths").attr("d", lineDeaths);
    g.append("path").datum(records).attr("class", "trend-line-growth").attr("d", lineGrowth);

    state.trendSvg = { g: g, xScale: xScale, iH: iH };
    drawYearMarker(g, xScale, iH, state.year);
  }

  function drawYearMarker(g, xScale, iH, year) {
    g.selectAll(".trend-year-line").remove();
    g.append("line")
      .attr("class", "trend-year-line")
      .attr("x1", xScale(year)).attr("x2", xScale(year))
      .attr("y1", 0).attr("y2", iH);
  }

  function updateYearMarker() {
    if (!state.trendSvg) return;
    drawYearMarker(state.trendSvg.g, state.trendSvg.xScale, state.trendSvg.iH, state.year);
  }

  function setupTrendResizeObserver() {
    var trendPanel = document.getElementById("trend-panel");
    if (!trendPanel || !window.ResizeObserver) return;

    if (state.trendResizeObserver) {
      state.trendResizeObserver.disconnect();
    }

    state.trendResizeObserver = new ResizeObserver(function () {
      if (state.selectedCode) {
        drawTrendChart(state.selectedCode);
      }
    });

    state.trendResizeObserver.observe(trendPanel);
  }

  // ================================================================
  // LEGEND
  // ================================================================

  function updateLegend() {
    var meta    = METRIC_META[state.metric];
    var gradEl  = document.getElementById("legend-gradient");
    var lowEl   = document.getElementById("legend-low");
    var highEl  = document.getElementById("legend-high");
    var titleEl = document.getElementById("legend-title");

    if (titleEl) titleEl.textContent = meta.label;

    var values = [];
    state.allData.forEach(function (row) {
      if (
        row.year === state.year &&
        row[state.metric] != null &&
        state.countryNames[row.code]
      ) {
        values.push(row[state.metric]);
      }
    });

    if (!values.length) return;

    var minVal = d3.min(values);
    var maxVal = d3.max(values);

    if (meta.diverging) {
      var maxAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
      if (lowEl) lowEl.textContent  = "−" + window.formatNum(maxAbs);
      if (highEl) highEl.textContent = "+" + window.formatNum(maxAbs);
      if (gradEl) gradEl.style.background = "linear-gradient(to right, #9b1717, #1a2635, #1565c0)";
    } else {
      if (lowEl) lowEl.textContent = "0";
      if (highEl) highEl.textContent = window.formatNum(maxVal);
      if (gradEl) {
        gradEl.style.background = state.metric === "births"
          ? "linear-gradient(to right, #0b1e30, #4fc3f7)"
          : "linear-gradient(to right, #1c080c, #ef5350)";
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
      var args = arguments, ctx = this;
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

})();