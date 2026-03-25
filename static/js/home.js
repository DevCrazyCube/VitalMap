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

    // ── 1. Hero entrance — sequential stagger ──────────────────────────
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .to("#hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, delay: 0.3 })
      .to("#hero-title",   { opacity: 1, y: 0, duration: 0.9 }, "-=0.3")
      .to("#hero-sub",     { opacity: 1, y: 0, duration: 0.7 }, "-=0.45")
      .to("#hero-actions", { opacity: 1, y: 0, duration: 0.6 }, "-=0.35")
      .to("#hero-scroll",  { opacity: 1,        duration: 0.8 }, "-=0.1");

    // ── 2. Editorial rows — each row reveals with a staggered fade-up ──
    // Bidirectional: rows retreat when scrolling back up.
    gsap.fromTo(".editorial__row",
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0,
        duration: 0.8, ease: "power3.out", stagger: 0.18,
        scrollTrigger: {
          trigger: ".editorial",
          start: "top 78%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 3. Data strip — numbers spring into view with stagger ──────────
    gsap.fromTo(".data-strip__stat",
      { opacity: 0, scale: 0.82, y: 12 },
      {
        opacity: 1, scale: 1, y: 0,
        duration: 0.5, ease: "back.out(1.6)", stagger: 0.09,
        scrollTrigger: {
          trigger: ".data-strip",
          start: "top 90%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 4. Preview — parallax on the map background ─────────────────────
    // Scale up the bg slightly so the y-travel does not expose edges.
    gsap.set("#preview-map-bg", { scale: 1.12, y: "-5%" });
    gsap.to("#preview-map-bg", {
      y: "5%",
      ease: "none",
      scrollTrigger: {
        trigger: ".preview",
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5
      }
    });

    // CTA button reveals from below — bidirectional.
    gsap.fromTo(".preview .reveal-up",
      { opacity: 0, y: 32 },
      {
        opacity: 1, y: 0, duration: 1.0, ease: "power3.out",
        scrollTrigger: {
          trigger: ".preview",
          start: "top 66%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    // ── 5. Ending — guide slides from left, CTA slides from right ──────
    // Two columns arriving from opposite sides — the split feels intentional.
    gsap.fromTo(".ending__guide",
      { opacity: 0, x: -36 },
      {
        opacity: 1, x: 0,
        duration: 0.85, ease: "power3.out",
        scrollTrigger: {
          trigger: ".ending__inner",
          start: "top 80%",
          toggleActions: "play reverse play reverse"
        }
      }
    );

    gsap.fromTo(".ending__cta",
      { opacity: 0, x: 36 },
      {
        opacity: 1, x: 0,
        duration: 0.85, ease: "power3.out",
        scrollTrigger: {
          trigger: ".ending__inner",
          start: "top 80%",
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

        svg.append("g")
          .attr("class", "hero-countries")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
            .attr("class", "hero-country")
            .attr("d", pathGen);

        svg.append("path")
          .datum(d3.geoGraticule()())
          .attr("class", "hero-graticule")
          .attr("d", pathGen);

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
      .catch(function () { /* hero looks fine without the map */ });
  }


  // ================================================================
  // PREVIEW MAP BACKGROUND
  // Draws the same world-map projection in the preview section frame.
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

        svg.append("path")
          .datum({ type: "Sphere" })
          .attr("d", pathGen)
          .attr("fill", "#071929");

        svg.append("path")
          .datum(d3.geoGraticule()())
          .attr("d", pathGen)
          .attr("fill", "none")
          .attr("stroke", "rgba(30, 75, 140, 0.10)")
          .attr("stroke-width", "0.3px");

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
      .catch(function () { /* preview looks fine without the map */ });
  }

})();
