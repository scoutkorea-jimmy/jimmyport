# 운영 로그 (OPS) — 라이브 KV/데이터/인프라 조치
> 버전 bump 없는 라이브 조치도 **모두** 기록(일시·대상·전후·검증). 새 항목은 이 파일 맨 아래에 append.

### OPS 2026-06-28 — krjam-planning 라이브 KV ‘JHG 회의실’→‘JHQ 본부’ 일괄 정정 (사용자 지시)
- 지시: "JHG 회의실로 되어있는거 모두 다 JHQ 본부로 변경." 코드 변경(§16.44)과 별개로 운영 KV도 정정.
- 전(前): `jp:events` 8건(memo 장소: JHG 회의실) + `jp:timetable` 8건(place: JHG 회의실). 합 16건.
- 조치(curl read-modify-write, 비파괴): 전체 배열 그대로 받아 ‘JHG 회의실’→‘JHQ 본부’만 치환 후 events/timetable 각각 PUT(author=system). 그 외 키 불변.
- 후(後)/검증: 라이브 `GET /api/jamboree-plan` 전수 스캔 — JHG 0건, ‘JHQ 본부’ 16건.

### OPS 2026-07-16 — krjam-planning 라이브 KV 일정표 종류 색 정정 (v0.9.171 STEP3)
- 배경: `defaultTtCats()` 기본값 수정은 **저장된 종류가 없을 때만** 적용된다. 라이브 `jp:ttcats` 에는 옛 색이 남아 **실제 보드에서 계속 안 읽히는 상태**였다.
- 전(前) 7종: 개·폐영식 #C0492F(4.96) · 프로그램 #2F5D4A(7.54) · 행사 #6B4FA0(6.46) · **홍보활동 #0F8A8A(4.18 미달)** · 회의 #2E6FAE(5.25) · 이동·기타 #7A6A57(5.22) · 일과 #504E48(8.32).
- 조치: read-modify-write(비파괴) — **미달 1종만** `홍보활동 #0F8A8A → #0B6E6E`(6.05). 통과하는 6종은 손대지 않음(§16.24 '일과' 정정과 같은 방식). 전체 배열 그대로 받아 치환 후 `PUT {ttcats, author:'system'}`.
- 후(後)/검증: 라이브 `GET /api/jamboree-plan` → **7종 전부 4.5+ 통과**, 종류 수 7 보존.

### OPS 2026-07-15 — R2 버킷 `jimmyport-assets` 생성 (v0.9.163 자료실 100MB)
- 지시: "자료실에 파일 업로드 용량을 1개당 최대 100MB로 제한해줘" → KV 25MiB 한계로 불가 → AskUserQuestion에서 **"R2 도입해서 진짜 100MB"** 선택.
- 전(前): 계정 R2 버킷 4종(banginoja-media·dreampath-attachments·gilwell-media-images·mokgo-photos) — jimmyport용 없음.
- 조치: `npx wrangler r2 bucket create jimmyport-assets` (Standard) + `wrangler.toml` `[[r2_buckets]] binding="SCOUT_R2"`. 기존 KV·데이터 불변(신규 대용량 첨부만 R2, 기존 `/api/file` KV blob은 그대로 서빙).
- 후(後)/검증: 버킷 생성 확인. 라이브 바인딩 적용은 배포 후 확인 필요 — 미적용 시 `/api/r2`가 503 `r2_unbound`로 명시적 실패(8MB 이하 업로드는 기존 KV 경로라 영향 없음).

### OPS 2026-06-25 — krjam-dcount D-Count 신청 데이터 전체 초기화 (사용자 지시)
- 지시: "dcount 기존 등록된거 모두 삭제하고 전체 신규 받을 준비해줘." 코드/버전 변경 없음, 라이브 KV(`SCOUT_KV`)만 조치.
- 전(前) 상태: 신청 1건 `dcount:app:홍길동`(D-27/2026-07-09, status 반려, 테스트 데이터) · `dcount:index` 1건 · `dcount:log` 3건(신청·승인·반려) · 활성 lock 없음 · 닫힌 슬롯 없음.
- 조치(`wrangler kv ... --remote`): ① `dcount:app:홍길동` **삭제** ② `dcount:index` → `[]` ③ `dcount:log` → 초기화 마커 1건(`{action:"기록 초기화",count:3}`, 내장 clearlog 방식·감사추적). `dcount:style`(디자인 설정)·`dcount:visits`(방문카운터) 유지.
- 후(後)/검증: KV `dcount:index=[]`·`app:홍길동` 부재 + 라이브 `GET /api/krjam-dcount` → `approved:[]`, 슬롯 **36/36 신청가능**(D-40~D-5), 점유 0. 신규 신청 수신 준비 완료.

### OPS 2026-06-25 — krjam-dcount 신청 기록(dcount:log) 완전 비움 (사용자 지시 "다시 로그 밀어줘")
- 지시: 잘못 들어간 테스트 정리 차원에서 dcount 기록을 다시 밀어달라. 코드/버전 변경 없음.
- 전(前): `dcount:index=[]`·`dcount:app:*` 없음(이미 비어 있음) · `dcount:log` = 초기화 마커 1건(`기록 초기화`). 새 등록 데이터는 없었음.
- 조치: `dcount:log` → `[]` (마커까지 제거, 완전 비움). 그 외 키 변경 없음.
- 후(後)/검증: KV `dcount:log=[]`·`dcount:index=[]` + 라이브 `GET /api/krjam-dcount` → `approved:[]`, 슬롯 36/36 신청가능.

## 2026-07-28 — 저장 보호 도입에 따른 KV 키 추가 (v0.9.277)
- 새 KV 키 2개가 **쓰기 시점에** 생긴다(사전 생성 불필요, 기존 데이터 변경 없음):
  - `jp:fnc-staff:snap` — 운영요원 명단 덮어쓰기 직전 상태 최근 10개(TTL 30일)
  - `units:snap` — 스카우팅 지도 덮어쓰기 직전 상태 최근 10개(TTL 30일)
- `fncauth:rl:<IP>` — 급식 관리자 로그인 시도 카운터(TTL 10분). 자동 만료되므로 정리 불필요.
- **운영 KV 에 대한 쓰기 검증은 하지 않았다.** 서버 동작은 배포되는 모듈을 가짜 KV(Map)로 돌려 확인했고, 라이브는 GET 만 확인한다.
- 되돌리기 사용법(사고 시): `GET /api/jp-fnc-staff?snapshots=1` 또는 `GET /api/units?snapshots=1` 로 시각 확인 → 같은 경로에 `PUT {"restore":"<at>"}`. 둘 다 관리자 인증 필요하고, 복구 직전 상태도 스냅샷으로 남는다.
