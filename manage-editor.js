// jimmypark.net — Document admin (KMS / Wiki / Design Guide) + Tiptap editor.
//
// Three internal-only documentation collections live in data/kms.json /
// wiki.json / design.json. Each is `{ items: [{ id, title, body_html, … }] }`.
// This module owns the panels for those three, the list/search UI, and the
// embedded Tiptap editor with the full free extension set.
//
// Loaded as `<script type="module">` so ESM imports from esm.sh resolve. The
// rest of the admin (manage.js) is a classic script and reads the doc data
// through `window.JimmyDocs` so the GitHub-commit flow can include the three
// JSON files alongside site-config.json + portfolio.json.

import { Editor }       from 'https://esm.sh/@tiptap/core@2.5.9';
import StarterKit       from 'https://esm.sh/@tiptap/starter-kit@2.5.9';
import Link             from 'https://esm.sh/@tiptap/extension-link@2.5.9';
import Image            from 'https://esm.sh/@tiptap/extension-image@2.5.9';
import Highlight        from 'https://esm.sh/@tiptap/extension-highlight@2.5.9';
import Underline        from 'https://esm.sh/@tiptap/extension-underline@2.5.9';
import Subscript        from 'https://esm.sh/@tiptap/extension-subscript@2.5.9';
import Superscript      from 'https://esm.sh/@tiptap/extension-superscript@2.5.9';
import TextAlign        from 'https://esm.sh/@tiptap/extension-text-align@2.5.9';
import TaskList         from 'https://esm.sh/@tiptap/extension-task-list@2.5.9';
import TaskItem         from 'https://esm.sh/@tiptap/extension-task-item@2.5.9';
import Placeholder      from 'https://esm.sh/@tiptap/extension-placeholder@2.5.9';
import CharacterCount   from 'https://esm.sh/@tiptap/extension-character-count@2.5.9';
import Color            from 'https://esm.sh/@tiptap/extension-color@2.5.9';
import FontFamily       from 'https://esm.sh/@tiptap/extension-font-family@2.5.9';
import TextStyle        from 'https://esm.sh/@tiptap/extension-text-style@2.5.9';
import Typography       from 'https://esm.sh/@tiptap/extension-typography@2.5.9';
import Table            from 'https://esm.sh/@tiptap/extension-table@2.5.9';
import TableRow         from 'https://esm.sh/@tiptap/extension-table-row@2.5.9';
import TableCell        from 'https://esm.sh/@tiptap/extension-table-cell@2.5.9';
import TableHeader      from 'https://esm.sh/@tiptap/extension-table-header@2.5.9';
import Youtube          from 'https://esm.sh/@tiptap/extension-youtube@2.5.9';

const DRAFT_KEY_PREFIX = 'jimmypark-doc-draft-';
const SOURCES = ['kms', 'wiki', 'design'];

const docs = { kms: null, wiki: null, design: null };          // raw JSON objects
const editors = { kms: null, wiki: null, design: null };       // Tiptap Editor instances
const activeId = { kms: null, wiki: null, design: null };

function emptyShell(source) {
  return {
    $schema_version: 1,
    title_ko: source === 'kms' ? '기능 명세 (KMS)' : source === 'wiki' ? '운영자 위키' : '디자인 가이드',
    title_en: source === 'kms' ? 'Feature Specifications' : source === 'wiki' ? 'Operator Wiki' : 'Design Guide',
    categories: source === 'kms'
      ? ['Admin', 'Public', 'Data', 'Infrastructure']
      : source === 'wiki'
        ? ['Deploy', 'Auth', 'Memory', 'Policy', 'Lessons']
        : null,
    sections: source === 'design' ? ['Color', 'Typography', 'Spacing', 'Motion', 'Components', 'Tone'] : null,
    statuses: source === 'kms' ? ['draft', 'active', 'deprecated'] : null,
    items: [],
  };
}

