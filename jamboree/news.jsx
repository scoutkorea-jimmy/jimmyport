/* 이미지 1장 + 소식 전달형 카드뉴스 — 3 베리에이션 (1080×1350, 인스타 피드) */

(function () { // module scope - Babel standalone runs scripts in shared global scope
const NP = PAL;
const NS = 100; // Safe Zone

/* 공통: 키컬러 점 + 카테고리 칩 (흰 알약) */
function NewsChip({ label, color, top, left, right, bottom }) {
  return (
    <span style={{ position: 'absolute', top, left, right, bottom, display: 'inline-flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 999, padding: '11px 24px 11px 15px', boxShadow: '0 3px 14px rgba(40,30,50,.18)' }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: color }} />
      <span className="hi" style={{ fontSize: 27, fontWeight: 700, color: INK }}>{label}</span>
    </span>
  );
}

/* A · 풀블리드 이미지 + 하단 그라데이션 헤드라인 */
function NewsFull({ ek }) {
  const align = useCCStore().getProp(ek, 'align', 'left');
  return (
    <Card bg={PAL.midnight} color="#fff" pad={0}>
      <Placeholder tone="dark" label="소식 이미지 (전체)" slot={ek + '-img'} slotLabel="소식 이미지" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,0,30,.35) 0%, rgba(20,0,30,0) 26%, rgba(20,0,30,0) 44%, rgba(20,0,30,.9) 86%)' }} />
      <div style={{ position: 'absolute', top: NS, left: NS, right: NS, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <NewsChip label="공지" color={NP.pink} />
        <Logo size={104} />
      </div>
      <div style={{ position: 'absolute', left: NS, right: NS, bottom: NS, textAlign: align }}>
        <Editable ekey={ek + '-k'} tag="div" className="hi" style={{ fontWeight: 500, fontSize: 28, letterSpacing: '.1em', color: NP.river, textTransform: 'uppercase' }}>NEWS · 2026. 6. 12</Editable>
        <Editable ekey={ek + '-h'} tag="div" className="hi" style={{ marginTop: 16, fontWeight: 700, fontSize: 84, lineHeight: 1.12, color: '#fff', textWrap: 'balance' }}>참가 신청, 이렇게 진행돼요</Editable>
        <Editable ekey={ek + '-s'} tag="div" style={{ marginTop: 18, fontSize: 34, fontWeight: 300, lineHeight: 1.5, color: 'rgba(255,255,255,.9)' }}>자세한 일정과 방법은 공식 채널에서 확인하세요.</Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

/* B · 이미지(상) + 컬러 밴드(하) 헤드라인 */
function NewsBand({ ek }) {
  const align = useCCStore().getProp(ek, 'align', 'left');
  return (
    <Card bg={PAL.white} color={INK} pad={0}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 760, overflow: 'hidden' }}>
        <Placeholder tone="light" label="소식 이미지" slot={ek + '-img'} slotLabel="소식 이미지" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0 }} />
        <NewsChip label="안내" color={NP.ocean} top={NS} left={NS} />
        <Logo size={104} style={{ position: 'absolute', top: NS, right: NS }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 590, background: NP.purple, color: '#fff', padding: '54px 100px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: align }}>
        <Editable ekey={ek + '-k'} tag="div" className="hi" style={{ fontWeight: 500, fontSize: 28, letterSpacing: '.1em', color: NP.leaf, textTransform: 'uppercase' }}>NOTICE · 새 소식</Editable>
        <Editable ekey={ek + '-h'} tag="div" className="hi" style={{ marginTop: 14, fontWeight: 700, fontSize: 80, lineHeight: 1.12, color: '#fff', textWrap: 'balance' }}>K-POP 콘서트 라인업 공개</Editable>
        <Editable ekey={ek + '-s'} tag="div" style={{ marginTop: 16, fontSize: 33, fontWeight: 300, lineHeight: 1.5, color: 'rgba(255,255,255,.88)' }}>잼버리의 밤을 밝힐 무대, 곧 만나요.</Editable>
      </div>
    </Card>
  );
}

/* C · 이미지 + 카드형 헤드라인 오버레이 (프레임) */
function NewsCard({ ek }) {
  return (
    <Card bg={NP.forest} color="#fff" pad={0}>
      <Placeholder tone="dark" label="소식 이미지" slot={ek + '-img'} slotLabel="소식 이미지" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0, opacity: .55 }} />
      <div style={{ position: 'absolute', inset: 0, background: NP.forest, opacity: .5, pointerEvents: 'none' }} />
      <SceneScatter scope="scene-news-card" cx={540} by={1226} s={1.0} cols={[NP.leaf, NP.orange, NP.river, NP.forest]} fallback={window.scene(
        window.MOTIF.sun(170, 300, 0.9, NP.leaf), window.MOTIF.cloud(900, 300, 0.78, NP.river),
        window.MOTIF.tree(180, 1226, 1.05, NP.leaf), window.MOTIF.tent(355, 1226, 0.9, NP.orange, NP.midnight),
        window.MOTIF.campfire(545, 1226, 1.05), window.MOTIF.hills(800, 1226, 0.95, [NP.leaf, NP.river]),
        window.MOTIF.mountain(985, 1226, 1.0, NP.river, NP.leaf)
      )} />
      <Logo size={108} style={{ position: 'absolute', top: NS, left: '50%', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', left: NS, right: NS, top: '50%', transform: 'translateY(-46%)', background: '#fff', borderRadius: 34, padding: '54px 52px', boxShadow: '0 20px 50px rgba(0,0,0,.28)', textAlign: 'center' }}>
        <span className="hi" style={{ display: 'inline-block', background: NP.forest, color: '#fff', borderRadius: 999, padding: '10px 24px', fontSize: 26, fontWeight: 700 }}>현장 소식</span>
        <Editable ekey={ek + '-h'} tag="div" className="hi" style={{ marginTop: 22, fontWeight: 700, fontSize: 76, lineHeight: 1.14, color: INK, textWrap: 'balance' }}>영내 설영, 무사히 마쳤습니다</Editable>
        <Editable ekey={ek + '-s'} tag="div" style={{ marginTop: 18, fontSize: 33, fontWeight: 300, lineHeight: 1.5, color: DMUTE }}>20개국 대원들이 강원에 모였어요.</Editable>
      </div>
      <AutoFooter />
    </Card>
  );
}

window.SEC_NEWS = [
  { id: 'full', label: 'A · 풀이미지 헤드라인', node: <NewsFull ek="news-full" /> },
  { id: 'band', label: 'B · 이미지+컬러밴드', node: <NewsBand ek="news-band" /> },
  { id: 'card', label: 'C · 카드 오버레이', node: <NewsCard ek="news-card" /> }
];
})();
