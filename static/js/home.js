/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 *
 * Hero intro sequence:
 *   1. D3 geoOrthographic globe resolves in and rotates (~1s)
 *   2. GSAP scale pushes the globe toward the camera (zoom — ~0.9s)
 *      Motion blur builds; flat map bleeds through the dark ocean surface
 *   3. Globe exits; map fully resolves
 *   4. Text cascade enters
 *
 * The transition communicates: "we zoomed into the globe — this is the interface."
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Both layers draw immediately (async GeoJSON fetch).
    // Globe is visible first; flat map stays hidden (opacity:0 in CSS)
    // until the GSAP zoom bleeds it through.
    var globeContainer = drawHeroGlobe();
    drawHeroMap();
    drawGatewayMap();

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      // Graceful fallback — reveal everything if GSAP fails to load
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
    // Initial state for all animated elements:
    gsap.set("#hero-globe-bg", { scale: 1, filter: "blur(0px)" });
    gsap.set("#hero-eyebrow",  { y: 20 });
    gsap.set("#hero-title",    { y: 30 });
    gsap.set("#hero-sub",      { y: 20 });
    gsap.set("#hero-actions",  { y: 16 });
    gsap.set("#hero-scroll",   { y: 0 });

    // All timeline positions are absolute seconds (numeric second argument).
    // This makes each beat independent — changing one duration does not shift others.
    //
    // Beat schedule:
    //   0.10s — globe fades in; D3 rotation already running
    //   1.15s — zoom push begins (scale 1 → 4.0, power2.in — accelerating camera)
    //   1.15s — motion blur builds alongside zoom (blur 0 → 8px)
    //   1.40s — flat map bleeds through the expanding ocean surface
    //   1.85s — globe fades out while still zooming; onComplete stops timer + resets
    //   2.10s — map settles to full opacity
    //   2.15s — text cascade begins

    var heroTl = gsap.timeline();

    heroTl
      // Beat 1 — globe appears
      .to("#hero-globe-bg", {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out"
      }, 0.1)

      // Beat 2a — zoom push: scale outward from viewport centre
      // power2.in = slow start accelerating — reads as camera gaining speed toward globe
      .to("#hero-globe-bg", {
        scale: 4.0,
        duration: 0.9,
        ease: "power2.in"
      }, 1.15)

      // Beat 2b — motion blur builds in parallel with zoom (sells the speed)
      .to("#hero-globe-bg", {
        filter: "blur(8px)",
        duration: 0.9,
        ease: "power2.in"
      }, 1.15)

      // Beat 3 — flat map bleeds through the dark ocean surface
      // Starts 0.25s into the zoom (globe still small at scale ~1.35 — just cracking open)
      .to("#hero-map-bg", {
        opacity: 0.9,
        duration: 0.6,
        ease: "power2.inOut"
      }, 1.40)

      // Beat 4 — globe exits while still zooming (it "passes the camera")
      .to("#hero-globe-bg", {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: function () {
          // Stop D3 rotation timer — frees CPU before text cascade
          if (globeContainer && globeContainer._d3timer) {
            globeContainer._d3timer.stop();
          }
          // Reset scale + filter so the invisible element doesn't occupy GPU paint area
          gsap.set("#hero-globe-bg", { scale: 1, filter: "blur(0px)" });
        }
      }, 1.85)

      // Beat 5 — map fully resolves
      .to("#hero-map-bg", {
        opacity: 1,
        duration: 0.3,
        ease: "power1.out"
      }, 2.10)

      // Text cascade — power4.out on title for display-weight deceleration
      .to("#hero-eyebrow", {
        opacity: 1, y: 0,
        duration: 0.6,
        ease: "power3.out"
      }, 2.15)

      .to("#hero-title", {
        opacity: 1, y: 0,
        duration: 0.85,
        ease: "power4.out"
      }, 2.40)

      .to("#hero-sub", {
        opacity: 1, y: 0,
        duration: 0.65,
        ease: "power3.out"
      }, 2.75)

      .to("#hero-actions", {
        opacity: 1, y: 0,
        duration: 0.55,
        ease: "power3.out"
      }, 3.00)

      .to("#hero-scroll", {
        opacity: 1,
        duration: 0.7,
        ease: "power2.out"
      }, 3.20);

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
  //
  // D3 timer starts IMMEDIATELY on the sphere + graticule (drawn synchronously),
  // before the GeoJSON fetch resolves. Countries are added to the running
  // animation when the fetch completes — no restart needed.
  //
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

    // SVG defs: off-centre radial gradient for ocean depth illusion
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
      .rotate([-15, -25, 0]); // start near Europe / Atlantic

    var pathGen = d3.geoPath().projection(projection);

    // ── Synchronous paths (drawn immediately, no GeoJSON needed) ────────

    var spherePath = svg
      .append("path")
      .datum({ type: "Sphere" })
      .attr("fill", "url(#globe-ocean-grad)")
      .attr("stroke", "rgba(79, 195, 247, 0.12)")
      .attr("stroke-width", "0.8px")
      .attr("d", pathGen);

    var gratPath = svg
      .append("path")
      .datum(d3.geoGraticule()())
      .attr("fill", "none")
      .attr("stroke", "rgba(79, 195, 247, 0.07)")
      .attr("stroke-width", "0.4px")
      .attr("d", pathGen);

    var countriesG = svg.append("g");

    // ── Rotation timer — starts NOW, before GeoJSON loads ───────────────
    // countryPaths starts null; the timer checks on every tick.
    // When .then() assigns it, the running timer picks it up automatically.

    var countryPaths = null;
    var yaw = -15;

    var timer = d3.timer(function (elapsed) {
      yaw = -15 + elapsed * 0.010; // 10 degrees per second
      projection.rotate([yaw, -25, 0]);
      spherePath.attr("d", pathGen);
      gratPath.attr("d", pathGen);
      if (countryPaths) countryPaths.attr("d", pathGen);
    });

    // Store on container so GSAP onComplete can stop it
    container._d3timer = timer;

    // ── Async: add country paths to the running animation ───────────────
    d3
      .json("/static/data/world.geojson")
      .then(function (geojson) {
        countryPaths = countriesG
          .selectAll("path")
          .data(geojson.features)
          .enter()
          .append("path")
          .attr("fill", "#0f2033")
          .attr("stroke", "rgba(79, 195, 247, 0.18)")
          .attr("stroke-width", "0.5px")
          .attr("d", pathGen);
      })
      .catch(function () {});

    return container;
  }

  // ── drawHeroMap ────────────────────────────────────────────────────────
  // Flat geoNaturalEarth1 map for the hero background (unchanged).

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
  // Full-colour D3 map for the gateway section (unchanged).

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
