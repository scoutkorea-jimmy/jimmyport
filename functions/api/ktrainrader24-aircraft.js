/* 옛 주소 /api/ktrainrader24-aircraft (2026-09-15 이름 변경 전).
 * 이름을 바꾸기 전에 열어 둔 화면이 계속 이 주소를 묻는다. GET 만 새 중계로 넘긴다 — 올리기(POST)는 새 주소에서만 받는다.
 * 옛 화면이 다 닫힐 만한 시간(한 달)이 지나면 지운다. */
export { onRequestGet } from "./ktransportradar24-aircraft.js";
