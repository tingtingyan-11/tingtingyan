/* =========================================================
   Tingting Yan — site interactions (vanilla JS, no deps)
   ========================================================= */
(function () {
  'use strict';

  /* ---- Footer year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Active-section highlight in nav ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- Publications show/hide ---- */
  var toggleBtn = document.querySelector('.toggle-btn');
  if (toggleBtn) {
    var target = document.querySelector(toggleBtn.getAttribute('data-target'));
    toggleBtn.addEventListener('click', function () {
      var hidden = target.hasAttribute('hidden');
      if (hidden) {
        target.removeAttribute('hidden');
        toggleBtn.textContent = 'Hide full publication list';
        toggleBtn.setAttribute('aria-expanded', 'true');
        // reveal newly shown items
        target.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      } else {
        target.setAttribute('hidden', '');
        toggleBtn.textContent = 'Show full publication list';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  /* ---- Scroll reveal ---- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    // Stagger the hero reveals on load for a polished entrance
    var hero = document.querySelectorAll('.hero .reveal');
    hero.forEach(function (el, i) { el.style.transitionDelay = (i * 90) + 'ms'; });

    reveals.forEach(function (el) { obs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- External profile links (placeholders until URLs supplied) ----
     Replace the empty strings below with the real URLs. Any link left
     empty stays disabled so no broken links go live. */
  var PROFILE_URLS = {
    scholar: 'https://scholar.google.com/citations?user=pcxTCZkAAAAJ',
    linkedin: 'https://www.linkedin.com/in/tingting-yan-39aab221/',
    orcid: 'https://orcid.org/0000-0003-4524-3922',
    ttu: 'https://www.depts.ttu.edu/rawlsbusiness/people/faculty/marketing/tingting-yan/'
  };
  document.querySelectorAll('[data-link]').forEach(function (a) {
    var key = a.getAttribute('data-link');
    var url = PROFILE_URLS[key];
    if (url) {
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      a.setAttribute('href', '#');
      a.setAttribute('aria-disabled', 'true');
      a.title = 'Link coming soon';
      a.addEventListener('click', function (e) { e.preventDefault(); });
    }
  });

  /* ---- Scroll progress bar + back-to-top ---- */
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var st = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var pct = h > 0 ? (st / h) * 100 : 0;
    if (progress) progress.style.width = pct + '%';
    if (toTop) toTop.classList.toggle('show', st > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Count-up animation for stat numbers ---- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target) || reduceMotion) { el.textContent = target + suffix; return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var statNums = document.querySelectorAll('.stat-num[data-count]');
  if ('IntersectionObserver' in window && statNums.length) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); statObs.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    statNums.forEach(function (el) { statObs.observe(el); });
  } else {
    statNums.forEach(countUp);
  }
})();
