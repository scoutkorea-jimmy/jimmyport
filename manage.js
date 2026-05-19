// jimmypark.net — unified admin (manage.html).
//
// Single source of truth: data/site-config.json + data/portfolio.json.
// This page edits both, keeps a localStorage draft so refreshes don't lose work,
// and offers three save paths:
//   (1) Auto draft  — saved every input change to localStorage.
//   (2) Download    — emits the two JSON files; user commits via terminal.
//   (3) GitHub PUT  — uses a PAT in sessionStorage to PUT both files directly.

const DRAFT_KEY = 'jimmypark-site-config-draft';
const PORTFOLIO_DRAFT_KEY = 'jimmypark-portfolio-draft';
const CAREER_DRAFT_KEY = 'jimmypark-career-draft';
const DEPLOY_PREFS_KEY = 'jimmypark-deploy-prefs';
const PAT_SESSION_KEY = 'jimmypark-github-pat';

const DEFAULT_REPO = 'scoutkorea-jimmy/jimmyport';
const DEFAULT_BRANCH = 'main';

const tabs = document.querySelectorAll('.manage-tab');
const panels = document.querySelectorAll('.manage-panel');
const draftPill = document.querySelector('#draft-pill');
const yearEl = document.querySelector('#year');
const githubLog = document.querySelector('#github-log');

let siteConfig = null;
let portfolioItems = [];
let careerData = null;
let sourceConfigSnapshot = null;
let sourcePortfolioSnapshot = null;
let sourceCareerSnapshot = null;

if (yearEl) yearEl.textContent = new Date().getFullYear();

function setDraftState(state, label) {
  if (!draftPill) return;
  draftPill.dataset.state = state;
  draftPill.textContent = label;
}

function deepGet(obj, path) {
  return path.split('.').reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
}

function deepSet(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(siteConfig));
    localStorage.setItem(PORTFOLIO_DRAFT_KEY, JSON.stringify(portfolioItems));
    if (careerData) localStorage.setItem(CAREER_DRAFT_KEY, JSON.stringify(careerData));
    setDraftState('dirty', '드래프트 저장됨 · 새 탭에서 홈을 열면 미리보기');
  } catch (err) {
    console.warn('draft save failed', err);
    setDraftState('error', '드래프트 저장 실패');
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(PORTFOLIO_DRAFT_KEY);
    localStorage.removeItem(CAREER_DRAFT_KEY);
  } catch (_) {}
  setDraftState('clean', '저장됨');
}

function tabsSwitch(targetTab, opts = {}) {
  const { updateHash = true, focusPanel = false } = opts;
  let matched = false;
  tabs.forEach((t) => {
    const isActive = t.dataset.tab === targetTab;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    t.tabIndex = isActive ? 0 : -1;
    if (isActive) matched = true;
  });
  panels.forEach((p) => {
    const isActive = p.dataset.panel === targetTab;
    p.classList.toggle('active', isActive);
    if (isActive) p.removeAttribute('hidden');
    else p.setAttribute('hidden', '');
  });
  if (!matched) return;
  if (updateHash && targetTab) {
    try {
      const url = new URL(window.location.href);
      if (url.hash.replace(/^#/, '') !== targetTab) {
        history.replaceState(null, '', `#${targetTab}`);
      }
    } catch (_) {}
  }
  // Close mobile drawer after selection
  const sidenav = document.getElementById('admin-sidenav');
  const toggle = document.getElementById('sidenav-toggle');
  if (sidenav && toggle && window.matchMedia('(max-width: 960px)').matches) {
    sidenav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  if (focusPanel) {
    const panel = document.getElementById(`panel-${targetTab}`);
    if (panel) panel.focus({ preventScroll: false });
  }
}

const tabsArray = Array.from(tabs);

function moveFocusBy(delta) {
  const visible = tabsArray.filter((t) => !t.classList.contains('is-filtered-out') && t.offsetParent !== null);
  if (!visible.length) return;
  const current = visible.findIndex((t) => t === document.activeElement);
  const nextIdx = ((current < 0 ? 0 : current + delta) + visible.length) % visible.length;
  const next = visible[nextIdx];
  next.focus();
}
function moveFocusEdge(edge) {
  const visible = tabsArray.filter((t) => !t.classList.contains('is-filtered-out') && t.offsetParent !== null);
  if (!visible.length) return;
  visible[edge === 'home' ? 0 : visible.length - 1].focus();
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => tabsSwitch(tab.dataset.tab));
  tab.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        moveFocusBy(1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        moveFocusBy(-1);
        break;
      case 'Home':
        e.preventDefault();
        moveFocusEdge('home');
        break;
      case 'End':
        e.preventDefault();
        moveFocusEdge('end');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        tabsSwitch(tab.dataset.tab, { focusPanel: true });
        break;
      default:
        break;
    }
  });
});

