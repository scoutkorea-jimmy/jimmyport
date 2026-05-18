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
let sourceConfigSnapshot = null;
let sourcePortfolioSnapshot = null;

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
  } catch (_) {}
  setDraftState('clean', '저장됨');
}

function tabsSwitch(targetTab) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === targetTab));
  panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === targetTab));
}
tabs.forEach((tab) => {
  tab.addEventListener('click', () => tabsSwitch(tab.dataset.tab));
});

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

function renderCountriesEditor() {
  const host = document.querySelector('#countries-list');
  if (!host) return;
  if (!siteConfig.global_experience) siteConfig.global_experience = { countries: [] };
  const rows = siteConfig.global_experience.countries || (siteConfig.global_experience.countries = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const visits = Math.max(1, parseInt(row.visits, 10) || 1);
    const div = document.createElement('div');
    div.className = 'manage-row';
    if (visits >= 2) div.setAttribute('data-multi', '1');
    div.innerHTML = `
      <div class="manage-row-grid country-row-grid">
        <label>국기<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="flag" value="${escapeHtml(row.flag || '')}" maxlength="8" /></label>
        <label>코드<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="code" value="${escapeHtml(row.code || '')}" maxlength="4" /></label>
        <label>국가명 (KR)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="ko" value="${escapeHtml(row.ko || '')}" /></label>
        <label>Country (EN)<input data-row="global_experience.countries" data-row-index="${idx}" data-row-key="en" value="${escapeHtml(row.en || '')}" /></label>
        <label>방문 횟수<input type="number" min="1" max="20" step="1" data-row="global_experience.countries" data-row-index="${idx}" data-row-key="visits" data-row-numeric="1" value="${visits}" /></label>
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
  const host = document.querySelector('#work-items-list');
  if (!host) return;
  if (!siteConfig.work) siteConfig.work = { items: [] };
  const rows = siteConfig.work.items || (siteConfig.work.items = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'manage-row manage-row-tall';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>라벨 (예: 01)<input data-row="work.items" data-row-index="${idx}" data-row-key="label" value="${escapeHtml(row.label || '')}" maxlength="6" /></label>
        <label>Title (KR)<input data-row="work.items" data-row-index="${idx}" data-row-key="title_ko" value="${escapeHtml(row.title_ko || '')}" /></label>
        <label>Title (EN)<input data-row="work.items" data-row-index="${idx}" data-row-key="title_en" value="${escapeHtml(row.title_en || '')}" /></label>
        <label class="span-3">본문 (KR)<textarea rows="2" data-row="work.items" data-row-index="${idx}" data-row-key="body_ko">${escapeHtml(row.body_ko || '')}</textarea></label>
        <label class="span-3">Body (EN)<textarea rows="2" data-row="work.items" data-row-index="${idx}" data-row-key="body_en">${escapeHtml(row.body_en || '')}</textarea></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="work.items" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="work.items" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="work.items" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

function renderInterestsEditor() {
  const host = document.querySelector('[data-panel="interests"] #interests-list');
  if (!host) return;
  if (!siteConfig.interests) siteConfig.interests = { items: [] };
  const rows = siteConfig.interests.items || (siteConfig.interests.items = []);
  host.innerHTML = '';
  rows.forEach((row, idx) => {
    const div = document.createElement('div');
    div.className = 'manage-row';
    div.innerHTML = `
      <div class="manage-row-grid">
        <label>관심사 (KR)<input data-row="interests.items" data-row-index="${idx}" data-row-key="ko" value="${escapeHtml(row.ko || '')}" /></label>
        <label>Interest (EN)<input data-row="interests.items" data-row-index="${idx}" data-row-key="en" value="${escapeHtml(row.en || '')}" /></label>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-row-action="move-up" data-row-target="interests.items" data-row-index="${idx}">↑</button>
        <button type="button" data-row-action="move-down" data-row-target="interests.items" data-row-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-row-action="delete" data-row-target="interests.items" data-row-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(div);
  });
}

