/*
 * VitalMap — home.js
 * GSAP + ScrollTrigger animations for the Home landing page.
 * Only loaded on the home page (via {% block scripts %}).
 */

(function () {
  "use strict";

  // Wait until DOM + GSAP are both ready
  document.addEventListener("DOMContentLoaded", function () {

    // Register the ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // ── 1. Hero entrance animation ───────────────────────────────
    // Elements fade up/in on page load, staggered in sequence.
    var heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

    heroTl
      .to("#hero-eyebrow", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay: 0.2
      })
      .to("#hero-title", {
        opacity: 1,
        y: 0,
        duration: 0.8
      }, "-=0.3")
      .to("#hero-sub", {
        opacity: 1,
        y: 0,
        duration: 0.7
      }, "-=0.4")
      .to("#hero-actions", {
        opacity: 1,
        y: 0,
        duration: 0.6
      }, "-=0.4")
      .to("#hero-scroll", {
        opacity: 1,
        duration: 0.8
      }, "-=0.1");


    // ── 2. Story section — scroll-triggered reveals ──────────────
    // Section header slides up when scrolled into view.
    gsap.to(".story .reveal-up", {
      scrollTrigger: {
        trigger: ".story",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    });

    // Metric cards stagger in
    gsap.to(".story .metric-card.reveal-up", {
      scrollTrigger: {
        trigger: ".story__cards",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.15
    });


    // ── 3. Why section — left/right slide-ins ───────────────────
    gsap.to(".why .reveal-left", {
      scrollTrigger: {
        trigger: ".why",
        start: "top 75%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      x: 0,
      duration: 0.9,
      ease: "power3.out"
    });

    gsap.to(".why .reveal-right", {
      scrollTrigger: {
        trigger: ".why",
        start: "top 75%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      x: 0,
      duration: 0.9,
      ease: "power3.out",
      delay: 0.15
    });

    // Stat cards stagger in after the grid appears
    gsap.from(".stat-card", {
      scrollTrigger: {
        trigger: ".why__stats",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 0,
      y: 24,
      duration: 0.6,
      ease: "power2.out",
      stagger: 0.1
    });


    // ── 4. Preview section ───────────────────────────────────────
    gsap.to(".preview .reveal-up", {
      scrollTrigger: {
        trigger: ".preview",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out",
      stagger: 0.2
    });


    // ── 5. How to use — step cards stagger ──────────────────────
    gsap.to(".howto .reveal-up", {
      scrollTrigger: {
        trigger: ".howto__steps",
        start: "top 85%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.12
    });


    // ── 6. Final CTA section ────────────────────────────────────
    gsap.to(".cta-final .reveal-up", {
      scrollTrigger: {
        trigger: ".cta-final",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out"
    });

  }); // end DOMContentLoaded
})();