// Sidebar section filter — type to narrow the visible tab list
const sidenavFilter = document.getElementById('sidenav-filter');
if (sidenavFilter) {
  sidenavFilter.addEventListener('input', () => {
    const q = sidenavFilter.value.trim().toLowerCase();
    let visibleCount = 0;
    tabs.forEach((t) => {
      const label = (t.textContent || '').toLowerCase();
      const key = (t.dataset.tab || '').toLowerCase();
      const match = !q || label.includes(q) || key.includes(q);
      t.classList.toggle('is-filtered-out', !match);
      if (match) visibleCount += 1;
    });
    // Hide whole group if every child is filtered out
    document.querySelectorAll('.sidenav-group').forEach((group) => {
      const anyVisible = group.querySelectorAll('.manage-tab:not(.is-filtered-out)').length > 0;
      group.hidden = !anyVisible;
    });
  });
}

// Global "/" shortcut → focus sidebar search (unless already typing)
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (isTyping) return;
  if (!sidenavFilter) return;
  e.preventDefault();
  sidenavFilter.focus();
  sidenavFilter.select();
});

// Mobile drawer toggle
const sidenavToggle = document.getElementById('sidenav-toggle');
const adminSidenav = document.getElementById('admin-sidenav');
if (sidenavToggle && adminSidenav) {
  sidenavToggle.addEventListener('click', () => {
    const open = !adminSidenav.classList.contains('is-open');
    adminSidenav.classList.toggle('is-open', open);
    sidenavToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Initial tab from URL hash (e.g. manage.html#kms)
function applyHashTab() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  if (!hash) return;
  const target = tabsArray.find((t) => t.dataset.tab === hash);
  if (target) tabsSwitch(hash, { updateHash: false });
}
applyHashTab();
window.addEventListener('hashchange', applyHashTab);

// ──────────────────────────────────────────────────────────────────────────
// Form binding: <input data-bind="hero.title_ko"> ↔ siteConfig.hero.title_ko
// ──────────────────────────────────────────────────────────────────────────
function fillSimpleBindings() {
  document.querySelectorAll('[data-bind]').forEach((el) => {
    const path = el.dataset.bind;
    const value = deepGet(siteConfig, path);
    el.value = value == null ? '' : String(value);
  });
  document.querySelectorAll('[data-bind-list]').forEach((el) => {
    const path = el.dataset.bindList;
    const value = deepGet(siteConfig, path);
    el.value = Array.isArray(value) ? value.join(', ') : '';
  });
  document.querySelectorAll('[data-bind-paragraphs]').forEach((el) => {
    // Paragraph arrays serialise as `paragraph 1\n\nparagraph 2\n\n…` in the
    // textarea, so authors can use familiar blank-line separation.
    const path = el.dataset.bindParagraphs;
    const value = deepGet(siteConfig, path);
    el.value = Array.isArray(value) ? value.join('\n\n') : (value || '');
  });
  document.querySelectorAll('[data-bind-array-item]').forEach((el) => {
    // One input per slot in an array — used for hero.titles_ko[0..2].
    const path = el.dataset.bindArrayItem;
    const idx = parseInt(el.dataset.bindArrayIndex, 10) || 0;
    const value = deepGet(siteConfig, path);
    el.value = Array.isArray(value) && typeof value[idx] === 'string' ? value[idx] : '';
  });
  document.querySelectorAll('[data-bind-career]').forEach((el) => {
    if (!careerData) return;
    const key = el.dataset.bindCareer;
    el.value = careerData[key] || '';
  });
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target) return;
  if (target.matches('[data-bind]')) {
    deepSet(siteConfig, target.dataset.bind, target.value);
    saveDraft();
    return;
  }
  if (target.matches('[data-bind-list]')) {
    const list = target.value.split(',').map((s) => s.trim()).filter(Boolean);
    deepSet(siteConfig, target.dataset.bindList, list);
    saveDraft();
    return;
  }
  if (target.matches('[data-bind-paragraphs]')) {
    const paragraphs = target.value.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    deepSet(siteConfig, target.dataset.bindParagraphs, paragraphs);
    saveDraft();
    return;
  }
  if (target.matches('[data-bind-array-item]')) {
    const path = target.dataset.bindArrayItem;
    const idx  = parseInt(target.dataset.bindArrayIndex, 10) || 0;
    let arr = deepGet(siteConfig, path);
    if (!Array.isArray(arr)) { arr = []; deepSet(siteConfig, path, arr); }
    while (arr.length <= idx) arr.push('');
    arr[idx] = target.value;
    saveDraft();
    return;
  }
  if (target.matches('[data-bind-career]')) {
    if (!careerData) careerData = { items: [] };
    careerData[target.dataset.bindCareer] = target.value;
    saveDraft();
    return;
  }
  if (target.matches('[data-bind-deploy]')) {
    const prefs = readDeployPrefs();
    prefs[target.dataset.bindDeploy] = target.value;
    if (target.dataset.bindDeploy === 'pat') {
      try { sessionStorage.setItem(PAT_SESSION_KEY, target.value); } catch (_) {}
    } else {
      writeDeployPrefs(prefs);
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────
// Repeatable lists: quick_facts / countries / interests / work items
// ──────────────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderQuickFactsEditor() {
  const host = document.querySelector('#quickfacts-list');
  if (!host) return;
  const rows = siteConfig.quick_facts || (siteConfig.quick_facts = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'manage-row';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>Label (KR)<input data-row="quick_facts" data-row-index="${idx}" data-row-key="label_ko" value="${escapeHtml(row.label_ko || '')}" /></label>
        <label>Label (EN)<input data-row="quick_facts" data-row-index="${idx}" data-row-key="label_en" value="${escapeHtml(row.label_en || '')}" /></label>
        <label>Value (KR)<input data-row="quick_facts" data-row-index="${idx}" data-row-key="value_ko" value="${escapeHtml(row.value_ko || '')}" /></label>
        <label>Value (EN)<input data-row="quick_facts" data-row-index="${idx}" data-row-key="value_en" value="${escapeHtml(row.value_en || '')}" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="quick_facts" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="quick_facts" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="quick_facts" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function citiesAsText(cities) {
  if (Array.isArray(cities)) return cities.join(', ');
  if (typeof cities === 'string') return cities;
  return '';
}

function renderCountriesEditor() {
  const host = document.querySelector('#countries-list');
  if (!host) return;
  if (!siteConfig.global_experience) siteConfig.global_experience = { countries: [] };
  const rows = siteConfig.global_experience.countries || (siteConfig.global_experience.countries = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const visits = Math.max(1, parseInt(row.visits, 10) || 1);
    const isHome = !!row.is_home;
    const div = document.createElement('div');
    div.className = 'manage-row';
    if (visits >= 2) div.setAttribute('data-multi', '1');
    if (isHome) div.setAttribute('data-home', '1');
    div.innerHTML = `
      <div class="manage-row-grid country-row-grid">
        <label>국기<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="flag" value="${escapeHtml(row.flag || '')}" maxlength="8" /></label>
        <label>코드<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="code" value="${escapeHtml(row.code || '')}" maxlength="4" /></label>
        <label>국가명 (KR)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="ko" value="${escapeHtml(row.ko || '')}" /></label>
        <label>Country (EN)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="en" value="${escapeHtml(row.en || '')}" /></label>
        <label>방문 횟수<input type="number" min="1" max="20" step="1" data-row="global_experience.countries" data-row-index="${idx}" data-row-key="visits" data-row-numeric="1" value="${visits}" /></label>
      </div>
      <div class="country-row-grid-cities">
        <label class="country-row-home" title="홈(거주) 국가로 표시 — 카드가 풀폭으로 강조됩니다">
          <input type="checkbox" data-row="global_experience.countries" data-row-index="${idx}" data-row-key="is_home" data-row-bool="1" ${isHome ? 'checked' : ''} />
          홈
        </label>
        <label>방문 도시 (KR, 쉼표로 구분)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="cities_ko" data-row-list="1" value="${escapeHtml(citiesAsText(row.cities_ko))}" placeholder="서울, 부산, 제주" /></label>
        <label>Cities (EN, comma separated)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="cities_en" data-row-list="1" value="${escapeHtml(citiesAsText(row.cities_en))}" placeholder="Seoul, Busan, Jeju" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="global_experience.countries" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="global_experience.countries" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="global_experience.countries" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function renderNavEditor() {
  const host = document.querySelector('#nav-list');
  if (!host) return;
  if (!Array.isArray(siteConfig.nav)) siteConfig.nav = [];
  const rows = siteConfig.nav;
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'manage-row';
    div.innerHTML = `
      <div class="manage-row-grid country-row-grid">
        <label>키 (식별자)<input data-row="nav" data-row-index="${idx}" data-row-key="key" value="${escapeHtml(row.key || '')}" maxlength="20" /></label>
        <label>링크 (예: #profile)<input data-row="nav" data-row-index="${idx}" data-row-key="href" value="${escapeHtml(row.href || '')}" /></label>
        <label>라벨 (KR)<input data-row="nav" data-row-index="${idx}" data-row-key="ko" value="${escapeHtml(row.ko || '')}" /></label>
        <label>Label (EN)<input data-row="nav" data-row-index="${idx}" data-row-key="en" value="${escapeHtml(row.en || '')}" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="nav" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="nav" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="nav" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function renderWorkEditor() {
  const host = document.querySelector('#work-categories-list');
  if (!host) return;
  if (!siteConfig.work) siteConfig.work = { categories: [] };
  if (!Array.isArray(siteConfig.work.categories)) siteConfig.work.categories = [];
  const rows = siteConfig.work.categories;
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const itemsKo = Array.isArray(row.items_ko) ? row.items_ko.join(', ') : (row.items_ko || '');
    const itemsEn = Array.isArray(row.items_en) ? row.items_en.join(', ') : (row.items_en || '');
    const div = document.createElement('div');
    div.className = 'manage-row manage-row-tall';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>Category (KR)<input data-row="work.categories" data-row-index="${idx}" data-row-key="title_ko" value="${escapeHtml(row.title_ko || '')}" /></label>
        <label>Category (EN)<input data-row="work.categories" data-row-index="${idx}" data-row-key="title_en" value="${escapeHtml(row.title_en || '')}" /></label>
        <label class="span-3">설명 (KR)<textarea rows="2" data-row="work.categories" data-row-index="${idx}" data-row-key="description_ko">${escapeHtml(row.description_ko || '')}</textarea></label>
        <label class="span-3">Description (EN)<textarea rows="2" data-row="work.categories" data-row-index="${idx}" data-row-key="description_en">${escapeHtml(row.description_en || '')}</textarea></label>
        <label class="span-3">항목 (KR, 쉼표로 구분)<input data-row="work.categories" data-row-index="${idx}" data-row-key="items_ko" data-row-list="1" value="${escapeHtml(itemsKo)}" placeholder="Samsung Tech Conference, KAIST 스타트업 콘텐츠" /></label>
        <label class="span-3">Items (EN, comma separated)<input data-row="work.categories" data-row-index="${idx}" data-row-key="items_en" data-row-list="1" value="${escapeHtml(itemsEn)}" placeholder="Samsung Tech Conference, KAIST startup content" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="work.categories" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="work.categories" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="work.categories" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function renderInterestsEditor() {
  const host = document.querySelector('[data-panel="interests"] #interests-list');
  if (!host) return;
  // v2: data lives under `principles`. v1 legacy `interests` is auto-migrated
  // on first edit by lazily creating the new branch from the old.
  if (!siteConfig.principles) {
    siteConfig.principles = siteConfig.interests
      ? { title_ko: siteConfig.interests.title_ko || 'Principles',
          title_en: siteConfig.interests.title_en || 'Principles',
          items: Array.isArray(siteConfig.interests.items) ? siteConfig.interests.items : [] }
      : { title_ko: 'Principles', title_en: 'Principles', items: [] };
  }
  const rows = siteConfig.principles.items || (siteConfig.principles.items = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'manage-row';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>원칙 (KR)<input data-row="principles.items" data-row-index="${idx}" data-row-key="ko" value="${escapeHtml(row.ko || '')}" /></label>
        <label>Principle (EN)<input data-row="principles.items" data-row-index="${idx}" data-row-key="en" value="${escapeHtml(row.en || '')}" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="principles.items" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="principles.items" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="principles.items" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function commitRowFieldUpdate(target) {
  const path = target.dataset.row;
  const idx = parseInt(target.dataset.rowIndex, 10);
  const key = target.dataset.rowKey;
  const list = deepGet(siteConfig, path);
  if (!Array.isArray(list)) return false;
  if (!list[idx]) list[idx] = {};
  if (target.dataset.rowNumeric === '1') {
    const n = parseInt(target.value, 10);
    list[idx][key] = Number.isFinite(n) && n > 0 ? n : 1;
    return true;
  }
  if (target.dataset.rowBool === '1') {
    list[idx][key] = !!target.checked;
    return true;
  }
  if (target.dataset.rowList === '1') {
    list[idx][key] = target.value.split(',').map((s) => s.trim()).filter(Boolean);
    return false;
  }
  list[idx][key] = target.value;
  return false;
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target || !target.matches('[data-row]')) return;
  const shouldRerender = commitRowFieldUpdate(target);
  if (shouldRerender && target.dataset.row === 'global_experience.countries') {
    renderCountriesEditor();
  }
  saveDraft();
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (!target || !target.matches('[data-row][data-row-bool="1"]')) return;
  commitRowFieldUpdate(target);
  renderCountriesEditor();
  saveDraft();
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-row-action]');
  if (!btn) return;
  const action = btn.dataset.rowAction;
  const path = btn.dataset.rowTarget;
  const idx = parseInt(btn.dataset.rowIndex, 10);
  const list = deepGet(siteConfig, path);
  if (!Array.isArray(list)) return;
  if (action === 'delete') {
    list.splice(idx, 1);
  } else if (action === 'move-up' && idx > 0) {
    [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
  } else if (action === 'move-down' && idx < list.length - 1) {
    [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
  } else {
    return;
  }
  rerenderEditors();
  saveDraft();
});

document.querySelector('#add-quickfact')?.addEventListener('click', () => {
  if (!siteConfig.quick_facts) siteConfig.quick_facts = [];
  siteConfig.quick_facts.push({ label_ko: '', label_en: '', value_ko: '', value_en: '' });
  renderQuickFactsEditor();
  saveDraft();
});
document.querySelector('#add-country')?.addEventListener('click', () => {
  if (!siteConfig.global_experience) siteConfig.global_experience = { countries: [] };
  if (!siteConfig.global_experience.countries) siteConfig.global_experience.countries = [];
  siteConfig.global_experience.countries.push({ code: '', flag: '', ko: '', en: '' });
  renderCountriesEditor();
  saveDraft();
});
document.querySelector('#add-work-category')?.addEventListener('click', () => {
  if (!siteConfig.work) siteConfig.work = { categories: [] };
  if (!Array.isArray(siteConfig.work.categories)) siteConfig.work.categories = [];
  siteConfig.work.categories.push({
    title_ko: '', title_en: '',
    description_ko: '', description_en: '',
    items_ko: [], items_en: [],
  });
  renderWorkEditor();
  saveDraft();
});
document.querySelector('#add-interest')?.addEventListener('click', () => {
  if (!siteConfig.principles) siteConfig.principles = { items: [] };
  if (!Array.isArray(siteConfig.principles.items)) siteConfig.principles.items = [];
  siteConfig.principles.items.push({ ko: '', en: '' });
  renderInterestsEditor();
  saveDraft();
});

function rerenderEditors() {
  renderQuickFactsEditor();
  renderCountriesEditor();
  renderWorkEditor();
  renderInterestsEditor();
  renderNavEditor();
  renderCareerEditor();
  renderPortfolioPreview();
}

// ──────────────────────────────────────────────────────────────────────────
// Career editor — one row per company. Highlights are entered as a textarea
// with one bullet per line so authors don't have to think about JSON.
// ──────────────────────────────────────────────────────────────────────────
function renderCareerEditor() {
  const host = document.querySelector('#career-items-list');
  if (!host) return;
  if (!careerData) careerData = { items: [] };
  if (!Array.isArray(careerData.items)) careerData.items = [];
  const rows = careerData.items;
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const hlKo = Array.isArray(row.highlights_ko) ? row.highlights_ko.join('\n') : (row.highlights_ko || '');
    const hlEn = Array.isArray(row.highlights_en) ? row.highlights_en.join('\n') : (row.highlights_en || '');
    const div = document.createElement('div');
    div.className = 'manage-row manage-row-tall';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>회사 (KR)<input data-career-row data-career-idx="${idx}" data-career-key="company_ko" value="${escapeHtml(row.company_ko || '')}" /></label>
        <label>Company (EN)<input data-career-row data-career-idx="${idx}" data-career-key="company_en" value="${escapeHtml(row.company_en || '')}" /></label>
        <label>직책 (KR)<input data-career-row data-career-idx="${idx}" data-career-key="role_ko" value="${escapeHtml(row.role_ko || '')}" /></label>
        <label>Role (EN)<input data-career-row data-career-idx="${idx}" data-career-key="role_en" value="${escapeHtml(row.role_en || '')}" /></label>
        <label>기간<input data-career-row data-career-idx="${idx}" data-career-key="period" value="${escapeHtml(row.period || '')}" placeholder="2022-01 ~ Present" /></label>
        <label>위치<input data-career-row data-career-idx="${idx}" data-career-key="location" value="${escapeHtml(row.location || '')}" placeholder="Seoul, Korea" /></label>
        <label class="span-3">요약 (KR)<textarea rows="2" data-career-row data-career-idx="${idx}" data-career-key="summary_ko">${escapeHtml(row.summary_ko || '')}</textarea></label>
        <label class="span-3">Summary (EN)<textarea rows="2" data-career-row data-career-idx="${idx}" data-career-key="summary_en">${escapeHtml(row.summary_en || '')}</textarea></label>
        <label class="span-3">Highlights (KR · 한 줄 = 한 항목)<textarea rows="3" data-career-row data-career-idx="${idx}" data-career-key="highlights_ko" data-career-list="1">${escapeHtml(hlKo)}</textarea></label>
        <label class="span-3">Highlights (EN · one per line)<textarea rows="3" data-career-row data-career-idx="${idx}" data-career-key="highlights_en" data-career-list="1">${escapeHtml(hlEn)}</textarea></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-career-action="move-up" data-career-idx="${idx}">↑</button>
        <button type="button" data-career-action="move-down" data-career-idx="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-career-action="delete" data-career-idx="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target || !target.matches('[data-career-row]')) return;
  const idx = parseInt(target.dataset.careerIdx, 10);
  const key = target.dataset.careerKey;
  if (!careerData) careerData = { items: [] };
  if (!careerData.items[idx]) careerData.items[idx] = {};
  if (target.dataset.careerList === '1') {
    careerData.items[idx][key] = target.value.split('\n').map((s) => s.trim()).filter(Boolean);
  } else {
    careerData.items[idx][key] = target.value;
  }
  saveDraft();
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-career-action]');
  if (!btn) return;
  const action = btn.dataset.careerAction;
  const idx = parseInt(btn.dataset.careerIdx, 10);
  if (!careerData || !Array.isArray(careerData.items)) return;
  const list = careerData.items;
  if (action === 'delete') list.splice(idx, 1);
  else if (action === 'move-up' && idx > 0) [list[idx-1], list[idx]] = [list[idx], list[idx-1]];
  else if (action === 'move-down' && idx < list.length - 1) [list[idx+1], list[idx]] = [list[idx], list[idx+1]];
  else return;
  renderCareerEditor();
  saveDraft();
});

document.querySelector('#add-career-item')?.addEventListener('click', () => {
  if (!careerData) careerData = { items: [] };
  if (!Array.isArray(careerData.items)) careerData.items = [];
  careerData.items.unshift({
    id: `career-${Date.now()}`,
    company_ko: '', company_en: '',
    role_ko: '', role_en: '',
    period: '', location: '',
    summary_ko: '', summary_en: '',
    highlights_ko: [], highlights_en: [],
  });
  renderCareerEditor();
  saveDraft();
});

// ──────────────────────────────────────────────────────────────────────────
// Portfolio sub-form
// ──────────────────────────────────────────────────────────────────────────
function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
    if (parsed.searchParams.has('v')) return parsed.searchParams.get('v');
    const embedMatch = parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return embedMatch ? embedMatch[2] : '';
  } catch { return ''; }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64);
}

function renderPortfolioPreview() {
  const host = document.querySelector('#portfolio-preview');
  if (!host) return;
  host.innerHTML = '';
  if (!portfolioItems.length) {
    host.innerHTML = '<p class="manage-panel-hint">아직 등록된 항목이 없습니다.</p>';
    return;
  }
  portfolioItems.forEach((item, idx) => {
    const videoId = getYouTubeId(item.youtubeUrl);
    const type = item.type || 'video';
    const card = document.createElement('article');
    card.className = 'admin-card';
    const thumbHtml = videoId
      ? `<img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="" />`
      : (item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="" />` : '<div class="admin-card-thumb-empty"></div>');
    card.innerHTML = `
      ${thumbHtml}
      <div>
        <span>${String(idx + 1).padStart(2, '0')} · ${escapeHtml(type.toUpperCase())} · ${escapeHtml(item.published || '')}</span>
        <h3>${escapeHtml((item.ko && item.ko.title) || (item.en && item.en.title) || '')}</h3>
        <p>${escapeHtml((item.ko && item.ko.role) || (item.en && item.en.role) || '')}</p>
        <p style="color:var(--muted);font-size:0.82rem;font-weight:300;margin-top:4px;">${escapeHtml(((item.ko && item.ko.overview) || (item.en && item.en.overview) || '').slice(0, 140))}</p>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-portfolio-action="up" data-portfolio-index="${idx}">↑</button>
        <button type="button" data-portfolio-action="down" data-portfolio-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-portfolio-action="delete" data-portfolio-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(card);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Image upload via GitHub Contents API — base64 PUT to assets/.
// User picks a file in the Hero form; the file is uploaded to the configured
// repo's `assets/` folder and the bound config field is updated to the new
// path. Requires the PAT from the Deploy tab to be in sessionStorage.
// ──────────────────────────────────────────────────────────────────────────
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function safeFileName(name) {
  return String(name || 'file').toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/--+/g, '-')
    .slice(-80) || `upload-${Date.now()}`;
}

async function handleImageUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const host = input.closest('[data-file-upload-host]');
  const status = host ? host.querySelector('[data-file-status]') : null;
  const bindPath = input.dataset.fileUpload;
  let pat = '';
  try { pat = sessionStorage.getItem(PAT_SESSION_KEY) || ''; } catch (_) {}
  const prefs = readDeployPrefs();
  const repo = prefs.repo || DEFAULT_REPO;
  const branch = prefs.branch || DEFAULT_BRANCH;

  if (!pat) {
    if (status) { status.textContent = 'Deploy 탭에서 PAT 먼저 입력하세요.'; status.className = 'doc-file-status is-error'; }
    return;
  }

  const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const filename = `${ts}-${safeFileName(file.name)}`;
  const path = `assets/${filename}`;
  if (status) { status.textContent = `업로드 중… (${(file.size/1024).toFixed(0)} KB)`; status.className = 'doc-file-status'; }

  try {
    const b64 = await fileToBase64(file);
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `chore(assets): upload ${filename} via manage admin`, content: b64, branch }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    // Update bound config path so the homepage picks up the new image on next load.
    deepSet(siteConfig, bindPath, path);
    fillSimpleBindings();
    saveDraft();
    if (status) { status.textContent = `업로드 완료 → ${path}`; status.className = 'doc-file-status is-ok'; }
  } catch (err) {
    if (status) { status.textContent = `업로드 실패: ${err.message || err}`; status.className = 'doc-file-status is-error'; }
  } finally {
    input.value = '';
  }
}

document.addEventListener('change', (event) => {
  if (event.target && event.target.matches('[data-file-upload]')) handleImageUpload(event.target);
});

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-portfolio-action]');
  if (!btn) return;
  const action = btn.dataset.portfolioAction;
  const idx = parseInt(btn.dataset.portfolioIndex, 10);
  if (Number.isNaN(idx)) return;
  if (action === 'delete') portfolioItems.splice(idx, 1);
  else if (action === 'up' && idx > 0) [portfolioItems[idx - 1], portfolioItems[idx]] = [portfolioItems[idx], portfolioItems[idx - 1]];
  else if (action === 'down' && idx < portfolioItems.length - 1) [portfolioItems[idx + 1], portfolioItems[idx]] = [portfolioItems[idx], portfolioItems[idx + 1]];
  else return;
  renderPortfolioPreview();
  saveDraft();
});

document.querySelector('#portfolio-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const grab = (k) => (data.get(k) || '').trim();
  const titleKo = grab('titleKo');
  if (!titleKo) return;
  const koOrEn = (ko, en) => en || ko;
  portfolioItems.unshift({
    id: slugify(`${grab('published') || new Date().getFullYear()}-${titleKo}`),
    type: grab('type') || 'video',
    youtubeUrl: grab('youtubeUrl'),
    thumbnail: grab('thumbnail'),
    published: grab('published') || String(new Date().getFullYear()),
    ko: {
      title:    titleKo,
      role:     grab('roleKo'),
      overview: grab('overviewKo'),
    },
    en: {
      title:    koOrEn(titleKo,         grab('titleEn')),
      role:     koOrEn(grab('roleKo'),  grab('roleEn')),
      overview: koOrEn(grab('overviewKo'), grab('overviewEn')),
    },
    detail_ko: grab('detailKo'),
    detail_en: koOrEn(grab('detailKo'), grab('detailEn')),
  });
  form.reset();
  renderPortfolioPreview();
  saveDraft();
});

document.querySelector('#clear-portfolio')?.addEventListener('click', () => {
  if (!confirm('포트폴리오 항목을 전부 비울까요? 되돌릴 수 없습니다.')) return;
  portfolioItems = [];
  renderPortfolioPreview();
  saveDraft();
});

// ──────────────────────────────────────────────────────────────────────────
// Toolbar: reset / reload / downloads
// ──────────────────────────────────────────────────────────────────────────
function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.querySelector('#download-site-config')?.addEventListener('click', () => {
  downloadJson('site-config.json', siteConfig);
});
document.querySelector('#download-portfolio')?.addEventListener('click', () => {
  downloadJson('portfolio.json', portfolioItems);
});

document.querySelector('#reset-draft')?.addEventListener('click', async () => {
  if (!confirm('드래프트를 버리고 저장소의 마지막 커밋 상태로 되돌립니다. 진행할까요?')) return;
  clearDraft();
  siteConfig = JSON.parse(JSON.stringify(sourceConfigSnapshot));
  portfolioItems = JSON.parse(JSON.stringify(sourcePortfolioSnapshot));
  fillSimpleBindings();
  rerenderEditors();
  setDraftState('clean', '저장됨');
});

document.querySelector('#reload-from-source')?.addEventListener('click', async () => {
  await loadFromServer();
  fillSimpleBindings();
  rerenderEditors();
});

// ──────────────────────────────────────────────────────────────────────────
// Deploy: GitHub PUT both files via the Contents API
// ──────────────────────────────────────────────────────────────────────────
function readDeployPrefs() {
  try {
    const raw = localStorage.getItem(DEPLOY_PREFS_KEY);
    if (!raw) return defaultDeployPrefs();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultDeployPrefs(), parsed);
  } catch { return defaultDeployPrefs(); }
}
function writeDeployPrefs(prefs) {
  try { localStorage.setItem(DEPLOY_PREFS_KEY, JSON.stringify(prefs)); } catch (_) {}
}
function defaultDeployPrefs() {
  return { repo: DEFAULT_REPO, branch: DEFAULT_BRANCH, message: 'chore(content): update site-config via manage admin' };
}

function hydrateDeployForm() {
  const prefs = readDeployPrefs();
  document.querySelectorAll('[data-bind-deploy]').forEach((el) => {
    const key = el.dataset.bindDeploy;
    if (key === 'pat') {
      try { el.value = sessionStorage.getItem(PAT_SESSION_KEY) || ''; } catch (_) { el.value = ''; }
    } else {
      el.value = prefs[key] || '';
    }
  });
}

function appendLog(line, level) {
  if (!githubLog) return;
  const div = document.createElement('div');
  div.className = `log-${level || 'info'}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
  githubLog.appendChild(div);
  githubLog.scrollTop = githubLog.scrollHeight;
}

async function githubGetFileSha(repo, branch, path, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.sha;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function githubPutFile(repo, branch, path, contentString, message, token) {
  const sha = await githubGetFileSha(repo, branch, path, token);
  const body = {
    message,
    content: utf8ToBase64(contentString),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PUT ${path} failed: HTTP ${res.status} — ${err.slice(0, 200)}`);
  }
  return res.json();
}

