/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 * Also renders a subtle D3 world-map outline in the hero background
 * and a more-visible map in the preview gateway section.
 * Only loaded on the home page (via {% block scripts %}).
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    // ── 0. Background maps ─────────────────────────────────────────────
    drawHeroMap();
    drawPreviewMap();

    gsap.registerPlugin(ScrollTrigger);

    // ── 1. Hero entrance — sequential reveals ──────────────────────────
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .to("#hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, delay: 0.3 })
      .to("#hero-title",   { opacity: 1, y: 0, duration: 0.9 }, "-=0.3")
      .to("#hero-sub",     { opacity: 1, y: 0, duration: 0.7 }, "-=0.45")
      .to("#hero-actions", { opacity: 1, y: 0, duration: 0.6 }, "-=0.35")
      .to("#hero-scroll",  { opacity: 1,        duration: 0.8 }, "-=0.1");

    // ── 2. Narrative — metric rows slide in from left ───────────────────
    // Each row arrives from the left and reverses back out when scrolling up.
    // fromTo gives explicit control of both ends so bidirectional works cleanly.
    gsap.fromTo(".narrative .metric-row",
      { x: -50, opacity: 0 },
      {
        x: 0, opacity: 1,
        duration: 0.75, ease: "power3.out", stagger: 0.14,
        scrollTrigger: {
          trigger: ".narrative__metrics",
          start: "top 80%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 3. Narrative — scale stats: scale-up into view ─────────────────
    // Distinct from the metric rows — back.out gives a subtle overshoot.
    gsap.fromTo(".scale-stat",
      { y: 24, opacity: 0, scale: 0.85 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.65, ease: "back.out(1.4)", stagger: 0.09,
        scrollTrigger: {
          trigger: ".narrative__scale",
          start: "top 86%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 4. Preview — parallax on the map background ─────────────────────
    // Scale the bg element slightly larger than its container so the
    // parallax translation does not reveal empty space at the edges.
    gsap.set("#preview-map-bg", { scale: 1.1, y: "-4%" });
    gsap.to("#preview-map-bg", {
      y: "4%",
      ease: "none",
      scrollTrigger: {
        trigger: ".preview",
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5
      }
    });

    // CTA button reveal over the map — bidirectional.
    gsap.fromTo(".preview .reveal-up",
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: {
          trigger: ".preview",
          start: "top 68%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 5. CTA steps — staggered fade from below ────────────────────────
    gsap.fromTo(".cta-step",
      { y: 18, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.6, ease: "power3.out", stagger: 0.09,
        scrollTrigger: {
          trigger: ".cta-final__steps",
          start: "top 88%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 6. CTA inner — scale-up reveal ─────────────────────────────────
    // Scale from slightly smaller + fade up — more impactful than a plain fade.
    gsap.fromTo(".cta-final__inner",
      { opacity: 0, y: 30, scale: 0.96 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 1.0, ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-final__inner",
          start: "top 82%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

  }); // end DOMContentLoaded


  // ================================================================
  // HERO MAP BACKGROUND
  // Faint world-map country outlines + pulsing data-point dots inside
  // the hero section, drawn via D3 on top of the gradient background.
  // ================================================================

  function drawHeroMap() {
    var bg = document.getElementById("hero-map-bg");
    if (!bg) return;

    var hero = document.querySelector(".hero");
    var W    = hero ? hero.offsetWidth  : window.innerWidth;
    var H    = hero ? hero.offsetHeight : window.innerHeight;

    var svg = d3.select("#hero-map-bg")
      .append("svg")
      .attr("class", "hero__map-svg")
      .attr("width",  W)
      .attr("height", H)
      .attr("aria-hidden", "true");

    var projection = d3.geoNaturalEarth1()
      .scale(W / 6.2)
      .translate([W / 2, H / 2]);

    var pathGen = d3.geoPath().projection(projection);

    d3.json("/static/data/world.geojson")
      .then(function (geojson) {

        // Faint country outlines
        svg.append("g")
          .attr("class", "hero-countries")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
            .attr("class", "hero-country")
            .attr("d", pathGen);

        // Lat/lon graticule
        svg.append("path")
          .datum(d3.geoGraticule()())
          .attr("class", "hero-graticule")
          .attr("d", pathGen);

        // Pulsing dots at ~30 country centroids
        var SAMPLE_CODES = [
          "USA","BRA","RUS","CHN","IND","AUS","NGA","DEU",
          "IDN","MEX","EGY","ZAF","IRN","TUR","FRA","ARG",
          "COD","ETH","THA","GBR","JPN","PAK","BGD","VNM",
          "UKR","SDN","KEN","PER","COL","MAR"
        ];

        var dots = [];
        geojson.features.forEach(function (f) {
          if (SAMPLE_CODES.indexOf(f.id) === -1) return;
          var centroid = pathGen.centroid(f);
          if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;
          dots.push({ x: centroid[0], y: centroid[1], code: f.id });
        });

        svg.append("g")
          .attr("class", "hero-dots-pulse")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
            .attr("class", "hero-dot-ring")
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .attr("r",  6)
            .style("animation-delay", function (_, i) { return (i * 0.18) + "s"; });

        svg.append("g")
          .attr("class", "hero-dots-solid")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
            .attr("class", "hero-dot-core")
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .attr("r",  2);
      })
      .catch(function () {
        // Hero still looks fine without the map background
      });
  }


  // ================================================================
  // PREVIEW MAP BACKGROUND
  // Draws the same world-map projection in the preview section frame,
  // at a slightly higher opacity than the hero — more cinematic,
  // shows the map experience before the user enters it.
  // ================================================================

  function drawPreviewMap() {
    var bg    = document.getElementById("preview-map-bg");
    var frame = document.getElementById("preview-map-frame");
    if (!bg || !frame) return;

    var W = frame.offsetWidth  || window.innerWidth;
    var H = frame.offsetHeight || 500;

    var svg = d3.select("#preview-map-bg")
      .append("svg")
      .attr("class", "preview__map-svg")
      .attr("width",  W)
      .attr("height", H)
      .attr("aria-hidden", "true");

    var projection = d3.geoNaturalEarth1()
      .scale(W / 6.2)
      .translate([W / 2, H / 2]);

    var pathGen = d3.geoPath().projection(projection);

    d3.json("/static/data/world.geojson")
      .then(function (geojson) {

        // Ocean sphere — deep navy (matches viz page palette)
        svg.append("path")
          .datum({ type: "Sphere" })
          .attr("d", pathGen)
          .attr("fill", "#071929");

        // Graticule — barely visible
        svg.append("path")
          .datum(d3.geoGraticule()())
          .attr("d", pathGen)
          .attr("fill", "none")
          .attr("stroke", "rgba(30, 75, 140, 0.10)")
          .attr("stroke-width", "0.3px");

        // Countries — dark blue-gray fill, subtle border
        svg.append("g")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
            .attr("d", pathGen)
            .attr("fill", "#14202d")
            .attr("stroke", "rgba(79, 130, 180, 0.30)")
            .attr("stroke-width", "0.4px");
      })
      .catch(function () {
        // Preview still looks fine without the map background
      });
  }

})();
