/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 * Hero intro: D3 geoOrthographic globe resolves in → rotates briefly →
 *             crossfades to geoNaturalEarth1 flat map → text cascade.
 * Also renders a gateway section map.
 * Only loaded on the home page.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Both layers start drawing immediately (async GeoJSON fetch).
    // Globe is visible first; flat map is hidden (opacity:0 in CSS)
    // until the GSAP crossfade brings it in.
    var globeContainer = drawHeroGlobe();
    drawHeroMap();
    drawGatewayMap();

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      // Graceful fallback: reveal everything immediately if GSAP fails to load
      var els = [
        "#hero-globe-bg", "#hero-map-bg", "#hero-eyebrow",
        "#hero-title", "#hero-sub", "#hero-actions", "#hero-scroll"
      ];
      if (typeof gsap !== "undefined") {
        gsap.set(els, { opacity: 1, y: 0, x: 0 });
      }
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ── HERO INTRO SEQUENCE ────────────────────────────────────────────────
    //
    // All text elements start opacity:0 in CSS.
    // Set their starting y-offsets here so GSAP can animate them to y:0.

    gsap.set("#hero-eyebrow", { y: 20 });
    gsap.set("#hero-title",   { y: 30 });
    gsap.set("#hero-sub",     { y: 20 });
    gsap.set("#hero-actions", { y: 16 });
    gsap.set("#hero-scroll",  { y: 0 });

    // Timeline uses absolute time positions (numeric second argument to .to())
    // so beats are independent of each other's duration.
    //
    // Beat schedule:
    //   0.10s — globe fades in
    //   0.10–1.50s — globe rotates (D3 timer, runs independently)
    //   1.30s — globe fades out AND flat map fades in (true crossfade)
    //   1.70s — eyebrow enters
    //   1.95s — title enters
    //   2.30s — sub enters
    //   2.55s — actions enter
    //   2.75s — scroll hint enters

    var heroTl = gsap.timeline();

    heroTl
      // Globe resolves into view
      .to("#hero-globe-bg", {
        opacity: 1,
        duration: 0.6,
        delay: 0.1,
        ease: "power2.out"
      })

      // Globe fades out — crossfade with flat map
      .to("#hero-globe-bg", {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: function () {
          // Stop D3 rotation timer once the globe is invisible to free CPU
          if (globeContainer && globeContainer._d3timer) {
            globeContainer._d3timer.stop();
          }
        }
      }, 1.3)

      // Flat map fades in at the same moment (true crossfade)
      .to("#hero-map-bg", {
        opacity: 1,
        duration: 0.8,
        ease: "power2.inOut"
      }, 1.3)

      // Text cascade — each using power3.out, title uses power4.out for weight
      .to("#hero-eyebrow", {
        opacity: 1, y: 0,
        duration: 0.6,
        ease: "power3.out"
      }, 1.7)

      .to("#hero-title", {
        opacity: 1, y: 0,
        duration: 0.85,
        ease: "power4.out"
      }, 1.95)

      .to("#hero-sub", {
        opacity: 1, y: 0,
        duration: 0.65,
        ease: "power3.out"
      }, 2.3)

      .to("#hero-actions", {
        opacity: 1, y: 0,
        duration: 0.55,
        ease: "power3.out"
      }, 2.55)

      .to("#hero-scroll", {
        opacity: 1,
        duration: 0.7,
        ease: "power2.out"
      }, 2.75);

    // ── STORY CHAPTERS ─────────────────────────────────────────────────────
    document.querySelectorAll(".story__chapter").forEach(function (chapter) {
      var metric = chapter.querySelector(".story__chapter-metric");
      var text   = chapter.querySelector(".story__chapter-text");

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: chapter,
          start: "top 82%",
          toggleActions: "play reverse play reverse"
        }
      });

      if (metric) {
        tl.fromTo(
          metric,
          { opacity: 0, x: -60 },
          { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" }
        );
      }

      if (text) {
        tl.fromTo(
          text,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" },
          "-=0.5"
        );
      }
    });

    // ── GATEWAY PARALLAX ───────────────────────────────────────────────────
    if (document.getElementById("gateway-map-bg")) {
      gsap.set("#gateway-map-bg", { scale: 1.12, y: "-5%" });

      gsap.to("#gateway-map-bg", {
        y: "5%",
        ease: "none",
        scrollTrigger: {
          trigger: ".gateway",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5
        }
      });
    }

    if (document.querySelector(".gateway__content")) {
      gsap.fromTo(
        ".gateway__content",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".gateway",
            start: "top 68%",
            toggleActions: "play reverse play reverse"
          }
        }
      );
    }

    // ── FINALE (forward-compatible) ────────────────────────────────────────
    if (document.querySelector(".finale__inner")) {
      gsap.fromTo(
        ".finale__inner",
        { opacity: 0, scale: 0.96, y: 24 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".finale",
            start: "top 80%",
            toggleActions: "play reverse play reverse"
          }
        }
      );
    }
  });

  // ── drawHeroGlobe ──────────────────────────────────────────────────────
  // Draws a D3 geoOrthographic globe in #hero-globe-bg.
  // Starts a slow-rotation D3 timer immediately after GeoJSON loads.
  // Returns the container element so the GSAP onComplete can stop the timer.

  function drawHeroGlobe() {
    var container = document.getElementById("hero-globe-bg");
    if (!container || typeof d3 === "undefined") return null;

    // Globe diameter: 72% of the shorter viewport dimension, max 520px
    var size = Math.min(
      Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.72),
      520
    );

    container.innerHTML = "";

    var svg = d3
      .select("#hero-globe-bg")
      .append("svg")
      .attr("class", "hero__globe-svg")
      .attr("width", size)
      .attr("height", size)
      .attr("viewBox", "0 0 " + size + " " + size)
      .attr("aria-hidden", "true");

    // SVG defs: radial gradient for ocean (off-centre highlight for depth)
    var defs = svg.append("defs");
    var oceanGrad = defs
      .append("radialGradient")
      .attr("id", "globe-ocean-grad")
      .attr("cx", "42%")
      .attr("cy", "38%")
      .attr("r", "60%");
    oceanGrad.append("stop").attr("offset",   "0%").attr("stop-color", "#0e2540");
    oceanGrad.append("stop").attr("offset",  "55%").attr("stop-color", "#091929");
    oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#040d18");

    var projection = d3
      .geoOrthographic()
      .scale(size / 2.15)
      .translate([size / 2, size / 2])
      .clipAngle(90)
      .rotate([-15, -25, 0]); // start near Europe/Atlantic

    var pathGen = d3.geoPath().projection(projection);

    // Ocean sphere
    svg
      .append("path")
      .datum({ type: "Sphere" })
      .attr("fill", "url(#globe-ocean-grad)")
      .attr("stroke", "rgba(79, 195, 247, 0.12)")
      .attr("stroke-width", "0.8px")
      .attr("d", pathGen);

    // Graticule
    var gratPath = svg
      .append("path")
      .datum(d3.geoGraticule()())
      .attr("fill", "none")
      .attr("stroke", "rgba(79, 195, 247, 0.07)")
      .attr("stroke-width", "0.4px")
      .attr("d", pathGen);

    // Country paths group — populated after GeoJSON loads
    var countriesG = svg.append("g");

    // Sphere outline reference for redraw
    var spherePath = svg.select("path");

    d3
      .json("/static/data/world.geojson")
      .then(function (geojson) {
        var countryPaths = countriesG
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
          .attr("fill", "#0f2033")
          .attr("stroke", "rgba(79, 195, 247, 0.18)")
          .attr("stroke-width", "0.5px")
          .attr("d", pathGen);

        // Slow rotation: 10 degrees per second (0.010 deg/ms)
        // Starting longitude: -15 deg (Europe visible)
        var timer = d3.timer(function (elapsed) {
          var yaw = -15 + elapsed * 0.010;
          projection.rotate([yaw, -25, 0]);

          spherePath.attr("d", pathGen);
          gratPath.attr("d", pathGen);
          countryPaths.attr("d", pathGen);
        });

        // Store on container so the GSAP onComplete can call .stop()
        container._d3timer = timer;
      })
      .catch(function () {});

    return container;
  }

  // ── drawHeroMap ────────────────────────────────────────────────────────
  // Flat geoNaturalEarth1 map for the hero background (existing logic, unchanged).

  function drawHeroMap() {
    var bg = document.getElementById("hero-map-bg");
    if (!bg || typeof d3 === "undefined") return;

    var hero = document.querySelector(".hero");
    var W = hero ? hero.offsetWidth  : window.innerWidth;
    var H = hero ? hero.offsetHeight : window.innerHeight;

    bg.innerHTML = "";

    var svg = d3
      .select("#hero-map-bg")
      .append("svg")
      .attr("class", "hero__map-svg")
      .attr("width", W)
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
        geojson.features.forEach(function (feature, i) {
          if (SAMPLE_CODES.indexOf(feature.id) === -1) return;
          var p = pathGen.centroid(feature);
          if (!p || isNaN(p[0]) || isNaN(p[1])) return;
          dots.push({ x: p[0], y: p[1], type: i % 2 === 0 ? "growth" : "death" });
        });

        svg.append("g")
          .attr("class", "hero-dots-pulse")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
          .attr("class", function (d) { return "hero-dot-ring hero-dot-ring--" + d.type; })
          .attr("cx", function (d) { return d.x; })
          .attr("cy", function (d) { return d.y; })
          .attr("r", 6)
          .style("animation-delay", function (_, i) { return (i * 0.18) + "s"; });

        svg.append("g")
          .attr("class", "hero-dots-solid")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
          .attr("class", function (d) { return "hero-dot-core hero-dot-core--" + d.type; })
          .attr("cx", function (d) { return d.x; })
          .attr("cy", function (d) { return d.y; })
          .attr("r", 2);
      })
      .catch(function () {});
  }

  // ── drawGatewayMap ────────────────────────────────────────────────────
  // Full-colour D3 map for the gateway section (existing logic, unchanged).

  function drawGatewayMap() {
    var bg    = document.getElementById("gateway-map-bg");
    var frame = document.getElementById("gateway-frame");
    if (!bg || !frame || typeof d3 === "undefined") return;

    var W = frame.offsetWidth  || window.innerWidth;
    var H = frame.offsetHeight || 500;

    bg.innerHTML = "";

    var svg = d3
      .select("#gateway-map-bg")
      .append("svg")
      .attr("class", "gateway__map-svg")
      .attr("width", W)
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
      .catch(function () {});
  }
})();