document.querySelector('#github-commit-action')?.addEventListener('click', async () => {
  const prefs = readDeployPrefs();
  let pat = '';
  try { pat = sessionStorage.getItem(PAT_SESSION_KEY) || ''; } catch (_) {}
  const repo = (document.querySelector('[data-bind-deploy="repo"]').value || prefs.repo || DEFAULT_REPO).trim();
  const branch = (document.querySelector('[data-bind-deploy="branch"]').value || prefs.branch || DEFAULT_BRANCH).trim();
  const message = (document.querySelector('[data-bind-deploy="message"]').value || prefs.message).trim();
  if (!pat) { appendLog('PAT가 비어 있습니다. 위 토큰 입력란에 붙여넣으세요.', 'error'); return; }
  if (!repo.includes('/')) { appendLog('저장소 형식이 owner/repo 가 아닙니다.', 'error'); return; }

  appendLog(`커밋 시작: ${repo}@${branch}`);
  try {
    const toCommit = [
      { path: 'data/site-config.json', json: siteConfig },
      { path: 'data/portfolio.json',   json: portfolioItems },
    ];
    if (careerData) toCommit.push({ path: 'data/career.json', json: careerData });
    // Pick up KMS / Wiki / Design payloads from the document admin if present.
    if (window.JimmyDocs && typeof window.JimmyDocs.filesForCommit === 'function') {
      window.JimmyDocs.filesForCommit().forEach((f) => toCommit.push(f));
    }

    for (const file of toCommit) {
      appendLog(`${file.path} 업로드 중…`);
      const content = JSON.stringify(file.json, null, 2) + '\n';
      await githubPutFile(repo, branch, file.path, content, `${message} (${file.path.split('/').pop()})`, pat);
      appendLog(`${file.path} 커밋 완료`, 'ok');
    }

    appendLog('GitHub에 모든 파일 커밋 완료. Cloudflare Pages 자동 배포가 워크플로에 걸려 있으면 1~2분 안에 jimmypark.net에 반영됩니다.', 'ok');
    sourceConfigSnapshot = JSON.parse(JSON.stringify(siteConfig));
    sourcePortfolioSnapshot = JSON.parse(JSON.stringify(portfolioItems));
    clearDraft();
    if (window.JimmyDocs && typeof window.JimmyDocs.resetDrafts === 'function') {
      window.JimmyDocs.resetDrafts();
    }
  } catch (err) {
    appendLog(err.message || String(err), 'error');
  }
});

