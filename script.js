// jimmypark.net — homepage runtime.
//
// Loads data/site-config.json + data/portfolio.json and renders every section
// from a single source of truth so the admin (manage.html) can edit any text on
// the site without touching markup. The HTML keeps Korean fallback text so the
// page is still readable if JS or the JSON fetch fails.

const STORAGE_DRAFT_KEY = 'jimmypark-site-config-draft';
const LANG_KEY = 'jimmypark-language';
const FALLBACK_LANG = 'ko';

// English-primary mode: every headline-level binding renders EN as the main
// label and KR as a small caption underneath. The KR/EN switch is gone — both
// languages are shown together.
const BILINGUAL_PATHS = new Set([
  'hero.eyebrow', 'hero.lead', 'hero.lead_secondary',
  'hero.cta_portfolio', 'hero.cta_email',
  'how_i_work.eyebrow', 'how_i_work.title', 'how_i_work.body',
  'global_experience.eyebrow', 'global_experience.title',
  'global_experience.body', 'global_experience.observations',
  'work.title', 'work.intro',
  'career.title', 'career.intro', 'career.eyebrow',
  'portfolio_intro.title', 'portfolio_intro.intro', 'portfolio_intro.eyebrow',
  'education.eyebrow', 'education.title', 'education.body',
  'principles.title', 'principles.eyebrow',
  'contact.eyebrow', 'contact.title', 'contact.body',
]);

let siteConfig = null;
let portfolioItems = [];
let currentLanguage = 'en'; // bilingual: EN primary, KR caption rendered together

const yearEl = document.querySelector('#year');
const navEl = document.querySelector('#primary-nav');
const heroMetaEl = document.querySelector('#hero-meta-tags'); // removed in v0.011 — keep null-safe
const quickFactsEl = document.querySelector('#quick-facts');
const workListEl = document.querySelector('#work-list'); // section removed from homepage flow
const profileBodyEl = document.querySelector('#profile-body'); // section folded into WHO I AM
const principlesListEl = document.querySelector('#principles-list');
const whoRolesEl = document.querySelector('#who-roles');
const howPillarsEl = document.querySelector('#how-pillars');
const educationListEl = document.querySelector('#education-list');
const careerListEl = document.querySelector('#career-list');
const portfolioGroupsEl = document.querySelector('#portfolio-groups');
const portfolioModalEl = document.querySelector('#portfolio-modal');
let careerData = null;
const countryGridEl = document.querySelector('#country-grid');
const contactEmailEl = document.querySelector('#contact-email');
const heroEmailCtaEl = document.querySelector('#hero-email-cta');
const languageButtons = document.querySelectorAll('[data-lang-button]');

if (yearEl) yearEl.textContent = new Date().getFullYear();

function pickLang(obj, baseKey, lang) {
  if (!obj) return '';
  const langKey = `${baseKey}_${lang}`;
  const fallbackKey = `${baseKey}_${FALLBACK_LANG}`;
  if (typeof obj[langKey] === 'string') return obj[langKey];
  if (typeof obj[fallbackKey] === 'string') return obj[fallbackKey];
  // Plain object with {ko, en} variants
  if (obj && typeof obj === 'object' && (obj.ko || obj.en)) {
    return obj[lang] || obj[FALLBACK_LANG] || '';
  }
  return '';
}

function readByPath(root, path) {
  if (!root) return null;
  const parts = path.split('.');
  let cursor = root;
  for (const part of parts) {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) {
      cursor = cursor[part];
    } else {
      return null;
    }
  }
  return cursor;
}

function resolveLocalised(root, path, lang) {
  const parts = path.split('.');
  const leaf = parts.pop();
  // Top-level lookups (e.g. data-config="brand") have no parent path; default
  // to root so we don't dead-end on readByPath('').
  const parent = parts.length ? readByPath(root, parts.join('.')) : root;
  if (parent == null) return '';
  if (Object.prototype.hasOwnProperty.call(parent, `${leaf}_${lang}`)) {
    return parent[`${leaf}_${lang}`];
  }
  if (Object.prototype.hasOwnProperty.call(parent, `${leaf}_${FALLBACK_LANG}`)) {
    return parent[`${leaf}_${FALLBACK_LANG}`];
  }
  if (Object.prototype.hasOwnProperty.call(parent, leaf)) {
    const value = parent[leaf];
    if (value && typeof value === 'object' && (value.ko || value.en)) {
      return value[lang] || value[FALLBACK_LANG] || '';
    }
    return value;
  }
  return '';
}