document.addEventListener('input', (event) => {
  const target = event.target;
  if (!target || !target.matches('[data-row]')) return;
  const path = target.dataset.row;
  const idx = parseInt(target.dataset.rowIndex, 10);
  const key = target.dataset.rowKey;
  const list = deepGet(siteConfig, path);
  if (!Array.isArray(list)) return;
  if (!list[idx]) list[idx] = {};
  if (target.dataset.rowNumeric === '1') {
    const n = parseInt(target.value, 10);
    list[idx][key] = Number.isFinite(n) && n > 0 ? n : 1;
    // Re-render the row so its data-multi badge state flips immediately.
    if (path === 'global_experience.countries') renderCountriesEditor();
  } else {
    list[idx][key] = target.value;
  }
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
document.querySelector('#add-work-item')?.addEventListener('click', () => {
  if (!siteConfig.work) siteConfig.work = { items: [] };
  if (!siteConfig.work.items) siteConfig.work.items = [];
  const next = String(siteConfig.work.items.length + 1).padStart(2, '0');
  siteConfig.work.items.push({ label: next, title_ko: '', title_en: '', body_ko: '', body_en: '' });
  renderWorkEditor();
  saveDraft();
});
document.querySelector('#add-interest')?.addEventListener('click', () => {
  if (!siteConfig.interests) siteConfig.interests = { items: [] };
  if (!siteConfig.interests.items) siteConfig.interests.items = [];
  siteConfig.interests.items.push({ ko: '', en: '' });
  renderInterestsEditor();
  saveDraft();
});

function rerenderEditors() {
  renderQuickFactsEditor();
  renderCountriesEditor();
  renderWorkEditor();
  renderInterestsEditor();
  renderNavEditor();
  renderPortfolioPreview();
}

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
    const card = document.createElement('article');
    card.className = 'admin-card';
    card.innerHTML = `
      ${videoId ? `<img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="" />` : '<div class="admin-card-thumb-empty"></div>'}
      <div>
        <span>${String(idx + 1).padStart(2, '0')} · ${escapeHtml(item.published || '')}</span>
        <h3>${escapeHtml((item.ko && item.ko.title) || (item.en && item.en.title) || '')}</h3>
        <p>${escapeHtml((item.ko && item.ko.role) || (item.en && item.en.role) || '')}</p>
      </div>
      <div class="manage-row-actions">
        <button type="button" data-portfolio-action="up" data-portfolio-index="${idx}">↑</button>
        <button type="button" data-portfolio-action="down" data-portfolio-index="${idx}">↓</button>
        <button type="button" class="manage-row-delete" data-portfolio-action="delete" data-portfolio-index="${idx}">삭제</button>
      </div>`;
    host.appendChild(card);
  });
}

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
  const titleKo = (data.get('titleKo') || '').trim();
  if (!titleKo) return;
  portfolioItems.unshift({
    id: slugify(`${data.get('published') || new Date().getFullYear()}-${titleKo}`),
    youtubeUrl: (data.get('youtubeUrl') || '').trim(),
    published: (data.get('published') || '').trim() || String(new Date().getFullYear()),
    ko: {
      title: titleKo,
      role: (data.get('roleKo') || '').trim(),
      description: (data.get('descriptionKo') || '').trim(),
    },
    en: {
      title: (data.get('titleEn') || '').trim() || titleKo,
      role: (data.get('roleEn') || '').trim() || (data.get('roleKo') || '').trim(),
      description: (data.get('descriptionEn') || '').trim() || (data.get('descriptionKo') || '').trim(),
    },
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
    const siteJson = JSON.stringify(siteConfig, null, 2) + '\n';
    const portfolioJson = JSON.stringify(portfolioItems, null, 2) + '\n';

    appendLog('data/site-config.json 업로드 중…');
    await githubPutFile(repo, branch, 'data/site-config.json', siteJson, `${message} (site-config.json)`, pat);
    appendLog('data/site-config.json 커밋 완료', 'ok');

    appendLog('data/portfolio.json 업로드 중…');
    await githubPutFile(repo, branch, 'data/portfolio.json', portfolioJson, `${message} (portfolio.json)`, pat);
    appendLog('data/portfolio.json 커밋 완료', 'ok');

    appendLog('GitHub Pages가 약 1~2분 뒤 jimmypark.net에 반영합니다. (Site 버전 변동 없음 — 콘텐츠만 업데이트)', 'ok');
    // Successful commit = the on-disk state matches what we just wrote, so
    // clear the local draft to avoid drifting back to the stale draft on next
    // page load.
    sourceConfigSnapshot = JSON.parse(JSON.stringify(siteConfig));
    sourcePortfolioSnapshot = JSON.parse(JSON.stringify(portfolioItems));
    clearDraft();
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
  sourceConfigSnapshot = configFromNet;
  sourcePortfolioSnapshot = portfolioFromNet;
  siteConfig = JSON.parse(JSON.stringify(configFromNet));
  portfolioItems = JSON.parse(JSON.stringify(portfolioFromNet));
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
