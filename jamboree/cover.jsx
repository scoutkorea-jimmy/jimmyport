/* 표지(Cover) 베리에이션 — 주제별 '배경색'으로 확실히 구분 (대비 규칙 통과) */

function CoverThemed({ bg, ink = '#fff', eyebrow, eyebrowColor, title, sub, subColor, stitchFill, scatter, footEng, main, cat }) {
  const gc = React.useContext(window.GContentCtx) || {};
  return (
    <Card bg={bg} color={ink} pad={0}>
      <Placeholder tone={ink === '#fff' ? 'dark' : 'light'} label="배경 사진 (교체)" style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0, opacity: .55 }} />
      <div style={{ position: 'absolute', inset: 0, background: bg, opacity: .78 }} />
      <ShapeScatter items={scatter} />
      <div style={{ position: 'absolute', top: 100, left: 100, right: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="hi" style={{ fontWeight: 500, fontSize: 27, letterSpacing: '.14em', color: eyebrowColor, textTransform: 'uppercase' }}>{eyebrow}</div>
        <Logo size={116} />
      </div>
      <div style={{ position: 'absolute', left: 100, right: 100, bottom: 214 }}>
        <div className="hi" style={{ fontWeight: 700, fontSize: 130, lineHeight: .96, color: ink }}>{title}</div>
        {sub && <div style={{ marginTop: 24, fontSize: 38, fontWeight: 300, color: subColor }}>{sub}</div>}
      </div>
      <EdgeStitch fill={stitchFill} bottom={146} />
      {cat && <CategoryChip label={cat.label} color={cat.color} bottom={172} right={100} dot />}
      <FooterBand bg={PAL.white} color={PAL.midnight} left={main ? gc.dateRange : gc.brand} right={main ? gc.place : footEng} />
    </Card>
  );
}

const W92 = 'rgba(255,255,255,.92)', W88 = 'rgba(255,255,255,.88)', WST = 'rgba(255,255,255,.26)';

window.SEC_COVER = [
  {
    id: 'main', label: '표지 · 메인 (퍼플)',
    node: <CoverThemed bg={PAL.purple} cat={{ label: '메인·공지', color: PAL.purple }} eyebrow="2026 · GOSEONG · GANGWON" eyebrowColor={PAL.river}
      title={<span>제16회<br /><span style={{ color: PAL.leaf }}>한국잼버리</span></span>}
      sub="강원에서 펼쳐지는 청소년 글로벌 축제" subColor={W92} stitchFill="rgba(255,255,255,.24)"
      scatter={[
        { n: '03', outline: true, fill: 'rgba(255,255,255,.09)', h: 620, top: -160, right: -180 },
        { n: '02', fill: PAL.orange, h: 86, top: 300, right: 150 },
        { n: '05', fill: PAL.river, h: 104, top: 410, right: 86 },
        { n: '04', fill: PAL.pink, h: 56, top: 552, right: 188 },
        { n: '06', fill: PAL.leaf, h: 118, top: 588, right: 100 }
      ]} main />
  },
  {
    id: 'in', label: '표지 · 영내활동 (그린)',
    node: <CoverThemed bg={PAL.forest} cat={{ label: '영내활동', color: PAL.forest }} eyebrow="IN-CAMP · 영내활동" eyebrowColor={W88}
      title={<span>영내에서<br />즐기는 모든 것</span>}
      sub="과정활동 · 전시 · 공연 · 국제교류" subColor={W92} stitchFill={WST}
      scatter={[
        { n: '06', fill: PAL.leaf, h: 150, top: 150, left: 64 },
        { n: '02', fill: PAL.river, h: 74, top: 360, left: 120 },
        { n: '04', fill: PAL.orange, h: 52, top: 470, left: 70 },
        { n: '05', outline: true, fill: 'rgba(255,255,255,.12)', h: 520, bottom: -120, right: -120 }
      ]} footEng="IN-CAMP" />
  },
  {
    id: 'out', label: '표지 · 영외활동 (블루)',
    node: <CoverThemed bg={PAL.ocean} cat={{ label: '영외활동', color: PAL.ocean }} eyebrow="OUT-CAMP · 영외활동" eyebrowColor={W88}
      title={<span>영외에서<br />만나는 강원</span>}
      sub="지역 탐방 · 생태교육 · 문화체험" subColor={W92} stitchFill={WST}
      scatter={[
        { n: '02', fill: PAL.leaf, h: 64, bottom: 232, left: 120 },
        { n: '05', fill: PAL.river, h: 88, bottom: 226, left: 260, rot: 90 },
        { n: '04', fill: PAL.orange, h: 56, bottom: 250, left: 430 },
        { n: '06', fill: PAL.pink, h: 110, bottom: 210, left: 560 },
        { n: '03', outline: true, fill: 'rgba(255,255,255,.12)', h: 460, top: -120, right: -120 }
      ]} footEng="OUT-CAMP" />
  },
  {
    id: 'meal', label: '표지 · 식사 (오렌지)',
    node: <CoverThemed bg={PAL.orange} ink={PAL.midnight} cat={{ label: '식사', color: PAL.orange }} eyebrow="MEALS · 식사" eyebrowColor={PAL.midnight}
      title={<span>잼버리<br />밥상</span>}
      sub="하루 세 끼, 든든하게" subColor="rgba(77,0,110,.82)" stitchFill="rgba(77,0,110,.22)"
      scatter={[
        { n: '04', fill: PAL.purple, h: 96, top: 130, left: 80 },
        { n: '02', fill: PAL.red, h: 60, top: 150, right: 150 },
        { n: '05', fill: PAL.forest, h: 80, bottom: 250, left: 120 },
        { n: '06', fill: PAL.midnight, h: 110, bottom: 240, right: 130 }
      ]} footEng="MEALS" />
  },
  {
    id: 'event', label: '표지 · 행사 (레드)',
    node: <CoverThemed bg={PAL.red} cat={{ label: '행사', color: PAL.red }} eyebrow="CEREMONY · 개영식 & 폐영식" eyebrowColor={W88}
      title={<span>개영식<br />& 폐영식</span>}
      sub="3,000명이 한자리에" subColor={W92} stitchFill={WST}
      scatter={[
        { n: '05', outline: true, fill: 'rgba(255,255,255,.14)', h: 560, top: -130, left: -120, rot: 90 },
        { n: '02', fill: PAL.pink, h: 70, top: 200, right: 200 },
        { n: '04', fill: PAL.leaf, h: 54, top: 330, right: 120 },
        { n: '06', fill: PAL.river, h: 120, top: 420, right: 220 },
        { n: '02', fill: PAL.orange, h: 44, top: 300, right: 320 }
      ]} footEng="CEREMONY" />
  }
];