function applyConfigToDom(config /* lang ignored — bilingual */) {
  if (!config) return;
  // Plain text bindings: data-config="hero.title"
  document.querySelectorAll('[data-config]').forEach((el) => {
    const path = el.dataset.config;
    if (!path) return;
    const en = resolveLocalised(config, path, 'en');
    const ko = resolveLocalised(config, path, 'ko');
    if (BILINGUAL_PATHS.has(path) && (en || ko)) {
      el.innerHTML = '';
      if (en) {
        const enSpan = document.createElement('span');
        enSpan.className = 'bilingual-en';
        enSpan.textContent = String(en);
        el.appendChild(enSpan);
      }
      if (ko && ko !== en) {
        const koSpan = document.createElement('span');
        koSpan.className = 'bilingual-ko';
        koSpan.textContent = String(ko);
        koSpan.setAttribute('lang', 'ko');
        el.appendChild(koSpan);
      }
      el.classList.add('bilingual');
    } else {
      const v = en || ko;
      if (typeof v === 'string' && v.length) el.textContent = v;
    }
  });
  // Attribute bindings: data-config-attr="content:meta.description;alt:hero.image_alt"
  document.querySelectorAll('[data-config-attr]').forEach((el) => {
    const spec = el.dataset.configAttr;
    if (!spec) return;
    spec.split(';').forEach((entry) => {
      const [attr, path] = entry.split(':').map((s) => (s || '').trim());
      if (!attr || !path) return;
      const value = resolveLocalised(config, path, 'en') || resolveLocalised(config, path, 'ko');
      if (typeof value === 'string' && value.length) el.setAttribute(attr, value);
    });
  });
}

function renderNav(config, lang) {
  if (!navEl || !config || !Array.isArray(config.nav)) return;
  navEl.innerHTML = '';
  config.nav.forEach((item) => {
    if (!item || !item.href) return;
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item[lang] || item[FALLBACK_LANG] || item.key || '';
    navEl.appendChild(a);
  });
}

function renderFooter(config, lang) {
  if (!config || !config.footer) return;
  const manageEl = document.querySelector('[data-footer-role="manage-link"]');
  const topEl    = document.querySelector('[data-footer-role="back-to-top"]');
  if (manageEl) manageEl.textContent = pickLang(config.footer, 'manage_link', lang) || 'Manage';
  if (topEl)    topEl.textContent    = pickLang(config.footer, 'back_to_top', lang) || 'Back to top';
}

function renderHeroMeta(config) {
  if (!heroMetaEl || !config || !config.hero) return;
  const tags = Array.isArray(config.hero.meta_tags) ? config.hero.meta_tags : [];
  if (!tags.length) return;
  heroMetaEl.innerHTML = '';
  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = String(tag);
    heroMetaEl.appendChild(span);
  });
}

function renderQuickFacts(config /* bilingual */) {
  if (!quickFactsEl || !config || !Array.isArray(config.quick_facts)) return;
  quickFactsEl.innerHTML = '';
  config.quick_facts.forEach((row) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = row.label_en || row.label_ko || '';
    const dd = document.createElement('dd');
    const ddEn = document.createElement('span');
    ddEn.className = 'bilingual-en';
    ddEn.textContent = row.value_en || row.value_ko || '';
    dd.appendChild(ddEn);
    if (row.value_ko && row.value_ko !== row.value_en) {
      const ddKo = document.createElement('span');
      ddKo.className = 'bilingual-ko';
      ddKo.setAttribute('lang', 'ko');
      ddKo.textContent = row.value_ko;
      dd.appendChild(ddKo);
    }
    wrap.append(dt, dd);
    quickFactsEl.appendChild(wrap);
  });
}

function renderProfile(config, lang) {
  if (!profileBodyEl || !config || !config.profile) return;
  const paragraphs = (() => {
    const key = `body_${lang}_paragraphs`;
    const fallbackKey = `body_${FALLBACK_LANG}_paragraphs`;
    if (Array.isArray(config.profile[key])) return config.profile[key];
    if (Array.isArray(config.profile[fallbackKey])) return config.profile[fallbackKey];
    // Backwards compatibility — older `body_ko` / `body_en` single strings.
    const single = pickLang(config.profile, 'body', lang);
    if (single) return single.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    return [];
  })();
  profileBodyEl.innerHTML = '';
  paragraphs.forEach((text) => {
    if (!text) return;
    const p = document.createElement('p');
    p.textContent = text;
    profileBodyEl.appendChild(p);
  });
}