async function loadDoc(source) {
  try {
    const draft = localStorage.getItem(DRAFT_KEY_PREFIX + source);
    if (draft) {
      const parsed = JSON.parse(draft);
      if (parsed && parsed.items) { docs[source] = parsed; return; }
    }
  } catch (_) {}
  try {
    const r = await fetch(`data/${source}.json`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      docs[source] = j && j.items ? j : emptyShell(source);
      return;
    }
  } catch (_) {}
  docs[source] = emptyShell(source);
}

function saveDraft(source) {
  try { localStorage.setItem(DRAFT_KEY_PREFIX + source, JSON.stringify(docs[source])); } catch (_) {}
  // Expose latest to manage.js so the GitHub-commit flow includes all four.
  if (window.JimmyDocs) window.JimmyDocs.update(source, docs[source]);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || `doc-${Date.now()}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ──────────────────────────────────────────────────────────────────────────
// List / filter
// ──────────────────────────────────────────────────────────────────────────
function renderList(source) {
  const panel = document.querySelector(`[data-panel="${source}"]`);
  if (!panel) return;
  const listEl = panel.querySelector('[data-doc-list]');
  const search = panel.querySelector('[data-doc-search]').value.trim().toLowerCase();
  const items = docs[source].items || [];
  const filtered = items.filter((it) => {
    if (!search) return true;
    const hay = [it.title, it.summary, it.category, it.section, (it.tags || []).join(' '), it.status]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.indexOf(search) >= 0;
  });

  listEl.innerHTML = '';
  if (!filtered.length) {
    const li = document.createElement('li');
    li.className = 'doc-list-empty';
    li.textContent = items.length ? '검색 결과 없음' : '아직 문서가 없습니다.';
    listEl.appendChild(li);
    return;
  }
  filtered.forEach((it) => {
    const li = document.createElement('li');
    li.className = 'doc-list-item';
    if (activeId[source] === it.id) li.classList.add('is-active');
    li.dataset.docId = it.id;
    const meta = source === 'kms' ? (it.category || '') + (it.status ? ` · ${it.status}` : '')
              : source === 'wiki' ? (it.category || '')
              : (it.section || '');
    li.innerHTML = `
      <span class="doc-list-title">${escapeHtml(it.title || '(제목 없음)')}</span>
      <span class="doc-list-meta">${escapeHtml(meta)}</span>`;
    li.addEventListener('click', () => openDoc(source, it.id));
    listEl.appendChild(li);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Tiptap editor
// ──────────────────────────────────────────────────────────────────────────
function buildToolbar(editor) {
  const toolbar = document.createElement('div');
  toolbar.className = 'doc-tt-toolbar';
  const groups = [
    [
      ['B',     '굵게',           () => editor.chain().focus().toggleBold().run(),         () => editor.isActive('bold')],
      ['I',     '기울임',         () => editor.chain().focus().toggleItalic().run(),       () => editor.isActive('italic')],
      ['U',     '밑줄',           () => editor.chain().focus().toggleUnderline().run(),    () => editor.isActive('underline')],
      ['S',     '취소선',         () => editor.chain().focus().toggleStrike().run(),       () => editor.isActive('strike')],
      ['Hl',    '형광',           () => editor.chain().focus().toggleHighlight().run(),    () => editor.isActive('highlight')],
      ['<>',    '인라인 코드',    () => editor.chain().focus().toggleCode().run(),         () => editor.isActive('code')],
    ],
    [
      ['H1',    '제목 1',         () => editor.chain().focus().toggleHeading({ level: 1 }).run(), () => editor.isActive('heading', { level: 1 })],
      ['H2',    '제목 2',         () => editor.chain().focus().toggleHeading({ level: 2 }).run(), () => editor.isActive('heading', { level: 2 })],
      ['H3',    '제목 3',         () => editor.chain().focus().toggleHeading({ level: 3 }).run(), () => editor.isActive('heading', { level: 3 })],
      ['¶',     '본문 단락',      () => editor.chain().focus().setParagraph().run(),       () => editor.isActive('paragraph')],
      ['""',    '인용',           () => editor.chain().focus().toggleBlockquote().run(),   () => editor.isActive('blockquote')],
      ['{ }',   '코드 블록',      () => editor.chain().focus().toggleCodeBlock().run(),    () => editor.isActive('codeBlock')],
      ['—',     '구분선',         () => editor.chain().focus().setHorizontalRule().run()],
    ],
    [
      ['• 목록',  '글머리 목록',   () => editor.chain().focus().toggleBulletList().run(),   () => editor.isActive('bulletList')],
      ['1. 목록', '번호 목록',     () => editor.chain().focus().toggleOrderedList().run(),  () => editor.isActive('orderedList')],
      ['☐',     '체크 목록',      () => editor.chain().focus().toggleTaskList().run(),     () => editor.isActive('taskList')],
    ],
    [
      ['좌',    '좌측 정렬',      () => editor.chain().focus().setTextAlign('left').run(),    () => editor.isActive({ textAlign: 'left' })],
      ['중',    '가운데 정렬',    () => editor.chain().focus().setTextAlign('center').run(),  () => editor.isActive({ textAlign: 'center' })],
      ['우',    '우측 정렬',      () => editor.chain().focus().setTextAlign('right').run(),   () => editor.isActive({ textAlign: 'right' })],
      ['양',    '양쪽 정렬',      () => editor.chain().focus().setTextAlign('justify').run(), () => editor.isActive({ textAlign: 'justify' })],
    ],
    [
      ['🔗',   '링크', () => {
        const previous = editor.getAttributes('link').href || '';
        const url = window.prompt('URL', previous);
        if (url === null) return;
        if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noreferrer noopener' }).run();
      }],
      ['🖼', '이미지 URL', () => {
        const url = window.prompt('이미지 URL');
        if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run();
      }],
      ['▶', 'YouTube 임베드', () => {
        const url = window.prompt('YouTube URL');
        if (url) editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
      }],
      ['⌗', '표 삽입', () => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }],
    ],
    [
      ['↶', '되돌리기', () => editor.chain().focus().undo().run()],
      ['↷', '다시',     () => editor.chain().focus().redo().run()],
      ['×', '서식 지우기', () => editor.chain().focus().unsetAllMarks().clearNodes().run()],
    ],
  ];

  const buttonRefs = [];
  groups.forEach((group, gi) => {
    if (gi > 0) {
      const sep = document.createElement('span');
      sep.className = 'doc-tt-sep';
      toolbar.appendChild(sep);
    }
    group.forEach(([label, title, run, isActive]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'doc-tt-btn';
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', (e) => { e.preventDefault(); run(); });
      toolbar.appendChild(b);
      buttonRefs.push({ button: b, isActive });
    });
  });

  function syncActive() {
    buttonRefs.forEach(({ button, isActive }) => {
      if (typeof isActive === 'function') button.classList.toggle('is-active', !!isActive());
    });
  }
  return { toolbar, syncActive };
}

function ensureEditor(source) {
  if (editors[source]) return editors[source];
  const panel = document.querySelector(`[data-panel="${source}"]`);
  const host = panel.querySelector('[data-doc-tiptap-host]');
  if (!host) return null;

  const editorEl = document.createElement('div');
  editorEl.className = 'doc-tt-surface';
  host.innerHTML = '';

  const editor = new Editor({
    element: editorEl,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' } }),
      Image.configure({ inline: false, allowBase64: false }),
      Highlight.configure({ multicolor: false }),
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: '문서 본문을 입력하세요…' }),
      CharacterCount,
      TextStyle,
      Color,
      FontFamily,
      Typography,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ controls: true, nocookie: true }),
    ],
    content: '<p></p>',
    onUpdate: ({ editor }) => {
      const id = activeId[source];
      if (!id) return;
      const item = (docs[source].items || []).find((x) => x.id === id);
      if (!item) return;
      item.body_html = editor.getHTML();
      item.last_updated = todayIso();
      saveDraft(source);
      const cc = panel.querySelector('[data-doc-charcount]');
      if (cc) cc.textContent = `${editor.storage.characterCount.characters()} chars`;
    },
  });

  const { toolbar, syncActive } = buildToolbar(editor);
  host.append(toolbar, editorEl);
  editor.on('selectionUpdate', syncActive);
  editor.on('transaction', syncActive);

  editors[source] = editor;
  return editor;
}

// ──────────────────────────────────────────────────────────────────────────
// Open / save / create / delete / duplicate
// ──────────────────────────────────────────────────────────────────────────
function openDoc(source, id) {
  const item = (docs[source].items || []).find((x) => x.id === id);
  if (!item) return;
  activeId[source] = id;
  const panel = document.querySelector(`[data-panel="${source}"]`);
  panel.querySelector('[data-doc-empty]').hidden = true;
  const form = panel.querySelector('[data-doc-form]');
  form.hidden = false;
  form.querySelector('[name="title"]').value = item.title || '';
  if (form.querySelector('[name="summary"]')) form.querySelector('[name="summary"]').value = item.summary || '';
  if (form.querySelector('[name="status"]'))  form.querySelector('[name="status"]').value  = item.status || 'draft';
  if (form.querySelector('[name="category"]'))form.querySelector('[name="category"]').value= item.category || '';
  if (form.querySelector('[name="section"]')) form.querySelector('[name="section"]').value = item.section || '';
  if (form.querySelector('[name="owner"]'))   form.querySelector('[name="owner"]').value   = item.owner || '';
  if (form.querySelector('[name="tags"]'))    form.querySelector('[name="tags"]').value    = (item.tags || []).join(', ');
  if (form.querySelector('[name="last_updated"]')) form.querySelector('[name="last_updated"]').value = item.last_updated || '';

  const editor = ensureEditor(source);
  editor.commands.setContent(item.body_html || '<p></p>', false);
  const cc = panel.querySelector('[data-doc-charcount]');
  if (cc) cc.textContent = `${editor.storage.characterCount.characters()} chars`;
  renderList(source);
}

function saveFromForm(source) {
  const id = activeId[source];
  if (!id) return;
  const item = (docs[source].items || []).find((x) => x.id === id);
  if (!item) return;
  const panel = document.querySelector(`[data-panel="${source}"]`);
  const form = panel.querySelector('[data-doc-form]');
  item.title       = form.querySelector('[name="title"]').value.trim();
  item.summary     = form.querySelector('[name="summary"]') ? form.querySelector('[name="summary"]').value.trim() : '';
  if (form.querySelector('[name="status"]'))   item.status   = form.querySelector('[name="status"]').value;
  if (form.querySelector('[name="category"]')) item.category = form.querySelector('[name="category"]').value;
  if (form.querySelector('[name="section"]'))  item.section  = form.querySelector('[name="section"]').value;
  if (form.querySelector('[name="owner"]'))    item.owner    = form.querySelector('[name="owner"]').value.trim();
  if (form.querySelector('[name="tags"]'))     item.tags     = form.querySelector('[name="tags"]').value.split(',').map((s) => s.trim()).filter(Boolean);
  if (form.querySelector('[name="last_updated"]')) item.last_updated = form.querySelector('[name="last_updated"]').value || todayIso();
  saveDraft(source);
  renderList(source);
  if (window.GW && typeof window.GW.showToast === 'function') window.GW.showToast(`${source} 문서 저장됨`, 'success');
}

function createDoc(source) {
  const newId = slugify(`new-${Date.now()}`);
  const stub = { id: newId, title: '새 문서', summary: '', last_updated: todayIso(), body_html: '<p></p>' };
  if (source === 'kms')    Object.assign(stub, { status: 'draft', category: (docs.kms.categories || [])[0] || '', owner: '' });
  if (source === 'wiki')   Object.assign(stub, { category: (docs.wiki.categories || [])[0] || '', tags: [] });
  if (source === 'design') Object.assign(stub, { section: (docs.design.sections || [])[0] || '' });
  docs[source].items = docs[source].items || [];
  docs[source].items.unshift(stub);
  saveDraft(source);
  openDoc(source, newId);
}

function deleteDoc(source) {
  const id = activeId[source];
  if (!id) return;
  if (!window.confirm('이 문서를 삭제할까요? 되돌릴 수 없습니다.')) return;
  docs[source].items = (docs[source].items || []).filter((x) => x.id !== id);
  activeId[source] = null;
  const panel = document.querySelector(`[data-panel="${source}"]`);
  panel.querySelector('[data-doc-form]').hidden = true;
  panel.querySelector('[data-doc-empty]').hidden = false;
  saveDraft(source);
  renderList(source);
}

function duplicateDoc(source) {
  const id = activeId[source];
  if (!id) return;
  const item = (docs[source].items || []).find((x) => x.id === id);
  if (!item) return;
  const copy = JSON.parse(JSON.stringify(item));
  copy.id = slugify(`${item.id}-copy-${Date.now()}`);
  copy.title = `${item.title} (사본)`;
  copy.last_updated = todayIso();
  docs[source].items.unshift(copy);
  saveDraft(source);
  openDoc(source, copy.id);
}

// ──────────────────────────────────────────────────────────────────────────
// Panel wiring (one set of listeners per source)
// ──────────────────────────────────────────────────────────────────────────
function fillSelects(source) {
  const panel = document.querySelector(`[data-panel="${source}"]`);
  if (!panel) return;
  const list = docs[source];
  panel.querySelectorAll('[data-doc-category]').forEach((sel) => {
    if (!Array.isArray(list.categories)) return;
    sel.innerHTML = list.categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  });
  panel.querySelectorAll('[data-doc-section]').forEach((sel) => {
    if (!Array.isArray(list.sections)) return;
    sel.innerHTML = list.sections.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  });
}

function wirePanel(source) {
  const panel = document.querySelector(`[data-panel="${source}"]`);
  if (!panel) return;
  panel.querySelector('[data-doc-search]').addEventListener('input', () => renderList(source));
  panel.querySelector('[data-doc-new]').addEventListener('click', () => createDoc(source));
  panel.querySelector('[data-doc-save]').addEventListener('click', () => saveFromForm(source));
  panel.querySelector('[data-doc-delete]').addEventListener('click', () => deleteDoc(source));
  panel.querySelector('[data-doc-duplicate]').addEventListener('click', () => duplicateDoc(source));
  // Form-level title changes update list label live without losing focus.
  panel.querySelector('[data-doc-form]').addEventListener('input', () => {
    const id = activeId[source];
    if (!id) return;
    const item = (docs[source].items || []).find((x) => x.id === id);
    if (!item) return;
    const titleInput = panel.querySelector('[name="title"]');
    if (titleInput) item.title = titleInput.value;
    saveDraft(source);
    renderList(source);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Public surface for manage.js (so GitHub commit picks up the three files)
// ──────────────────────────────────────────────────────────────────────────
window.JimmyDocs = window.JimmyDocs || {
  _cache: { kms: null, wiki: null, design: null },
  update(source, value) { this._cache[source] = value; },
  get(source) { return this._cache[source]; },
  // Returns array of { path, json } so manage.js commit loop can iterate.
  filesForCommit() {
    return SOURCES
      .filter((s) => this._cache[s])
      .map((s) => ({ path: `data/${s}.json`, json: this._cache[s] }));
  },
  resetDrafts() {
    SOURCES.forEach((s) => { try { localStorage.removeItem(DRAFT_KEY_PREFIX + s); } catch (_) {} });
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────────────────────
(async function init() {
  for (const source of SOURCES) {
    await loadDoc(source);
    window.JimmyDocs.update(source, docs[source]);
    fillSelects(source);
    wirePanel(source);
    renderList(source);
  }
})();
