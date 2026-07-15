# 회귀 테스트 (krjam-planning)

구조 변경 전후의 동작 동일성을 확인한다. **리팩터링 전에 baseline 을 찍고, 각 단계마다 다시 돌려 diff 가 없어야 한다.**

```bash
npm i -g puppeteer-core   # 또는 임시 폴더에 설치
node test/regress-krjam-planning.js
```

- 로컬 http 서버 + 실제 Chrome(headless). `/api/*` 는 **전부 목업** → 운영 KV 를 건드리지 않는다(§16.6).
- 커버: 부팅·탭 / 콘텐츠 보드(빈 슬롯·정렬·필터·드래그) / 캘린더 / 일정표(좌표 픽셀·취재 불필요 회색·토글·모달·전체기간) / 소식 제보→일정(날짜 분기) / 자료실(미리보기·업로드 모달·R2 13청크) / 대시보드 · 인원 / 콘솔 에러 0.
- 생성 id(`mkid()`)는 실행마다 달라지므로 비교 시 정규화:
  `diff <(grep -E "PASS|FAIL" base.txt | sed -E 's/#extra#[a-z0-9]+/#extra#ID/g') <(...)`

⚠️ 목업이라 **실제 로그인·서버 저장 경로는 검증하지 않는다.** 그 부분은 배포 후 수동 QA.