function renderWork(config, lang) {
  if (!workListEl || !config || !config.work) return;
  workListEl.innerHTML = '';
  // New v2 schema: `work.categories[]` with description + items_ko/items_en arrays.
  // v1 fallback: `work.items[]` with title/body — render those as anonymous categories.
  const categories = Array.isArray(config.work.categories) ? config.work.categories : null;
  if (categories && categories.length) {
    categories.forEach((cat) => {
      const article = document.createElement('article');
      article.className = 'experience-category';
      const head = document.createElement('div');
      head.className = 'experience-category-head';
      const h3 = document.createElement('h3');
      h3.textContent = pickLang(cat, 'title', lang);
      head.appendChild(h3);
      const desc = pickLang(cat, 'description', lang);
      if (desc) {
        const p = document.createElement('p');
        p.className = 'experience-category-desc';
        p.textContent = desc;
        head.appendChild(p);
      }
      article.appendChild(head);
      const itemsKey = `items_${lang}`;
      const fallbackKey = `items_${FALLBACK_LANG}`;
      const items = Array.isArray(cat[itemsKey]) ? cat[itemsKey]
        : (Array.isArray(cat[fallbackKey]) ? cat[fallbackKey] : []);
      if (items.length) {
        const ul = document.createElement('ul');
        ul.className = 'experience-items';
        items.forEach((item) => {
          if (!item) return;
          const li = document.createElement('li');
          li.textContent = String(item);
          ul.appendChild(li);
        });
        article.appendChild(ul);
      }
      workListEl.appendChild(article);
    });
    return;
  }
  // Legacy v1 fallback
  if (Array.isArray(config.work.items)) {
    config.work.items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'experience-category';
      const h3 = document.createElement('h3');
      h3.textContent = pickLang(item, 'title', lang);
      const p = document.createElement('p');
      p.className = 'experience-category-desc';
      p.textContent = pickLang(item, 'body', lang);
      article.append(h3, p);
      workListEl.appendChild(article);
    });
  }
}

function renderPrinciples(config /* bilingual */) {
  if (!principlesListEl || !config) return;
  const source = config.principles || config.interests || null;
  if (!source) return;
  const items = Array.isArray(source.items) ? source.items : [];
  principlesListEl.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    const en = String(item.en || '').trim();
    const ko = String(item.ko || '').trim();
    if (en) {
      const enP = document.createElement('p');
      enP.className = 'bilingual-en';
      enP.textContent = en;
      li.appendChild(enP);
    }
    if (ko && ko !== en) {
      const koP = document.createElement('p');
      koP.className = 'bilingual-ko';
      koP.setAttribute('lang', 'ko');
      koP.textContent = ko;
      li.appendChild(koP);
    }
    if (!en && !ko) li.textContent = '';
    principlesListEl.appendChild(li);
  });
}

