/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 * Also renders a subtle D3 world-map outline in the hero background.
 * Only loaded on the home page (via {% block scripts %}).
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    // ── 0. Hero background world map ────────────────────────────────
    // Load the same GeoJSON used by the visualization page and draw a
    // very faint country-outline map in the hero section background.
    // Kept at low opacity so the headline text stays fully dominant.
    drawHeroMap();

    // Register the ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // ── 1. Hero entrance animation ───────────────────────────────────
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

    heroTl
      .to("#hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, delay: 0.3 })
      .to("#hero-title",   { opacity: 1, y: 0, duration: 0.8 }, "-=0.3")
      .to("#hero-sub",     { opacity: 1, y: 0, duration: 0.7 }, "-=0.4")
      .to("#hero-actions", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
      .to("#hero-scroll",  { opacity: 1,        duration: 0.8 }, "-=0.1");

    // ── 2. Story section ────────────────────────────────────────────
    gsap.to(".story .reveal-up", {
      scrollTrigger: { trigger: ".story", start: "top 80%", toggleActions: "play none none none" },
      opacity: 1, y: 0, duration: 0.8, ease: "power3.out"
    });

    gsap.to(".story .metric-card.reveal-up", {
      scrollTrigger: { trigger: ".story__cards", start: "top 80%", toggleActions: "play none none none" },
      opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.15
    });

    // ── 3. Why section ───────────────────────────────────────────────
    gsap.to(".why .reveal-left", {
      scrollTrigger: { trigger: ".why", start: "top 75%", toggleActions: "play none none none" },
      opacity: 1, x: 0, duration: 0.9, ease: "power3.out"
    });

    gsap.to(".why .reveal-right", {
      scrollTrigger: { trigger: ".why", start: "top 75%", toggleActions: "play none none none" },
      opacity: 1, x: 0, duration: 0.9, ease: "power3.out", delay: 0.15
    });

    gsap.from(".stat-card", {
      scrollTrigger: { trigger: ".why__stats", start: "top 80%", toggleActions: "play none none none" },
      opacity: 0, y: 24, duration: 0.6, ease: "power2.out", stagger: 0.1
    });

    // ── 4. Preview section ───────────────────────────────────────────
    gsap.to(".preview .reveal-up", {
      scrollTrigger: { trigger: ".preview", start: "top 80%", toggleActions: "play none none none" },
      opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.2
    });

    // ── 5. How to use ────────────────────────────────────────────────
    gsap.to(".howto .reveal-up", {
      scrollTrigger: { trigger: ".howto__steps", start: "top 85%", toggleActions: "play none none none" },
      opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.12
    });

    // ── 6. Final CTA ─────────────────────────────────────────────────
    gsap.to(".cta-final .reveal-up", {
      scrollTrigger: { trigger: ".cta-final", start: "top 80%", toggleActions: "play none none none" },
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out"
    });

  }); // end DOMContentLoaded


  // ================================================================
  // HERO MAP BACKGROUND
  // Draws faint world-map country outlines + pulsing data-point dots
  // inside the .hero__bg element using D3.
  // ================================================================

  function drawHeroMap() {
    var bg = document.getElementById("hero-map-bg");
    if (!bg) return;

    // Use the hero section size for the SVG canvas
    var hero = document.querySelector(".hero");
    var W    = hero ? hero.offsetWidth  : window.innerWidth;
    var H    = hero ? hero.offsetHeight : window.innerHeight;

    // Create SVG — sits behind all hero text
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

    // Fetch the same GeoJSON the viz page uses
    d3.json("/static/data/world.geojson")
      .then(function (geojson) {

        // ── Country outlines ──────────────────────────────────────
        svg.append("g")
          .attr("class", "hero-countries")
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
            .attr("class", "hero-country")
            .attr("d", pathGen);

        // ── Graticule (lat/lon grid) ──────────────────────────────
        svg.append("path")
          .datum(d3.geoGraticule()())
          .attr("class", "hero-graticule")
          .attr("d", pathGen);

        // ── Pulsing data-point dots at ~30 country centroids ──────
        // Pick a representative spread of countries
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

        // Outer pulse ring (CSS animation)
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
            // stagger the animation start per dot
            .style("animation-delay", function (_, i) { return (i * 0.18) + "s"; });

        // Inner solid dot
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
        // GeoJSON failed silently — hero still looks fine without the map
      });
  }

})();
