/* 콘텐츠 템플릿 · 베리에이션 — 텍스트형 3 + 이미지/그래픽형 9 · Safe Zone 10%(100px) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
const P = PAL;
const M = window.MOTIF;   // 캠핑/자연물 형상화 모티프
const S = 100;            // 상하좌우 Safe Zone (1080 * 약 9.3%)

function THead({ ek, kicker, title, cat, kc = PAL.ocean }) {
  return (
    <React.Fragment>
      {cat && <CategoryChip ek={ek + '-cat'} label={cat.label} color={cat.color} top={S} right={S} />}
      <div style={{ position: 'absolute', top: S, left: S, right: S }}>
        <Kicker ek={ek + '-kicker'} c={kc}>{kicker}</Kicker>
        <Editable ekey={ek + '-title'} tag="div" className="hi" style={{ marginTop: 12, fontWeight: 700, fontSize: 82, color: INK }}>{title}</Editable>
      </div>
    </React.Fragment>
  );
}

/* ───────── 텍스트형 (3) ───────── */

/* 01 소개형 */
function T_Intro({ ek }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <SceneScatter scope="scene-tpl-intro" cx={862} by={1066} s={0.82} cols={[P.forest, P.orange, P.river, P.leaf]} fallback={window.scene(
        M.tree(800, 1030, 0.8, P.forest), M.tent(925, 1030, 0.68, P.orange, P.midnight),
        M.hills(890, 1074, 0.66, [P.leaf, P.river])
      )} />
      <THead ek={ek} kicker="TEXT · 소개형" title="영내에서는" cat={{ label: '영내활동', color: P.forest }} />
      <Editable ekey={ek + '-body'} tag="div" style={{ position: 'absolute', left: S, right: S, top: 304, fontSize: 40, fontWeight: 300, lineHeight: 1.66, color: INK, paddingLeft: 28, borderLeft: `8px solid ${P.forest}` }}>텐트를 치고, 밥을 짓고, 세계 친구들과 어울리는 곳. 영내에서는 캠프 생활의 모든 순간이 하나의 프로그램이 됩니다. 자고 먹고 노는 일상이 곧 모험이고, 20개국에서 모인 또래와 매일 밤 새로운 추억이 쌓여요.</Editable>
      <div style={{ position: 'absolute', left: S, right: S, bottom: S, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {['과정활동', '전시·공연', '국제교류', '반집회'].map((p, i) => <span key={i} className="hi" style={{ background: '#f3eef7', color: INK, borderRadius: 999, padding: '12px 24px', fontSize: 28, fontWeight: 500 }}>{p}</span>)}
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 02 FAQ형 */
function T_FAQ({ ek }) {
  const qa = [
    { q: '누가 참가하나요?', a: '20개국 약 3,000명의 청소년·지도자' },
    { q: '언제 · 어디서 열리나요?', a: '2026. 8. 5–8. 9 · 강원 세계잼버리수련장' },
    { q: '무엇을 하나요?', a: '과정활동 · K-POP 콘서트 · 전시 · 체험' }
  ];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="TEXT · FAQ형" title="자주 묻는 질문" cat={{ label: '안내', color: P.ocean }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 320, bottom: S, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {qa.map((x, i) => (
          <div key={i} style={{ borderBottom: '1px solid #62259914', paddingBottom: 26 }}>
            <Editable ekey={ek + '-q' + i} tag="div" className="hi" style={{ fontSize: 42, fontWeight: 700, color: INK }}>{x.q}</Editable>
            <Editable ekey={ek + '-a' + i} tag="div" style={{ fontSize: 31, fontWeight: 300, color: DMUTE, marginTop: 8 }}>{'A. ' + x.a}</Editable>
          </div>
        ))}
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 03 인용/한마디형 */
function T_Quote({ ek }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <SceneScatter scope="scene-tpl-quote" cx={880} by={1248} s={0.78} cols={[P.forest, P.orange, P.river, P.leaf]} fallback={window.scene(
        M.tree(815, 1212, 0.85, P.forest), M.tent(945, 1212, 0.72, P.orange, P.midnight),
        M.hills(900, 1258, 0.7, [P.leaf, P.river])
      )} />
      <THead ek={ek} kicker="TEXT · 인용/한마디형" title="비전" cat={{ label: '비전', color: P.purple }} />
      <div className="hi" style={{ position: 'absolute', left: S - 4, top: 320, fontSize: 190, lineHeight: .5, color: P.red, fontWeight: 700 }}>“</div>
      <Editable ekey={ek + '-q'} tag="div" style={{ position: 'absolute', left: S, right: S, top: 416, fontSize: 54, fontWeight: 300, lineHeight: 1.44, color: INK }}>청소년이 세계평화와 지구환경의 공존가치를 나누고, 지속가능한 미래를 실천하는 세계시민으로 성장합니다.</Editable>
      <Editable ekey={ek + '-by'} tag="div" style={{ position: 'absolute', left: S, bottom: S, fontSize: 30, fontWeight: 300, color: P.ocean }}>— 제16회 한국잼버리 비전</Editable>
      <AutoFooter />
    </Card>
  );
}

/* ───────── 이미지/그래픽형 (9) ───────── */

/* 04 풀이미지형 */
function T_FullImage({ ek }) {
  return (
    <Card bg={PAL.midnight} color="#fff" pad={0}>
      <Placeholder tone="dark" label="대표 이미지 (전체 배경)" slot={ek + '-img'} slotLabel="배경 이미지" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,0,30,.15) 35%, rgba(20,0,30,.82))', pointerEvents: 'none' }} />
      <CategoryChip ek={ek + '-cat'} label="메인" color={P.purple} top={S} right={S} />
      <div style={{ position: 'absolute', left: S, right: S, bottom: S }}>
        <Kicker ek={ek + '-kicker'} c={P.river}>IMAGE · 풀이미지형</Kicker>
        <Editable ekey={ek + '-t'} tag="div" className="hi" style={{ marginTop: 12, fontWeight: 700, fontSize: 106, lineHeight: 1.0, color: '#fff' }}>강원의 여름,<br /><span style={{ color: P.leaf }}>지금 시작</span></Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 05 이미지 + 캡션형 */
function T_ImageCaption({ ek }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <Placeholder tone="light" label="이미지" slot={ek + '-img'} slotLabel="이미지" radius={26} style={{ position: 'absolute', top: S, left: S, right: S, height: 556 }} />
      <CategoryChip ek={ek + '-cat'} label="영외활동" color={P.ocean} top={S + 22} right={S + 22} />
      <Editable ekey={ek + '-cap'} tag="div" className="hi" style={{ position: 'absolute', left: S, right: S, top: 712, fontSize: 62, fontWeight: 700, color: INK, lineHeight: 1.14 }}>강원의 명소를 발로 누비는 영외활동</Editable>
      <Editable ekey={ek + '-sub'} tag="div" style={{ position: 'absolute', left: S, bottom: S, fontSize: 30, fontWeight: 300, color: DMUTE }}>OUT-CAMP · 지역 탐방</Editable>
      <AutoFooter />
    </Card>
  );
}

/* 06 좌우 분할(이미지 우세)형 */
function T_SplitImage({ ek }) {
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <Placeholder tone="light" label="이미지" slot={ek + '-img'} slotLabel="이미지" radius={26} style={{ position: 'absolute', top: S, bottom: S, left: S, width: 520 }} />
      <CategoryChip ek={ek + '-cat'} label="식사" color={P.orange} top={S} right={S} />
      <div style={{ position: 'absolute', left: 668, right: S, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Kicker ek={ek + '-kicker'} c={P.red}>MEALS</Kicker>
        <Editable ekey={ek + '-t'} tag="div" className="hi" style={{ marginTop: 12, fontWeight: 700, fontSize: 76, color: INK, lineHeight: 1.04 }}>잼버리<br />밥상</Editable>
        <Editable ekey={ek + '-b'} tag="div" style={{ marginTop: 20, fontSize: 33, fontWeight: 300, lineHeight: 1.55, color: INK }}>하루 세 끼, 든든하게. 안전하고 다양한 식단.</Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 07 갤러리형 (3×2 이미지) */
function T_Gallery({ ek }) {
  const labels = ['사진 1', '사진 2', '사진 3', '사진 4', '사진 5', '사진 6'];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="IMAGE · 갤러리형" title="현장 스케치" cat={{ label: '현장', color: P.ocean }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 300, bottom: S, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 20 }}>
        {labels.map((l, i) => <Placeholder key={i} tone="light" label={l} slot={ek + '-img' + i} slotLabel={l} radius={16} />)}
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 08 빅넘버 + 이미지형 */
function T_BigNumImage({ ek }) {
  return (
    <Card bg={PAL.red} color="#fff" pad={0}>
      <Placeholder tone="dark" label="배경 이미지" slot={ek + '-img'} slotLabel="배경 이미지" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0, opacity: .5 }} />
      <div style={{ position: 'absolute', inset: 0, background: P.red, opacity: .72, pointerEvents: 'none' }} />
      <SceneScatter scope="scene-tpl-bignum" cx={905} by={1150} s={1.1} cols={[P.leaf, P.orange, P.pink, P.river]} fallback={window.scene(
        M.sun(960, 320, 1.0, P.leaf), M.cloud(800, 330, 0.75, P.pink),
        M.tree(850, 880, 1.35, P.leaf), M.tent(995, 880, 1.1, P.orange, P.midnight),
        M.campfire(905, 1080, 1.15, [P.orange, P.pink, P.leaf]), M.hills(905, 1190, 0.95, [P.leaf, P.river])
      )} />
      <CategoryChip ek={ek + '-cat'} label="규모" color={'#fff'} top={S} right={S} />
      <div style={{ position: 'absolute', left: S, right: S, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Kicker ek={ek + '-kicker'} c="#fff" style={{ marginBottom: 30 }}>IMAGE · 빅넘버형</Kicker>
        <Editable ekey={ek + '-n'} tag="div" className="hi" style={{ fontWeight: 700, fontSize: 230, lineHeight: 1, color: '#fff', letterSpacing: '-.02em', whiteSpace: 'nowrap' }}>3,000</Editable>
        <Editable ekey={ek + '-s'} tag="div" style={{ fontSize: 46, fontWeight: 300, color: '#fff', marginTop: 26 }}>20개국이 함께하는 글로벌 캠프</Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 09 그래픽 포스터형 (도형 중심) */
function T_GraphicPoster({ ek }) {
  return (
    <Card bg={PAL.purple} color="#fff" pad={0}>
      <SceneScatter scope="scene-tpl-poster" cx={905} by={1150} s={1.2} cols={[P.orange, P.river, P.leaf, P.pink]} fallback={window.scene(
        M.sun(965, 320, 1.05, P.orange), M.cloud(795, 340, 0.8, P.river),
        M.tree(845, 880, 1.5, P.leaf), M.tent(1000, 880, 1.2, P.orange, P.midnight),
        M.campfire(910, 1090, 1.25), M.hills(905, 1200, 1.0, [P.leaf, P.forest])
      )} />
      <CategoryChip ek={ek + '-cat'} label="슬로건" color={P.pink} top={S} right={S} />
      <div style={{ position: 'absolute', left: S, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Kicker ek={ek + '-kicker'} c={P.river}>GRAPHIC · 포스터형</Kicker>
        <Editable ekey={ek + '-t'} tag="div" className="hi" style={{ marginTop: 14, fontWeight: 700, fontSize: 132, lineHeight: 1.02, color: '#fff' }}>평화를<br /><span style={{ color: P.leaf }}>잇다</span></Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 10 이미지 카드 그리드 (2×2 + 라벨) */
function T_ImageGrid({ ek }) {
  const items = [{ t: 'K-POP 콘서트', c: P.purple }, { t: '전시·공연', c: P.ocean }, { t: '과정활동', c: P.forest }, { t: '개·폐영식', c: P.red }];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="IMAGE · 카드 그리드형" title="즐길 거리" cat={{ label: '프로그램', color: P.purple }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 300, bottom: S, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 22 }}>
        {items.map((x, i) => (
          <div key={i} style={{ position: 'relative', borderRadius: 22, overflow: 'hidden' }}>
            <Placeholder tone="light" label="" slot={ek + '-img' + i} slotLabel={x.t} radius={22} style={{ position: 'absolute', inset: 0 }} />
            <span style={{ position: 'absolute', left: 14, top: 14, width: 16, height: 16, borderRadius: '50%', background: x.c }} />
            <Editable ekey={ek + '-i' + i} tag="div" className="hi" style={{ position: 'absolute', left: 22, bottom: 18, fontSize: 36, fontWeight: 700, color: INK }}>{x.t}</Editable>
          </div>
        ))}
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 11 아이콘 그리드형 (그래픽) */
function T_IconGrid({ ek }) {
  const items = [
    { t: '과정활동', c: P.forest, n: '03', g: '⚑' }, { t: '전시·체험', c: P.ocean, n: '04', g: '★' }, { t: 'K-POP', c: P.purple, n: '02', g: 'K' },
    { t: '국제교류', c: P.red, n: '05', g: '♥' }, { t: '생태교육', c: P.forest, n: '06', g: '✿' }, { t: '개·폐영식', c: P.orange, n: '02', g: '✦' }
  ];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="GRAPHIC · 아이콘 그리드형" title="프로그램 한눈에" cat={{ label: '일정', color: P.forest }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 312, bottom: S, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 24 }}>
        {items.map((x, i) => (
          <div key={i} style={{ background: '#f6f2f9', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <ShapeBadge n={x.n} fill={x.c} glyph={x.g} glyphColor="#fff" size={78} />
            <Editable ekey={ek + '-i' + i} tag="span" className="hi" nowrap style={{ fontSize: 30, fontWeight: 700, color: INK }}>{x.t}</Editable>
          </div>
        ))}
      </div>
      <AutoFooter />
    </Card>
  );
}

/* 12 비주얼 타임라인형 (이미지 썸네일) */
function T_VisualTimeline({ ek }) {
  const nodes = [{ t: '입영', d: '8.5', c: P.red }, { t: '과정활동', d: '8.6–8', c: P.forest }, { t: 'K-POP', d: '8.7', c: P.purple }, { t: '폐영', d: '8.9', c: P.ocean }];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="IMAGE · 비주얼 타임라인형" title="4박 5일" cat={{ label: '일정', color: P.red }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 520, display: 'flex', gap: 18 }}>
        {nodes.map((x, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Placeholder tone="light" label="" slot={ek + '-img' + i} slotLabel={x.t} radius={18} style={{ width: '100%', height: 230 }} />
            <span style={{ width: 18, height: 18, borderRadius: '50%', background: x.c, marginTop: 22 }} />
            <Editable ekey={ek + '-t' + i} tag="span" className="hi" nowrap style={{ fontSize: 34, fontWeight: 700, color: INK, marginTop: 14 }}>{x.t}</Editable>
            <Editable ekey={ek + '-d' + i} tag="span" nowrap style={{ fontSize: 26, fontWeight: 300, color: DMUTE }}>{x.d}</Editable>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: S, right: S, top: 520 + 230 + 30, height: 4, background: '#62259918' }} />
      <AutoFooter />
    </Card>
  );
}

/* 13 엔딩형 — 카드뉴스 마지막 장 (아웃트로) */
function T_Outro({ ek }) {
  return (
    <Card bg={PAL.purple} color="#fff" pad={0}>
      <SceneScatter scope="scene-tpl-outro" cx={540} by={1150} s={1.05} cols={[P.leaf, P.orange, P.river, P.forest]} fallback={window.scene(
        M.sun(180, 300, 0.9, P.orange), M.cloud(900, 300, 0.75, P.river),
        M.tree(150, 1120, 1.15, P.leaf), M.tent(330, 1120, 0.95, P.orange, P.midnight),
        M.mountain(930, 1120, 1.2, P.forest, P.river), M.hills(770, 1120, 0.95, [P.leaf, P.forest]),
        M.campfire(540, 1170, 1.0)
      )} />
      <Logo size={150} style={{ position: 'absolute', top: S, left: '50%', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 0, bottom: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Editable ekey={ek + '-l1'} tag="div" className="hi" style={{ fontWeight: 700, fontSize: 110, lineHeight: 1.08, color: '#fff' }}>재밌겠지?</Editable>
        <Editable ekey={ek + '-l2'} tag="div" className="hi" style={{ fontWeight: 700, fontSize: 110, lineHeight: 1.08, color: P.leaf }}>기대되지?</Editable>
        <Editable ekey={ek + '-l3'} tag="div" style={{ marginTop: 34, fontSize: 40, fontWeight: 300, color: 'rgba(255,255,255,.92)' }}>궁금한 건 언제든 물어봐!</Editable>
      </div>
      <FooterBand bg={PAL.white} color={PAL.midnight} brandFoot />
    </Card>
  );
}

/* 14 절차/방법형 — 5단계 안내 (번호 배지 + 제목 + 설명) */
function T_Steps({ ek }) {
  const cols = [P.purple, P.ocean, P.forest, P.red, P.orange];
  const steps = [
    { t: '공식 채널 확인', s: '홈페이지·SNS에서 일정과 모집 공고를 확인해요' },
    { t: '참가 신청서 작성', s: '대원 정보와 참가 구분을 입력해요' },
    { t: '참가비 납부', s: '안내된 기한 안에 결제를 완료해요' },
    { t: '필수 서류 제출', s: '건강기록부 등 서류를 제출해요' },
    { t: '확정 · 준비물 안내', s: '배정 결과와 준비물 안내를 받으면 끝!' }
  ];
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <THead ek={ek} kicker="GUIDE · 절차 안내" title="참가 신청 5단계" cat={{ label: '안내', color: P.ocean }} />
      <div style={{ position: 'absolute', left: S, right: S, top: 318, bottom: S + 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {steps.map((x, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <ShapeBadge n="04" fill={cols[i % cols.length]} glyph={String(i + 1)} glyphColor="#fff" size={92} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Editable ekey={ek + '-t' + i} tag="div" className="hi" style={{ fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.04 }}>{x.t}</Editable>
              <Editable ekey={ek + '-s' + i} tag="div" style={{ fontSize: 28, color: DMUTE, fontWeight: 300, marginTop: 3 }}>{x.s}</Editable>
            </div>
            <span className="hi" style={{ flex: '0 0 auto', fontSize: 23, fontWeight: 700, color: cols[i % cols.length], opacity: .55 }}>{'STEP ' + (i + 1)}</span>
          </div>
        ))}
      </div>
      <AutoFooter />
    </Card>
  );
}

window.SEC_TEMPLATES = [
  { id: 'intro', label: '01 · 소개형 (텍스트)', node: <T_Intro ek="tpl-intro" /> },
  { id: 'faq', label: '02 · FAQ형 (텍스트)', node: <T_FAQ ek="tpl-faq" /> },
  { id: 'quote', label: '03 · 인용형 (텍스트)', node: <T_Quote ek="tpl-quote" /> },
  { id: 'fullimg', label: '04 · 풀이미지형', node: <T_FullImage ek="tpl-fullimg" /> },
  { id: 'imgcap', label: '05 · 이미지+캡션형', node: <T_ImageCaption ek="tpl-imgcap" /> },
  { id: 'splitimg', label: '06 · 좌우 분할형', node: <T_SplitImage ek="tpl-splitimg" /> },
  { id: 'gallery', label: '07 · 갤러리형', node: <T_Gallery ek="tpl-gallery" /> },
  { id: 'bignum', label: '08 · 빅넘버+이미지형', node: <T_BigNumImage ek="tpl-bignum" /> },
  { id: 'poster', label: '09 · 그래픽 포스터형', node: <T_GraphicPoster ek="tpl-poster" /> },
  { id: 'imggrid', label: '10 · 이미지 그리드형', node: <T_ImageGrid ek="tpl-imggrid" /> },
  { id: 'icongrid', label: '11 · 아이콘 그리드형', node: <T_IconGrid ek="tpl-icongrid" /> },
  { id: 'vtimeline', label: '12 · 비주얼 타임라인형', node: <T_VisualTimeline ek="tpl-vtimeline" /> },
  { id: 'steps', label: '13 · 절차/방법형 (5단계)', node: <T_Steps ek="tpl-steps" /> },
  { id: 'outro', label: '14 · 엔딩형', node: <T_Outro ek="tpl-outro" /> }
];
})();