function normaliseCities(country, lang) {
  const raw = country[`cities_${lang}`] != null
    ? country[`cities_${lang}`]
    : country[`cities_${FALLBACK_LANG}`];
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function renderCountries(config /* bilingual */) {
  if (!countryGridEl || !config || !config.global_experience) return;
  const ge = config.global_experience;
  const list = Array.isArray(ge.countries) ? ge.countries : [];
  const homeLabel = pickLang(ge, 'home_label', 'en') || 'Home';
  countryGridEl.innerHTML = '';

  list.forEach((country, idx) => {
    const isHome = !!country.is_home;
    const citiesEn = normaliseCities(country, 'en');
    const citiesKo = normaliseCities(country, 'ko');
    const reasonEn = String(country.reason_en || '').trim();
    const reasonKo = String(country.reason_ko || '').trim();
    const linked = String(country.linked_experience || '').trim();
    const hasDetail = reasonEn || reasonKo || linked;

    // Country card is now a <button> so the click affordance is obvious and
    // keyboard activation toggles the detail panel.
    const li = document.createElement('li');
    li.style.listStyle = 'none';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'country-chip';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `country-detail-${idx}`);
    if (isHome) btn.setAttribute('data-home', '1');

    const head = document.createElement('div');
    head.className = 'country-chip-head';
    const flag = document.createElement('span');
    flag.className = 'country-flag';
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = country.flag || '';
    const name = document.createElement('span');
    name.className = 'country-name';
    name.innerHTML = '';
    const enName = String(country.en || country.code || '').trim();
    const koName = String(country.ko || '').trim();
    const enSpan = document.createElement('span');
    enSpan.className = 'bilingual-en';
    enSpan.textContent = enName || koName;
    name.appendChild(enSpan);
    if (koName && koName !== enName) {
      const koSpan = document.createElement('span');
      koSpan.className = 'bilingual-ko';
      koSpan.setAttribute('lang', 'ko');
      koSpan.textContent = koName;
      name.appendChild(koSpan);
    }
    head.append(flag, name);

    if (isHome) {
      const homeBadge = document.createElement('span');
      homeBadge.className = 'country-home-badge';
      homeBadge.textContent = homeLabel;
      head.appendChild(homeBadge);
    }
    btn.appendChild(head);

    if (citiesEn.length || citiesKo.length) {
      const citiesEl = document.createElement('div');
      citiesEl.className = 'country-cities';
      citiesEl.textContent = (citiesEn.length ? citiesEn : citiesKo).join(' · ');
      btn.appendChild(citiesEl);
    } else if (isHome) {
      const citiesEl = document.createElement('div');
      citiesEl.className = 'country-cities';
      citiesEl.textContent = 'Cities coming soon';
      btn.appendChild(citiesEl);
    }

    if (hasDetail) {
      const detail = document.createElement('div');
      detail.className = 'country-detail';
      detail.id = `country-detail-${idx}`;
      detail.hidden = true;

      if (reasonEn || reasonKo) {
        const reasonWrap = document.createElement('div');
        reasonWrap.className = 'country-reason';
        const label = document.createElement('span');
        label.className = 'country-reason-label';
        label.textContent = 'Why I went';
        reasonWrap.appendChild(label);
        if (reasonEn) {
          const p = document.createElement('p');
          p.textContent = reasonEn;
          reasonWrap.appendChild(p);
        }
        if (reasonKo && reasonKo !== reasonEn) {
          const p = document.createElement('p');
          p.className = 'bilingual-ko';
          p.setAttribute('lang', 'ko');
          p.textContent = reasonKo;
          reasonWrap.appendChild(p);
        }
        detail.appendChild(reasonWrap);
      }

      if (linked) {
        const link = document.createElement('a');
        link.className = 'country-linked';
        link.href = '#work';
        link.dataset.linkedExperience = linked;
        link.textContent = `See: ${linked}`;
        detail.appendChild(link);
      }
      btn.appendChild(detail);
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        detail.hidden = open;
      });
    } else {
      // No detail content — clicking just emphasises briefly but doesn't expand.
      btn.disabled = false;
      btn.addEventListener('click', () => {
        btn.classList.add('country-chip-flash');
        setTimeout(() => btn.classList.remove('country-chip-flash'), 600);
      });
    }

    li.appendChild(btn);
    countryGridEl.appendChild(li);
  });

  // Auto count: countries.length and unique cities (EN preferred, KR fallback).
  const countEl = document.querySelector('#global-stat-countries');
  if (countEl) countEl.textContent = String(list.length || 0);
  const citySet = new Set();
  list.forEach((c) => {
    const arr = normaliseCities(c, 'en');
    const arrKo = normaliseCities(c, 'ko');
    (arr.length ? arr : arrKo).forEach((city) => {
      const v = String(city).trim();
      if (v) citySet.add(v);
    });
  });
  const cityCountEl = document.querySelector('#global-stat-cities');
  if (cityCountEl) cityCountEl.textContent = String(citySet.size || 0);
  // Hide the legacy multi-visit note if present.
  const noteEl = document.querySelector('#global-stat-multi');
  if (noteEl) { noteEl.hidden = true; noteEl.textContent = ''; }
}

