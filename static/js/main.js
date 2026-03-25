/*
 * VitalMap — main.js
 * Shared utilities that run on every page.
 */

(function () {
  "use strict";

  // ── Navbar: mark active link from URL ──────────────────────────
  // Flask already injects the `active` class via the `page` variable
  // in base.html, but this fallback handles any edge cases.
  function markActiveNav() {
    var path = window.location.pathname;
    var links = document.querySelectorAll(".navbar__links a");
    links.forEach(function (link) {
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });
  }

  // ── Flash messages: auto-dismiss after 6 seconds ────────────────
  function autoHideFlash() {
    var flashes = document.querySelectorAll(".flash");
    flashes.forEach(function (el) {
      setTimeout(function () {
        el.style.transition = "opacity 0.4s, transform 0.4s";
        el.style.opacity = "0";
        el.style.transform = "translateX(20px)";
        setTimeout(function () { el.remove(); }, 420);
      }, 6000);
    });
  }

  // ── Number formatter ───────────────────────────────────────────
  // Exported as window.formatNum so vizualization.js can use it.
  window.formatNum = function (n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    var abs = Math.abs(n);
    var sign = n < 0 ? "−" : "";
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + " B";
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + " M";
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + " K";
    return sign + Math.round(abs).toLocaleString();
  };

  // ── Init ───────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    markActiveNav();
    autoHideFlash();
  });
})();
