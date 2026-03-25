/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 * Also renders a subtle D3 world-map outline in the hero background
 * and a more-visible map in the gateway section.
 * Only loaded on the home page.
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    drawHeroMap();
    drawGatewayMap();

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTl
      .to("#hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, delay: 0.3 })
      .to("#hero-title", { opacity: 1, y: 0, duration: 0.9 }, "-=0.3")
      .to("#hero-sub", { opacity: 1, y: 0, duration: 0.7 }, "-=0.45")
      .to("#hero-actions", { opacity: 1, y: 0, duration: 0.6 }, "-=0.35")
      .to("#hero-scroll", { opacity: 1, duration: 0.8 }, "-=0.1");

    // Story chapters
    document.querySelectorAll(".story__chapter").forEach(function (chapter) {
      var metric = chapter.querySelector(".story__chapter-metric");
      var text = chapter.querySelector(".story__chapter-text");

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

    // Gateway parallax
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

    // Gateway content
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

    // Finale
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

  function drawHeroMap() {
    var bg = document.getElementById("hero-map-bg");
    if (!bg || typeof d3 === "undefined") return;

    var hero = document.querySelector(".hero");
    var W = hero ? hero.offsetWidth : window.innerWidth;
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

          dots.push({
            x: p[0],
            y: p[1],
            type: i % 2 === 0 ? "growth" : "death"
          });
        });

        svg.append("g")
          .attr("class", "hero-dots-pulse")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
          .attr("class", function (d) {
            return "hero-dot-ring hero-dot-ring--" + d.type;
          })
          .attr("cx", function (d) { return d.x; })
          .attr("cy", function (d) { return d.y; })
          .attr("r", 6)
          .style("animation-delay", function (_, i) {
            return (i * 0.18) + "s";
          });

        svg.append("g")
          .attr("class", "hero-dots-solid")
          .selectAll("circle")
          .data(dots)
          .enter()
          .append("circle")
          .attr("class", function (d) {
            return "hero-dot-core hero-dot-core--" + d.type;
          })
          .attr("cx", function (d) { return d.x; })
          .attr("cy", function (d) { return d.y; })
          .attr("r", 2);
      })
      .catch(function () {});
  }

  function drawGatewayMap() {
    var bg = document.getElementById("gateway-map-bg");
    var frame = document.getElementById("gateway-frame");
    if (!bg || !frame || typeof d3 === "undefined") return;

    var W = frame.offsetWidth || window.innerWidth;
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