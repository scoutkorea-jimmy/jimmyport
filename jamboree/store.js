/* 한국잼버리 카드뉴스 — Phase 2 편집 스토어 (plain JS, shapes.js 다음 로드)
 * - 텍스트 오버라이드: cc-edit:<ekey>            (Editable 인라인/폼 공용)
 * - 구조 오버라이드:   cc-prop:<scope> = JSON     (배경색·카테고리색·D숫자 등)
 * - 업로드 이미지:     cc-img:<slot>  = dataURL    (플레이스홀더/엠블럼 교체)
 * 변경 시 emit() → 구독 컴포넌트 리렌더. KV 저장/불러오기용 collect/hydrate 제공.
 */
(function () {
  const TEXT = 'cc-edit:';
  const PROP = 'cc-prop:';
  const IMG = 'cc-img:';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (_) {} }

  // 이미지는 용량이 커 localStorage 쿼터를 넘길 수 있어 메모리 캐시를 1차 소스로 둔다.
  const imgMem = {};

  const subs = new Set();

  const store = {
    /* ── 텍스트 ── */
    getText(ekey) { return lsGet(TEXT + ekey); },
    setText(ekey, v) {
      if (v == null || v === '') lsDel(TEXT + ekey); else lsSet(TEXT + ekey, v);
      store.emit();
    },

    /* ── 구조 오버라이드 ── */
    getProps(scope) { try { return JSON.parse(lsGet(PROP + scope) || '{}'); } catch (_) { return {}; } },
    getProp(scope, k, fb) { const p = store.getProps(scope); return p[k] != null ? p[k] : fb; },
    setProp(scope, k, v) {
      const p = store.getProps(scope);
      if (v == null || v === '') delete p[k]; else p[k] = v;
      if (Object.keys(p).length) lsSet(PROP + scope, JSON.stringify(p)); else lsDel(PROP + scope);
      store.emit();
    },

    /* ── 이미지 ── */
    getImage(slot) {
      if (Object.prototype.hasOwnProperty.call(imgMem, slot)) return imgMem[slot];
      const v = lsGet(IMG + slot);
      if (v != null) imgMem[slot] = v;
      return v;
    },
    setImage(slot, dataUrl) {
      if (dataUrl == null) { delete imgMem[slot]; lsDel(IMG + slot); }
      else { imgMem[slot] = dataUrl; lsSet(IMG + slot, dataUrl); } // 쿼터 초과 시 메모리만 유지
      store.emit();
    },

    /* ── 직렬화(KV) ── */
    collect() {
      const text = {}, props = {}, images = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.indexOf(TEXT) === 0) text[k.slice(TEXT.length)] = localStorage.getItem(k);
          else if (k.indexOf(PROP) === 0) props[k.slice(PROP.length)] = localStorage.getItem(k);
        }
      } catch (_) {}
      Object.keys(imgMem).forEach((s) => { if (imgMem[s] != null) images[s] = imgMem[s]; });
      return { text, props, images };
    },
    hydrate(state) {
      if (!state) return;
      const t = state.text || state.editKeys; // Phase 1 저장본(editKeys) 호환
      if (t) Object.entries(t).forEach(([k, v]) => lsSet(TEXT + k, v));
      if (state.props) Object.entries(state.props).forEach(([k, v]) => lsSet(PROP + k, typeof v === 'string' ? v : JSON.stringify(v)));
      if (state.images) Object.entries(state.images).forEach(([s, v]) => { imgMem[s] = v; lsSet(IMG + s, v); });
      store.emit();
    },

    /* ── 구독 ── */
    sub(fn) { subs.add(fn); return () => subs.delete(fn); },
    emit() { subs.forEach((fn) => { try { fn(); } catch (_) {} }); },

    /* ── 색 대비 헬퍼: 배경색에 맞는 본문 잉크(흰/미드나잇) ── */
    idealInk(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
      if (!m) return '#fff';
      const n = parseInt(m[1], 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return lum > 0.62 ? '#4D006E' : '#fff';
    },
  };

  window.CCStore = store;
})();