document.querySelector('#github-forget-pat')?.addEventListener('click', () => {
  try { sessionStorage.removeItem(PAT_SESSION_KEY); } catch (_) {}
  const input = document.querySelector('[data-bind-deploy="pat"]');
  if (input) input.value = '';
  appendLog('PAT를 이 세션에서 지웠습니다.', 'ok');
});

// ──────────────────────────────────────────────────────────────────────────
// Boot: load source → apply draft if any → render
// ──────────────────────────────────────────────────────────────────────────
async function loadFromServer() {
  let configFromNet = {};
  let portfolioFromNet = [];
  let careerFromNet = { items: [] };
  try {
    const resp = await fetch('data/site-config.json', { cache: 'no-store' });
    if (resp.ok) configFromNet = await resp.json();
  } catch (_) {}
  try {
    const resp = await fetch('data/portfolio.json', { cache: 'no-store' });
    if (resp.ok) {
      const j = await resp.json();
      if (Array.isArray(j)) portfolioFromNet = j;
    }
  } catch (_) {}
  try {
    const resp = await fetch('data/career.json', { cache: 'no-store' });
    if (resp.ok) {
      const j = await resp.json();
      if (j && Array.isArray(j.items)) careerFromNet = j;
    }
  } catch (_) {}
  sourceConfigSnapshot = configFromNet;
  sourcePortfolioSnapshot = portfolioFromNet;
  sourceCareerSnapshot = careerFromNet;
  siteConfig = JSON.parse(JSON.stringify(configFromNet));
  portfolioItems = JSON.parse(JSON.stringify(portfolioFromNet));
  careerData = JSON.parse(JSON.stringify(careerFromNet));
}

function applyDraftIfPresent() {
  try {
    const draftConfig = localStorage.getItem(DRAFT_KEY);
    if (draftConfig) {
      const parsed = JSON.parse(draftConfig);
      if (parsed && typeof parsed === 'object') {
        siteConfig = parsed;
        setDraftState('dirty', '드래프트 적용됨');
      }
    }
    const draftPortfolio = localStorage.getItem(PORTFOLIO_DRAFT_KEY);
    if (draftPortfolio) {
      const parsed = JSON.parse(draftPortfolio);
      if (Array.isArray(parsed)) portfolioItems = parsed;
    }
    const draftCareer = localStorage.getItem(CAREER_DRAFT_KEY);
    if (draftCareer) {
      const parsed = JSON.parse(draftCareer);
      if (parsed && Array.isArray(parsed.items)) careerData = parsed;
    }
  } catch (err) {
    console.warn('draft load failed', err);
  }
}

(async function init() {
  await loadFromServer();
  applyDraftIfPresent();
  fillSimpleBindings();
  rerenderEditors();
  hydrateDeployForm();
})();
