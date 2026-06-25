/* 표지(Cover) 베리에이션 — 주제별 '배경색' 구분 (대비 규칙 통과)
 * Phase 2: 에이브로우/제목(2행)/부제/카테고리 인라인·폼 편집, 배경사진 업로드,
 *          배경색·카테고리색 오버라이드(cc-prop:cover-<id>). */

(function () { // module scope - Babel standalone runs scripts in shared global scope
function CoverThemed(props) {
  const { id, bg, ink = '#fff', eyebrow, eyebrowColor, t1, t2, t2Color, sub, subColor, stitchFill, scatter, footEng, main, cat } = props;
  const gc = React.useContext(window.GContentCtx) || {};
  const store = useCCStore();
  const ov = store.getProps('cover-' + id);
  const rawBG = ov.bg || bg;
  const dens = ov.bgDensity != null ? +ov.bgDensity : 100;   // 배경색 농도(100=원색)
  const hasBgPhoto = !!store.getImage('cover-' + id + '-bg');
  // 배경사진 있으면: 농도=색 오버레이 투명도(낮출수록 사진이 비침). 없으면: 색을 흰색으로 희석.
  const BG = hasBgPhoto ? '#ffffff' : store.dilute(rawBG, dens);
  const overlayOp = hasBgPhoto ? Math.max(0, Math.min(1, dens / 100)) : 0;
  const INKC = (ov.bg || dens < 100) ? store.idealInk(hasBgPhoto ? rawBG : BG) : ink;   // 배경색/농도 바꾸면 본문 잉크 자동 대비
  const catColor = cat && (ov.catColor || cat.color);
  const align = ov.align || 'left';   // 제목·부제 블록 정렬 오버라이드
  const ek = 'cover-' + id;
  /* 도형 = 캠핑 풍경(하나의 사물을 이루도록). 에이브로우~제목 사이 가운데 빈 공간에 배치 */
  const M = window.MOTIF;
  const dark = INKC !== '#fff' ? PAL.midnight : PAL.midnight;
  const palAll = [PAL.leaf, PAL.orange, PAL.river, PAL.ocean, PAL.pink, PAL.red, PAL.forest].filter((c) => c !== BG);
  const k0 = palAll[0], k1 = palAll[1], k2 = palAll[2], k3 = palAll[3];
  // 캠프 풍경 — 겹침 없이 넓게(뒤→앞 레이어): 해·구름 / 산·언덕(배경) / 나무·텐트·모닥불(전경)
  const genScatter = scatter || window.scene(
    M.sun(872, 352, 1.05, k1),
    M.cloud(682, 344, 0.78, k2),
    M.mountain(706, 760, 1.5, PAL.forest === BG ? k2 : PAL.forest, k2),  // 뒤 배경(먼저)
    M.hills(540, 760, 1.35, [k3, k1]),
    M.tree(252, 760, 1.5, PAL.leaf === BG ? k0 : PAL.leaf),
    M.tent(452, 760, 1.28, k1, dark),
    M.campfire(626, 760, 1.15, [k1, k0, k3])
  );
  return (
    <Card bg={BG} color={INKC} pad={0}>
      <Placeholder tone={INKC === '#fff' ? 'dark' : 'light'} label="배경 사진 (교체)" slot={ek + '-bg'} slotLabel="배경 사진" bare
        style={{ position: 'absolute', inset: 0, borderRadius: 0, borderWidth: 0, opacity: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: rawBG, opacity: overlayOp, pointerEvents: 'none' }} />
      <SceneScatter scope={'scene-cover-' + id} cx={540} by={800} s={1.15} cols={[k0, k1, k2, k3]} fallback={genScatter} />
      <div style={{ position: 'absolute', top: 100, left: 100, right: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Editable ekey={ek + '-eyebrow'} flabel="에이브로우" tag="div" className="hi" nowrap style={{ fontWeight: 500, fontSize: 27, letterSpacing: '.14em', color: eyebrowColor, textTransform: 'uppercase' }}>{eyebrow}</Editable>
        <Logo size={116} />
      </div>
      <div style={{ position: 'absolute', left: 100, right: 100, bottom: 214, textAlign: align }}>
        <div className="hi" style={{ fontWeight: 700, fontSize: 130, lineHeight: .96, color: INKC }}>
          <Editable ekey={ek + '-t1'} flabel="제목 1행" tag="div" nowrap>{t1}</Editable>
          {t2 != null && <Editable ekey={ek + '-t2'} flabel="제목 2행" tag="div" nowrap style={{ color: t2Color || INKC }}>{t2}</Editable>}
        </div>
        {sub != null && <Editable ekey={ek + '-sub'} flabel="부제" tag="div" style={{ marginTop: 24, fontSize: 38, fontWeight: 300, color: subColor }}>{sub}</Editable>}
      </div>
      <EdgeStitch fill={stitchFill} bottom={146} />
      {cat && <CategoryChip label={<Editable ekey={ek + '-cat'} flabel="카테고리" tag="span">{cat.label}</Editable>} color={catColor} bottom={172} right={100} dot />}
      <FooterBand bg={PAL.white} color={PAL.midnight} left={main ? gc.dateRange : gc.brand} right={main ? gc.place : footEng} />
    </Card>
  );
}

const W92 = 'rgba(255,255,255,.92)', W88 = 'rgba(255,255,255,.88)', WST = 'rgba(255,255,255,.26)';

window.SEC_COVER = [
  {
    id: 'main', label: '표지 · 메인 (퍼플)',
    node: <CoverThemed id="main" bg={PAL.purple} cat={{ label: '메인·공지', color: PAL.purple }} eyebrow="2026 · KOREA NATIONAL JAMBOREE" eyebrowColor={PAL.river}
      t1="제16회" t2="한국잼버리" t2Color={PAL.leaf}
      sub="강원에서 펼쳐지는 청소년 글로벌 축제" subColor={W92} stitchFill="rgba(255,255,255,.24)" main />
  },
  {
    id: 'in', label: '표지 · 영내활동 (그린)',
    node: <CoverThemed id="in" bg={PAL.forest} cat={{ label: '영내활동', color: PAL.forest }} eyebrow="IN-CAMP · 영내활동" eyebrowColor={W88}
      t1="영내에서" t2="즐기는 모든 것"
      sub="과정활동 · 전시 · 공연 · 국제교류" subColor={W92} stitchFill={WST} footEng="IN-CAMP" />
  },
  {
    id: 'out', label: '표지 · 영외활동 (블루)',
    node: <CoverThemed id="out" bg={PAL.ocean} cat={{ label: '영외활동', color: PAL.ocean }} eyebrow="OUT-CAMP · 영외활동" eyebrowColor={W88}
      t1="영외에서" t2="만나는 강원"
      sub="지역 탐방 · 생태교육 · 문화체험" subColor={W92} stitchFill={WST} footEng="OUT-CAMP" />
  },
  {
    id: 'meal', label: '표지 · 식사 (오렌지)',
    node: <CoverThemed id="meal" bg={PAL.orange} ink={PAL.midnight} cat={{ label: '식사', color: PAL.orange }} eyebrow="MEALS · 식사" eyebrowColor={PAL.midnight}
      t1="잼버리" t2="밥상"
      sub="하루 세 끼, 든든하게" subColor="rgba(77,0,110,.82)" stitchFill="rgba(77,0,110,.22)" footEng="MEALS" />
  },
  {
    id: 'event', label: '표지 · 행사 (레드)',
    node: <CoverThemed id="event" bg={PAL.red} cat={{ label: '행사', color: PAL.red }} eyebrow="CEREMONY · 개영식 & 폐영식" eyebrowColor={W88}
      t1="개영식" t2="& 폐영식"
      sub="3,000명이 한자리에" subColor={W92} stitchFill={WST} footEng="CEREMONY" />
  }
];
})();
