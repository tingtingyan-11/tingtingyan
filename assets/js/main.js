/* =========================================================
   Tingting Yan — site interactions (vanilla JS, no deps)
   ========================================================= */
(function () {
  'use strict';

  /* ---- Shared language state (set by the i18n module below) ---- */
  var I18N = { lang: 'en' };

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

  /* ---- Publications show/hide (language-aware label) ---- */
  var toggleBtn = document.querySelector('.toggle-btn');
  var pubTarget = toggleBtn ? document.querySelector(toggleBtn.getAttribute('data-target')) : null;
  var pubOpen = false;
  function setPubToggleLabel() {
    if (!toggleBtn) return;
    var L = (I18N.lang === 'zh')
      ? { show: '展开全部论文', hide: '收起全部论文' }
      : { show: 'Show full publication list', hide: 'Hide full publication list' };
    toggleBtn.textContent = pubOpen ? L.hide : L.show;
  }
  if (toggleBtn && pubTarget) {
    toggleBtn.addEventListener('click', function () {
      var hidden = pubTarget.hasAttribute('hidden');
      if (hidden) {
        pubTarget.removeAttribute('hidden');
        pubOpen = true;
        toggleBtn.setAttribute('aria-expanded', 'true');
        pubTarget.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      } else {
        pubTarget.setAttribute('hidden', '');
        pubOpen = false;
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setPubToggleLabel();
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

  /* =========================================================
     Bilingual support (EN / 简体中文)
     Narrative + labels are translated; publication titles,
     journal names, author names, awards, and course codes
     stay in English (standard academic-record convention).
     ========================================================= */
  var ZH = {
    'brand.name': '严婷婷', 'hero.name': '严婷婷', 'footer.name': '严婷婷',

    'nav.about': '关于', 'nav.research': '研究', 'nav.publications': '论文发表',
    'nav.teaching': '教学', 'nav.service': '学术服务', 'nav.awards': '荣誉',
    'nav.personal': '个人', 'nav.contact': '联系',

    'hero.eyebrow': '罗尔斯商学院 · 德克萨斯理工大学',
    'hero.titles': '供应链管理 Jerry S. Rawls 讲席教授<br />科研与对外合作副院长<br /><span class="muted">市场营销与供应链管理系</span>',
    'hero.bio': '我研究企业如何通过运用其供应网络、并理解供应商的延伸网络来实现可持续创新。我的研究涵盖供应商创新、供应网络结构、行为运营管理，以及跨组织新产品开发项目的管理——综合运用实地实验、问卷调查、二手面板数据与仿真方法。',
    'link.email': '邮箱', 'link.ttu': 'TTU 主页',
    'edu.label': '教育背景',

    'apt.label': '学术任职',
    'apt.chair': '<strong>供应链管理 Jerry S. Rawls 讲席教授</strong> — Rawls College of Business, Texas Tech University',
    'apt.dean': '<strong>科研与对外合作副院长</strong> — Rawls College of Business, Texas Tech University',
    'apt.audencia': '<strong>国际特聘教师</strong> — Audencia Business School, Nantes, France',
    'apt.prof': '<strong>供应链管理 Jerry S. Rawls 教授</strong> — Rawls College of Business, Texas Tech University',
    'apt.fullprof': '<strong>教授</strong> — Mike Ilitch School of Business, Wayne State University<br /><span class="muted">Charles H. Gershenson 杰出教职研究员，2021–23。</span>',
    'apt.assocprof': '<strong>副教授</strong> — Mike Ilitch School of Business, Wayne State University',
    'apt.asstprof': '<strong>助理教授</strong> — Mike Ilitch School of Business, Wayne State University',

    'stat.refereed': '同行评审期刊论文',
    'stat.ftutd': 'FT50 与 UTD24 期刊论文',
    'stat.scm': '顶级实证供应链期刊论文',
    'stat.editorial': '现任编辑职务',
    'hero.cites': '次被引',
    'hero.h': 'h 指数',
    'hero.i10': 'i10 指数',
    'hero.asof': '截至 2026 年 6 月',

    'sec.research': '研究',
    'research.theme': '“企业如何通过运用其供应网络、并深入理解供应商的延伸网络，更好地实现可持续创新？”',
    'topic.1.h': '供应商创新',
    'topic.1.p': '企业如何寻源、引导并从供应商主导的创新中获取价值——包括被 CAPS Research 采纳的关键供应商（nexus supplier）视角。',
    'topic.2.h': '供应网络',
    'topic.2.p': '从结构视角研究供应网络与客户网络、结构对等性、基于网络的创新价值，以及知识在全球网络中的扩散。',
    'topic.3.h': '行为运营管理',
    'topic.3.p': '买卖双方关系中的管理决策——合同设计、心理契约、机会主义行为，以及对供应链中断的应对。',
    'topic.4.h': '可持续发展',
    'topic.4.p': '企业社会责任在供应链中的扩散、客户环境信息披露与供应商排放，以及为更广泛的环境影响而创新。',
    'topic.5.h': '新产品开发与项目管理',
    'topic.5.p': '在有供应商参与的跨组织新产品开发项目中的协调、领导力与价值创造。',
    'topic.6.h': '数字化与人工智能',
    'topic.6.p': '通过实地实验与面板数据研究服务化、数字化韧性，以及生成式人工智能赋能的价值共创。',

    'sec.publications': '论文发表',
    'pub.lead': '我在 <strong>金融时报 50 强（FT50）</strong>与 <strong>UT Dallas 24 强</strong>期刊上发表的论文优先展示，其后是我在<strong>顶级实证供应链管理期刊</strong>（<a href="http://www.scmlist.com/" target="_blank" rel="noopener">SCM Journal List</a>）上的论文。完整记录——40 余篇期刊论文、社论与教学案例——可在下方展开。',
    'legend.ft': '<span class="tag ft">FT50</span> 金融时报 50 强期刊',
    'legend.utd': '<span class="tag utd">UTD24</span> UT Dallas 24 强期刊',
    'legend.scm': '<span class="tag scm">SCM List</span> 顶级实证供应链期刊 — JOM, JSCM, JBL, Decision Sciences',
    'cite.note': '重点展示论文的引用次数来自 <a href="https://scholar.google.com/citations?user=pcxTCZkAAAAJ" target="_blank" rel="noopener">Google Scholar</a>，截至 2026 年 6 月。',
    'feat.ftutd': '重点展示 — 发表于 FT50 与 UTD24 期刊',
    'feat.scm': '重点展示 — 顶级实证供应链期刊（<a href="http://www.scmlist.com/" target="_blank" rel="noopener">SCM Journal List</a>）',
    'grp.refereed': '同行评审期刊论文',
    'grp.editorials': '期刊社论',
    'grp.cases': '教学案例',
    'grp.proceedings': '会议论文',
    'grp.other': '其他出版物与资助项目',

    'sec.teaching': '教学',
    'teach.cases': '已出版教学案例',

    'sec.service': '编辑与学术服务',
    'lead.h': '罗尔斯商学院的科研领导工作',
    'lead.p': '作为科研与对外合作副院长，我负责罗尔斯商学院的科研战略——支持并传播六大学科领域的学术研究、管理资助项目，并建设诸如 Rawls 本科生科研项目与 Shannon Rinaldo 学生研究库等项目。相关工作以 <em>“Research Built at Rawls”</em> 为旗号开展。',
    'lead.btn1': '罗尔斯科研网站',
    'lead.btn2': 'LinkedIn 科研主页',
    'svc.current': '现任编辑职务',
    'svc.past': '过往编辑职务',
    'svc.memberships': '专业学会会员',

    'sec.awards': '荣誉与表彰',

    'sec.personal': '研究之外',
    'personal.1.h': '美食与旅行',
    'personal.1.p': '我喜欢探索新的地方以及随之而来的各地美食——在旅途中收集风味、市集，以及一顿好饭背后的故事。',
    'personal.2.h': '徒步',
    'personal.2.p': '山间小径是我思考最清晰的地方。户外时光让灵感与活力都保持流动。',
    'personal.3.h': '钓鱼',
    'personal.3.p': '钓鱼是我面对数据与截止日期时安静的调剂：一种更慢、更有耐心的方式，让心绪在水边沉静下来。',
    'personal.4.h': '园艺',
    'personal.4.p': '打理花园是一门关于耐心与系统思维的功课——细小而持续的投入，在一季之间长成鲜活的生命。',

    'sec.contact': '联系方式',
    'footer.affil': '供应链管理 Jerry S. Rawls 讲席教授<br />科研与对外合作副院长<br />罗尔斯商学院，德克萨斯理工大学<br />美国德克萨斯州拉伯克市',
    'footer.copyright': '© <span id="year">2026</span> 严婷婷 Tingting Yan. 保留所有权利。'
  };

  // Capture the authored English baseline for every translatable element.
  var i18nEls = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));
  i18nEls.forEach(function (el) { el.setAttribute('data-en-html', el.innerHTML); });

  function setYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  function applyLang(lang) {
    i18nEls.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (lang === 'zh' && ZH[key] != null) {
        el.innerHTML = ZH[key];
      } else {
        el.innerHTML = el.getAttribute('data-en-html');
      }
    });
    I18N.lang = lang;
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-Hans' : 'en');
    var langToggle = document.getElementById('langToggle');
    if (langToggle) {
      langToggle.querySelectorAll('.lang-opt').forEach(function (s) {
        s.classList.toggle('active', s.getAttribute('data-lang') === lang);
      });
    }
    setYear();           // footer.copyright may have been re-rendered
    setPubToggleLabel(); // keep the publications button in the active language
    try { localStorage.setItem('site-lang', lang); } catch (e) {}
  }

  var savedLang = 'en';
  try { savedLang = localStorage.getItem('site-lang') || 'en'; } catch (e) {}
  applyLang(savedLang === 'zh' ? 'zh' : 'en');

  var langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', function () {
      applyLang(I18N.lang === 'zh' ? 'en' : 'zh');
    });
  }
})();
