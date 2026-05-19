// jimmypark.net — homepage runtime.
//
// Loads data/site-config.json + data/portfolio.json and renders every section
// from a single source of truth so the admin (manage.html) can edit any text on
// the site without touching markup. The HTML keeps Korean fallback text so the
// page is still readable if JS or the JSON fetch fails.

const STORAGE_DRAFT_KEY = 'jimmypark-site-config-draft';
const LANG_KEY = 'jimmypark-language';
const FALLBACK_LANG = 'ko';

let siteConfig = null;
let portfolioItems = [];
let currentLanguage = localStorage.getItem(LANG_KEY) || FALLBACK_LANG;

const yearEl = document.querySelector('#year');
const navEl = document.querySelector('#primary-nav');
const heroMetaEl = document.querySelector('#hero-meta-tags');
const quickFactsEl = document.querySelector('#quick-facts');
const workListEl = document.querySelector('#work-list');
const profileBodyEl = document.querySelector('#profile-body');
const principlesListEl = document.querySelector('#principles-list');
const portfolioListEl = document.querySelector('#portfolio-list');
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

function applyConfigToDom(config, lang) {
  if (!config) return;
  // Plain text bindings: data-config="hero.title"
  document.querySelectorAll('[data-config]').forEach((el) => {
    const path = el.dataset.config;
    if (!path) return;
    const value = resolveLocalised(config, path, lang);
    if (typeof value === 'string' && value.length) el.textContent = value;
  });
  // Attribute bindings: data-config-attr="content:meta.description;alt:hero.image_alt"
  document.querySelectorAll('[data-config-attr]').forEach((el) => {
    const spec = el.dataset.configAttr;
    if (!spec) return;
    spec.split(';').forEach((entry) => {
      const [attr, path] = entry.split(':').map((s) => (s || '').trim());
      if (!attr || !path) return;
      const value = resolveLocalised(config, path, lang);
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

function renderQuickFacts(config, lang) {
  if (!quickFactsEl || !config || !Array.isArray(config.quick_facts)) return;
  quickFactsEl.innerHTML = '';
  config.quick_facts.forEach((row) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = pickLang(row, 'label', lang);
    const dd = document.createElement('dd');
    dd.textContent = pickLang(row, 'value', lang);
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

function renderPrinciples(config, lang) {
  if (!principlesListEl || !config) return;
  // Accept either `principles` (v2) or legacy `interests` block.
  const source = config.principles || config.interests || null;
  if (!source) return;
  const items = Array.isArray(source.items) ? source.items : [];
  principlesListEl.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item[lang] || item[FALLBACK_LANG] || '';
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

function renderCountries(config, lang) {
  if (!countryGridEl || !config || !config.global_experience) return;
  const ge = config.global_experience;
  const list = Array.isArray(ge.countries) ? ge.countries : [];
  const multiLabel = pickLang(ge, 'multi_visit_label', lang) || (lang === 'ko' ? '재방문' : 'Multi-visit');
  const homeLabel  = pickLang(ge, 'home_label', lang)        || (lang === 'ko' ? '홈' : 'Home');
  const cityPrefix = pickLang(ge, 'cities_prefix', lang)     || (lang === 'ko' ? '도시:' : 'Cities:');
  countryGridEl.innerHTML = '';

  list.forEach((country) => {
    const visits = Math.max(1, parseInt(country.visits, 10) || 1);
    const isHome = !!country.is_home;
    const cities = normaliseCities(country, lang);

    const li = document.createElement('li');
    li.className = 'country-chip';
    if (isHome) li.setAttribute('data-home', '1');
    if (visits >= 2) {
      li.setAttribute('data-multi', '1');
      li.setAttribute('title', `${multiLabel} · ${visits}${lang === 'ko' ? '회 이상' : '× or more'}`);
    }

    const head = document.createElement('div');
    head.className = 'country-chip-head';
    const flag = document.createElement('span');
    flag.className = 'country-flag';
    flag.setAttribute('aria-hidden', 'true');
    flag.textContent = country.flag || '';
    const name = document.createElement('span');
    name.className = 'country-name';
    name.textContent = country[lang] || country[FALLBACK_LANG] || country.code || '';
    head.append(flag, name);

    if (isHome) {
      const homeBadge = document.createElement('span');
      homeBadge.className = 'country-home-badge';
      homeBadge.textContent = homeLabel;
      head.appendChild(homeBadge);
    }
    if (visits >= 2) {
      const badge = document.createElement('span');
      badge.className = 'country-multi-badge';
      badge.setAttribute('aria-label', multiLabel);
      badge.textContent = visits > 2 ? `${visits}×` : '★';
      head.appendChild(badge);
    }
    li.appendChild(head);

    // Always render the cities slot for the home country so the 한국 card
    // never visually collapses even before city data is added — the layout
    // stays stable and signals "도시는 곧 추가됩니다".
    if (isHome || cities.length) {
      const citiesEl = document.createElement('div');
      citiesEl.className = 'country-cities';
      if (cities.length) {
        const prefix = document.createElement('span');
        prefix.className = 'country-cities-prefix';
        prefix.textContent = cityPrefix;
        const listEl = document.createElement('span');
        listEl.className = 'country-cities-list';
        listEl.textContent = cities.join(' · ');
        citiesEl.append(prefix, listEl);
      } else if (isHome) {
        const placeholder = document.createElement('span');
        placeholder.className = 'country-cities-placeholder';
        placeholder.textContent = lang === 'ko' ? '방문한 도시는 곧 추가됩니다' : 'Cities coming soon';
        citiesEl.appendChild(placeholder);
      }
      li.appendChild(citiesEl);
    }

    countryGridEl.appendChild(li);
  });

  const countEl = document.querySelector('#global-stat-countries');
  if (countEl) countEl.textContent = String(list.length || ge.stat_countries || 0);
  const multiCount = list.filter((c) => (parseInt(c.visits, 10) || 1) >= 2).length;
  const noteEl = document.querySelector('#global-stat-multi');
  if (noteEl) {
    if (multiCount > 0) {
      noteEl.hidden = false;
      noteEl.textContent = lang === 'ko'
        ? `· 재방문 ${multiCount}개국`
        : `· ${multiCount} repeat visits`;
    } else {
      noteEl.hidden = true;
      noteEl.textContent = '';
    }
  }
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

function appendCaseStudyField(parent, labelText, value) {
  if (!value) return;
  const wrap = document.createElement('div');
  wrap.className = 'case-study-field';
  const label = document.createElement('span');
  label.className = 'case-study-label';
  label.textContent = labelText;
  const body = document.createElement('p');
  body.className = 'case-study-text';
  body.textContent = value;
  wrap.append(label, body);
  parent.appendChild(wrap);
}

function renderPortfolio(lang) {
  if (!portfolioListEl) return;
  portfolioListEl.innerHTML = '';

  const intro = (siteConfig && siteConfig.portfolio_intro) || {};

  if (!portfolioItems.length) {
    const article = document.createElement('article');
    article.className = 'empty-state';
    const h3 = document.createElement('h3');
    h3.textContent = pickLang(intro, 'empty_title', lang);
    const p = document.createElement('p');
    p.textContent = pickLang(intro, 'empty_hint', lang);
    article.append(h3, p);
    portfolioListEl.appendChild(article);
    return;
  }

  const roleLabel      = pickLang(intro, 'role_label', lang)      || 'Role';
  const contextLabel   = pickLang(intro, 'context_label', lang)   || 'Context';
  const challengeLabel = pickLang(intro, 'challenge_label', lang) || 'Challenge';
  const approachLabel  = pickLang(intro, 'approach_label', lang)  || 'Approach';
  const outcomeLabel   = pickLang(intro, 'outcome_label', lang)   || 'Outcome';
  const watchLabel     = pickLang(intro, 'watch_label', lang)     || 'Watch the media';

  portfolioItems.forEach((item, index) => {
    const content = item[lang] || item[FALLBACK_LANG] || item.en || item.ko || {};
    const videoId = getYouTubeId(item.youtubeUrl || '');
    const article = document.createElement('article');
    article.className = 'case-study-item';

    // Media — kept for video projects but no longer the centre of the card.
    if (videoId) {
      const media = document.createElement('a');
      media.className = 'case-study-media';
      media.href = item.youtubeUrl || '#';
      media.target = '_blank';
      media.rel = 'noreferrer';
      const image = document.createElement('img');
      image.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      image.alt = '';
      image.loading = 'lazy';
      const play = document.createElement('span');
      play.className = 'play-mark';
      play.textContent = 'Play';
      media.append(image, play);
      article.appendChild(media);
    }

    const body = document.createElement('div');
    body.className = 'case-study-body';

    const head = document.createElement('div');
    head.className = 'case-study-head';
    const number = document.createElement('div');
    number.className = 'case-study-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('h3');
    title.className = 'case-study-title';
    title.textContent = content.title || '';
    head.append(number, title);
    body.appendChild(head);

    if (content.role) {
      const roleRow = document.createElement('p');
      roleRow.className = 'case-study-role';
      const tag = document.createElement('span');
      tag.className = 'case-study-role-tag';
      tag.textContent = roleLabel;
      const val = document.createElement('span');
      val.textContent = content.role;
      roleRow.append(tag, val);
      body.appendChild(roleRow);
    }

    // Case-study structure — only render fields the operator filled in. The
    // legacy `description` field migrates into Outcome if outcome is empty,
    // so older items keep showing meaningful copy.
    const fields = document.createElement('div');
    fields.className = 'case-study-fields';
    appendCaseStudyField(fields, contextLabel,   content.context);
    appendCaseStudyField(fields, challengeLabel, content.challenge);
    appendCaseStudyField(fields, approachLabel,  content.approach);
    appendCaseStudyField(
      fields, outcomeLabel,
      content.outcome || (!content.context && !content.challenge && !content.approach ? content.description : '')
    );
    if (fields.children.length) body.appendChild(fields);

    if (item.youtubeUrl || item.published) {
      const meta = document.createElement('div');
      meta.className = 'case-study-meta';
      const published = document.createElement('span');
      published.textContent = item.published || '';
      meta.appendChild(published);
      if (item.youtubeUrl) {
        const link = document.createElement('a');
        link.href = item.youtubeUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = watchLabel;
        meta.appendChild(link);
      }
      body.appendChild(meta);
    }

    article.appendChild(body);
    portfolioListEl.appendChild(article);
  });
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
  document.documentElement.lang = lang;
  if (!siteConfig) return;
  applyConfigToDom(siteConfig, lang);
  renderNav(siteConfig, lang);
  renderHeroMeta(siteConfig);
  renderQuickFacts(siteConfig, lang);
  renderProfile(siteConfig, lang);
  renderWork(siteConfig, lang);
  renderPrinciples(siteConfig, lang);
  renderCountries(siteConfig, lang);
  renderContact(siteConfig, lang);
  renderFooter(siteConfig, lang);
  renderPortfolio(lang);
  languageButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.langButton === lang);
  });
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

languageButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.langButton));
});

(async function init() {
  await Promise.all([loadSiteConfig(), loadPortfolio()]);
  applyEverything(currentLanguage);
})();