function renderContact(config, lang) {
  if (!config || !config.contact) return;
  const email = (config.contact.email || '').trim();
  if (contactEmailEl && email) {
    contactEmailEl.textContent = email;
    contactEmailEl.setAttribute('href', `mailto:${email}`);
  }
  if (heroEmailCtaEl && email) {
    heroEmailCtaEl.setAttribute('href', `mailto:${email}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// WHO I AM — current roles (bilingual editorial labels under name + lead)
// ──────────────────────────────────────────────────────────────────────────
function renderWhoRoles(config) {
  if (!whoRolesEl || !config || !config.hero) return;
  const en = Array.isArray(config.hero.titles_en) ? config.hero.titles_en : [];
  const ko = Array.isArray(config.hero.titles_ko) ? config.hero.titles_ko : [];
  const max = Math.max(en.length, ko.length);
  whoRolesEl.innerHTML = '';
  let any = false;
  for (let i = 0; i < max; i += 1) {
    const e = String(en[i] || '').trim();
    const k = String(ko[i] || '').trim();
    if (!e && !k) continue;
    any = true;
    const li = document.createElement('li');
    li.className = 'who-role';
    const num = document.createElement('span');
    num.className = 'who-role-num';
    num.textContent = String(i + 1).padStart(2, '0');
    const text = document.createElement('div');
    text.className = 'who-role-text';
    if (e) {
      const enSpan = document.createElement('span');
      enSpan.className = 'bilingual-en';
      enSpan.textContent = e;
      text.appendChild(enSpan);
    }
    if (k && k !== e) {
      const koSpan = document.createElement('span');
      koSpan.className = 'bilingual-ko';
      koSpan.setAttribute('lang', 'ko');
      koSpan.textContent = k;
      text.appendChild(koSpan);
    }
    li.append(num, text);
    whoRolesEl.appendChild(li);
  }
  whoRolesEl.hidden = !any;
}

// ──────────────────────────────────────────────────────────────────────────
// HOW I WORK — four pillars rendered as editorial archive entries
// ──────────────────────────────────────────────────────────────────────────
function renderHowIWork(config) {
  if (!howPillarsEl || !config || !config.how_i_work) return;
  const pillars = Array.isArray(config.how_i_work.pillars) ? config.how_i_work.pillars : [];
  howPillarsEl.innerHTML = '';
  pillars.forEach((p, i) => {
    const article = document.createElement('article');
    article.className = 'how-pillar';
    article.dataset.key = p.key || '';

    const head = document.createElement('header');
    head.className = 'how-pillar-head';
    const num = document.createElement('span');
    num.className = 'how-pillar-num';
    num.textContent = String(i + 1).padStart(2, '0');
    const titles = document.createElement('div');
    titles.className = 'how-pillar-titles';
    const en = document.createElement('h3');
    en.className = 'bilingual-en how-pillar-title-en';
    en.textContent = p.title_en || p.title_ko || '';
    titles.appendChild(en);
    if (p.title_ko && p.title_ko !== p.title_en) {
      const ko = document.createElement('p');
      ko.className = 'bilingual-ko how-pillar-title-ko';
      ko.setAttribute('lang', 'ko');
      ko.textContent = p.title_ko;
      titles.appendChild(ko);
    }
    head.append(num, titles);
    article.appendChild(head);

    const body = document.createElement('div');
    body.className = 'how-pillar-body';
    if (p.summary_en) {
      const e = document.createElement('p');
      e.className = 'how-pillar-summary-en';
      e.textContent = p.summary_en;
      body.appendChild(e);
    }
    if (p.summary_ko && p.summary_ko !== p.summary_en) {
      const k = document.createElement('p');
      k.className = 'bilingual-ko how-pillar-summary-ko';
      k.setAttribute('lang', 'ko');
      k.textContent = p.summary_ko;
      body.appendChild(k);
    }
    const tagsEn = Array.isArray(p.tags_en) ? p.tags_en : [];
    const tagsKo = Array.isArray(p.tags_ko) ? p.tags_ko : [];
    if (tagsEn.length || tagsKo.length) {
      const tagsBlock = document.createElement('div');
      tagsBlock.className = 'how-pillar-tags';
      tagsEn.forEach((t, idx) => {
        const span = document.createElement('span');
        span.className = 'how-pillar-tag';
        span.textContent = String(t);
        const ko = tagsKo[idx];
        if (ko && ko !== t) span.title = String(ko);
        tagsBlock.appendChild(span);
      });
      body.appendChild(tagsBlock);
    }
    article.appendChild(body);
    howPillarsEl.appendChild(article);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// EDUCATION & SPEAKING
// ──────────────────────────────────────────────────────────────────────────
function renderEducation(config) {
  if (!educationListEl || !config || !config.education) return;
  const items = Array.isArray(config.education.items) ? config.education.items : [];
  educationListEl.innerHTML = '';
  items.forEach((it) => {
    const li = document.createElement('li');
    li.className = 'education-item';

    const meta = document.createElement('div');
    meta.className = 'education-meta';
    if (it.year) {
      const y = document.createElement('span');
      y.className = 'education-year';
      y.textContent = it.year;
      meta.appendChild(y);
    }
    const aud = document.createElement('span');
    aud.className = 'education-audience';
    aud.textContent = it.audience_en || it.audience_ko || '';
    meta.appendChild(aud);
    if (it.audience_ko && it.audience_ko !== it.audience_en) {
      const audKo = document.createElement('span');
      audKo.className = 'bilingual-ko education-audience-ko';
      audKo.setAttribute('lang', 'ko');
      audKo.textContent = it.audience_ko;
      meta.appendChild(audKo);
    }
    li.appendChild(meta);

    const body = document.createElement('div');
    body.className = 'education-body';
    const t = document.createElement('h3');
    t.className = 'education-title bilingual-en';
    t.textContent = it.title_en || it.title_ko || '';
    body.appendChild(t);
    if (it.title_ko && it.title_ko !== it.title_en) {
      const tko = document.createElement('p');
      tko.className = 'bilingual-ko education-title-ko';
      tko.setAttribute('lang', 'ko');
      tko.textContent = it.title_ko;
      body.appendChild(tko);
    }
    if (it.summary_en) {
      const s = document.createElement('p');
      s.className = 'education-summary';
      s.textContent = it.summary_en;
      body.appendChild(s);
    }
    if (it.summary_ko && it.summary_ko !== it.summary_en) {
      const sko = document.createElement('p');
      sko.className = 'bilingual-ko education-summary-ko';
      sko.setAttribute('lang', 'ko');
      sko.textContent = it.summary_ko;
      body.appendChild(sko);
    }
    li.appendChild(body);
    educationListEl.appendChild(li);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Career — chronological company list.
// ──────────────────────────────────────────────────────────────────────────
function renderCareer(lang) {
  if (!careerListEl || !careerData) return;
  const items = Array.isArray(careerData.items) ? careerData.items : [];
  const highlightsLabel = ((siteConfig && siteConfig.career) || {});
  const hlLabel = pickLang(highlightsLabel, 'highlights_label', lang) || 'Highlights';
  const emptyTitle = pickLang(highlightsLabel, 'empty_title', lang) || 'Career records are being prepared.';
  careerListEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('article');
    empty.className = 'career-empty';
    const h3 = document.createElement('h3');
    h3.textContent = emptyTitle;
    empty.appendChild(h3);
    careerListEl.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'career-item';

    const head = document.createElement('div');
    head.className = 'career-item-head';
    const period = document.createElement('div');
    period.className = 'career-period';
    period.textContent = item.period || '';
    head.appendChild(period);

    const body = document.createElement('div');
    body.className = 'career-body';
    const company = document.createElement('h3');
    company.className = 'career-company';
    company.textContent = pickLang(item, 'company', lang) || '';
    const role = document.createElement('p');
    role.className = 'career-role';
    const roleVal = pickLang(item, 'role', lang);
    const loc = item.location ? `  ·  ${item.location}` : '';
    role.textContent = roleVal ? `${roleVal}${loc}` : item.location || '';
    body.append(company, role);

    const summary = pickLang(item, 'summary', lang);
    if (summary) {
      const p = document.createElement('p');
      p.className = 'career-summary';
      p.textContent = summary;
      body.appendChild(p);
    }

    const highlightsKey = `highlights_${lang}`;
    const highlights = Array.isArray(item[highlightsKey]) ? item[highlightsKey]
                     : Array.isArray(item[`highlights_${FALLBACK_LANG}`]) ? item[`highlights_${FALLBACK_LANG}`]
                     : [];
    if (highlights.length) {
      const wrap = document.createElement('div');
      wrap.className = 'career-highlights';
      const label = document.createElement('span');
      label.className = 'career-highlights-label';
      label.textContent = hlLabel;
      const ul = document.createElement('ul');
      highlights.forEach((h) => {
        const li = document.createElement('li');
        li.textContent = String(h);
        ul.appendChild(li);
      });
      wrap.append(label, ul);
      body.appendChild(wrap);
    }

    article.append(head, body);
    careerListEl.appendChild(article);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Portfolio — video / pm two-group card grid + modal detail.
// ──────────────────────────────────────────────────────────────────────────
function renderPortfolio(lang) {
  if (!portfolioGroupsEl) return;
  portfolioGroupsEl.innerHTML = '';
  const intro = (siteConfig && siteConfig.portfolio_intro) || {};

  if (!portfolioItems.length) {
    const article = document.createElement('article');
    article.className = 'empty-state';
    const h3 = document.createElement('h3');
    h3.textContent = pickLang(intro, 'empty_title', lang);
    const p = document.createElement('p');
    p.textContent = pickLang(intro, 'empty_hint', lang);
    article.append(h3, p);
    portfolioGroupsEl.appendChild(article);
    return;
  }

  const groupDefs = [
    { type: 'video', label: pickLang(intro, 'video_section', lang) || 'Video Projects' },
    { type: 'pm',    label: pickLang(intro, 'pm_section', lang)    || 'PM Projects' },
  ];

  groupDefs.forEach((def) => {
    const subset = portfolioItems.filter((it) => (it.type || 'video') === def.type);
    if (!subset.length) return;
    const group = document.createElement('div');
    group.className = 'portfolio-group';
    const head = document.createElement('div');
    head.className = 'portfolio-group-head';
    const title = document.createElement('h3');
    title.textContent = def.label;
    head.appendChild(title);
    group.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'portfolio-card-grid';
    subset.forEach((item) => grid.appendChild(buildPortfolioCard(item, lang, intro)));
    group.appendChild(grid);
    portfolioGroupsEl.appendChild(group);
  });
}

function buildPortfolioCard(item, lang, intro) {
  const content = item[lang] || item[FALLBACK_LANG] || item.en || item.ko || {};
  const videoId = getYouTubeId(item.youtubeUrl || '');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'portfolio-card';
  btn.dataset.itemId = item.id || '';
  btn.dataset.itemType = item.type || 'video';

  if (videoId) {
    const img = document.createElement('img');
    img.className = 'portfolio-card-thumb';
    img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    btn.appendChild(img);
  } else if (item.thumbnail) {
    const img = document.createElement('img');
    img.className = 'portfolio-card-thumb';
    img.src = item.thumbnail;
    img.alt = '';
    img.loading = 'lazy';
    btn.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'portfolio-card-thumb portfolio-card-thumb-empty';
    btn.appendChild(ph);
  }

  const body = document.createElement('div');
  body.className = 'portfolio-card-body';
  const typeBadge = document.createElement('span');
  typeBadge.className = 'portfolio-card-type';
  typeBadge.textContent = (item.type || 'video') === 'video' ? 'VIDEO' : 'PM';
  const h4 = document.createElement('h4');
  h4.className = 'portfolio-card-title';
  h4.textContent = content.title || '';
  const role = document.createElement('p');
  role.className = 'portfolio-card-role';
  role.textContent = content.role || '';
  body.append(typeBadge, h4, role);
  btn.appendChild(body);

  btn.addEventListener('click', () => openPortfolioModal(item, lang));
  return btn;
}

function escapeAttr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function openPortfolioModal(item, lang) {
  if (!portfolioModalEl) return;
  const intro = (siteConfig && siteConfig.portfolio_intro) || {};
  const content = item[lang] || item[FALLBACK_LANG] || item.en || item.ko || {};
  const videoId = getYouTubeId(item.youtubeUrl || '');
  const type = item.type || 'video';
  const detail = item[`detail_${lang}`] || item[`detail_${FALLBACK_LANG}`] || '';
  const roleLabel    = pickLang(intro, 'role_label', lang)     || 'Role';
  const overviewLbl  = pickLang(intro, 'overview_label', lang) || 'Overview';
  const watchLabel   = pickLang(intro, 'watch_label', lang)    || 'Watch the video';
  const detailLabel  = pickLang(intro, 'detail_label', lang)   || 'Project detail';
  const closeLabel   = pickLang(intro, 'close_label', lang)    || 'Close';

  // Media block — embedded iframe for video, image or detail-only block for PM.
  let mediaBlock = '';
  if (type === 'video' && videoId) {
    mediaBlock = `<div class="portfolio-modal-media"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="${escapeAttr(content.title || '')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  } else if (type === 'video' && item.thumbnail) {
    mediaBlock = `<div class="portfolio-modal-media"><img src="${escapeAttr(item.thumbnail)}" alt="" /></div>`;
  }

  // Detail block — PM projects always show the long form; video projects show
  // it only if filled in. Each render path escapes the content as text and
  // converts paragraph breaks (blank lines) into <p> wrappers.
  let detailBlock = '';
  if (detail) {
    const paragraphs = String(detail).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    detailBlock = `<div class="portfolio-modal-detail"><span class="portfolio-modal-label">${escapeAttr(detailLabel)}</span>${paragraphs.map((p) => `<p>${escapeAttr(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
  }

  portfolioModalEl.innerHTML = `
    <div class="portfolio-modal-backdrop" data-modal-close></div>
    <div class="portfolio-modal-card" role="document">
      <header class="portfolio-modal-head">
        <span class="portfolio-modal-type">${escapeAttr(type === 'video' ? 'VIDEO' : 'PM')}</span>
        <h2 class="portfolio-modal-title" id="portfolio-modal-title">${escapeAttr(content.title || '')}</h2>
        <button type="button" class="portfolio-modal-close" data-modal-close aria-label="${escapeAttr(closeLabel)}">×</button>
      </header>
      <div class="portfolio-modal-body">
        <div class="portfolio-modal-meta">
          <div class="portfolio-modal-meta-row"><span class="portfolio-modal-label">${escapeAttr(roleLabel)}</span><span>${escapeAttr(content.role || '')}</span></div>
          <div class="portfolio-modal-meta-row"><span class="portfolio-modal-label">${escapeAttr(overviewLbl)}</span><span>${escapeAttr(content.overview || '')}</span></div>
        </div>
        ${mediaBlock}
        ${detailBlock}
        ${item.youtubeUrl ? `<div class="portfolio-modal-actions"><a class="portfolio-modal-action" href="${escapeAttr(item.youtubeUrl)}" target="_blank" rel="noreferrer">${escapeAttr(watchLabel)} →</a></div>` : ''}
      </div>
    </div>`;

  portfolioModalEl.hidden = false;
  portfolioModalEl.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('portfolio-modal-open');

  portfolioModalEl.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', closePortfolioModal);
  });
  const onKey = (e) => {
    if (e.key === 'Escape') closePortfolioModal();
  };
  document.addEventListener('keydown', onKey);
  portfolioModalEl._cleanup = () => document.removeEventListener('keydown', onKey);
}

function closePortfolioModal() {
  if (!portfolioModalEl) return;
  portfolioModalEl.hidden = true;
  portfolioModalEl.setAttribute('aria-hidden', 'true');
  portfolioModalEl.innerHTML = '';
  document.documentElement.classList.remove('portfolio-modal-open');
  if (typeof portfolioModalEl._cleanup === 'function') {
    portfolioModalEl._cleanup();
    portfolioModalEl._cleanup = null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Cloudflare Web Analytics — injected when site-config carries a token.
// ──────────────────────────────────────────────────────────────────────────
function injectCfAnalytics(config) {
  if (!config || !config.analytics) return;
  const token = String(config.analytics.cf_token || '').trim();
  if (!token) return;
  if (document.querySelector('script[data-cf-beacon]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  document.head.appendChild(s);
}

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    const embedMatch = parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return embedMatch ? embedMatch[2] : '';
  } catch {
    return '';
  }
}

function applyEverything(lang) {
  document.documentElement.lang = 'en';
  if (!siteConfig) return;
  applyConfigToDom(siteConfig, 'en');
  renderNav(siteConfig, 'en');
  renderHeroMeta(siteConfig);                  // null-safe (element removed)
  renderWhoRoles(siteConfig);
  renderHowIWork(siteConfig);
  renderQuickFacts(siteConfig, 'en');
  renderProfile(siteConfig, 'en');              // null-safe
  renderWork(siteConfig, 'en');                 // null-safe (homepage no longer renders work)
  renderCareer('en');
  renderPrinciples(siteConfig, 'en');
  renderCountries(siteConfig);
  renderEducation(siteConfig);
  renderContact(siteConfig, 'en');
  renderFooter(siteConfig, 'en');
  renderPortfolio('en');
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyEverything(lang);
}

async function loadSiteConfig() {
  // Admin (manage.html) writes drafts here. If a draft exists we use it so the
  // editor can preview unsaved changes directly on the live homepage. Drafts
  // never leave the browser — they're flushed when the user exports/commits.
  try {
    const draft = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed && typeof parsed === 'object') {
        siteConfig = parsed;
        return;
      }
    }
  } catch (_) {}
  try {
    const response = await fetch('data/site-config.json', { cache: 'no-store' });
    siteConfig = response.ok ? await response.json() : null;
  } catch {
    siteConfig = null;
  }
}

async function loadPortfolio() {
  try {
    const response = await fetch('data/portfolio.json', { cache: 'no-store' });
    portfolioItems = response.ok ? await response.json() : [];
    if (!Array.isArray(portfolioItems)) portfolioItems = [];
  } catch {
    portfolioItems = [];
  }
}

async function loadCareer() {
  // Try admin draft (the document admin sets these keys); fall back to the
  // committed file. Either way, careerData ends up shaped like
  // { items: [...] } so renderCareer doesn't have to branch.
  try {
    const draft = localStorage.getItem('jimmypark-doc-draft-career');
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed && Array.isArray(parsed.items)) { careerData = parsed; return; }
    }
  } catch (_) {}
  try {
    const response = await fetch('data/career.json', { cache: 'no-store' });
    careerData = response.ok ? await response.json() : { items: [] };
  } catch {
    careerData = { items: [] };
  }
}

languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.langButton));
});

(async function init() {
  await Promise.all([loadSiteConfig(), loadPortfolio(), loadCareer()]);
  injectCfAnalytics(siteConfig);
  applyEverything(currentLanguage);
})();

// ──────────────────────────────────────────────────────────────────────────
// Floating Top button — visible after the user has scrolled past the hero.
// Smooth-scrolls back to #top on click.
// ──────────────────────────────────────────────────────────────────────────
(function setupFloatingTop() {
  const btn = document.getElementById('floating-top');
  if (!btn) return;
  const threshold = 600;
  let raf = null;
  function update() {
    raf = null;
    const visible = window.scrollY > threshold;
    btn.classList.toggle('is-visible', visible);
  }
  function onScroll() {
    if (raf == null) raf = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  btn.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
