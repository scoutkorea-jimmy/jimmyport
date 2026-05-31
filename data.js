// ⬇️ 실제 데이터로 교체
// -----------------------------------------------------------------------------
// scout-finder 샘플 데이터.
// 로직(app.js)과 완전히 분리되어 있어, 이 배열만 교체하면 다른 데이터로 바로 동작합니다.
//
// 스키마:
//   {
//     id,          // 고유 식별자 (영문 kebab-case)
//     name,        // 지역대 이름
//     federation,  // 시·도연맹
//     district,    // 지구
//     address,     // 동 단위 전체주소
//     lat, lng,    // 동의 실제 대략 위경도 (검색 anchor·거리 계산에 사용)
//     sections,    // 운영 부문 배열: 비버 / 컵 / 스카우트 / 벤처 / 로버 중 일부
//     meetingDay,  // 정기모임 요일
//     contact,     // 연락처
//     note,        // 비고
//   }
//
// 좌표는 각 동의 실제 대략 위경도(샘플)입니다.
// -----------------------------------------------------------------------------

window.SCOUT_UNITS = [
  // ── 수원 (경기연맹) ────────────────────────────────────────────────
  {
    id: "suwon-yeongtong",
    name: "영통지역대",
    federation: "경기연맹",
    district: "영통지구",
    address: "경기도 수원시 영통구 영통동",
    lat: 37.2519, lng: 127.0717,
    sections: ["비버", "컵", "스카우트", "벤처"],
    meetingDay: "토요일",
    contact: "031-555-0201",
    note: "영통청소년문화의집에서 격주 활동",
  },
  {
    id: "suwon-gwonseon",
    name: "권선지역대",
    federation: "경기연맹",
    district: "권선지구",
    address: "경기도 수원시 권선구 권선동",
    lat: 37.2576, lng: 127.0010,
    sections: ["컵", "스카우트", "벤처"],
    meetingDay: "일요일",
    contact: "031-555-0202",
    note: "권선동 주민센터 인근 공원에서 야외 활동 위주",
  },
  {
    id: "suwon-ingye",
    name: "인계지역대",
    federation: "경기연맹",
    district: "팔달지구",
    address: "경기도 수원시 팔달구 인계동",
    lat: 37.2664, lng: 127.0287,
    sections: ["비버", "컵", "스카우트"],
    meetingDay: "토요일",
    contact: "031-555-0203",
    note: "수원종합운동장 근처, 신규 대원 상시 모집",
  },

  // ── 서울 (서울특별시연맹) ──────────────────────────────────────────
  {
    id: "seoul-yeoksam",
    name: "역삼지역대",
    federation: "서울특별시연맹",
    district: "강남지구",
    address: "서울특별시 강남구 역삼동",
    lat: 37.5006, lng: 127.0364,
    sections: ["컵", "스카우트", "벤처", "로버"],
    meetingDay: "토요일",
    contact: "02-555-0101",
    note: "역삼동 일대 학교 연계 활동",
  },
  {
    id: "seoul-jamsil",
    name: "잠실지역대",
    federation: "서울특별시연맹",
    district: "송파지구",
    address: "서울특별시 송파구 잠실동",
    lat: 37.5133, lng: 127.1001,
    sections: ["비버", "컵", "스카우트"],
    meetingDay: "일요일",
    contact: "02-555-0102",
    note: "한강·올림픽공원 야영 활동 활발",
  },
  {
    id: "seoul-sanggye",
    name: "상계지역대",
    federation: "서울특별시연맹",
    district: "노원지구",
    address: "서울특별시 노원구 상계동",
    lat: 37.6566, lng: 127.0568,
    sections: ["컵", "스카우트", "벤처"],
    meetingDay: "토요일",
    contact: "02-555-0103",
    note: "수락산 자락 등반·자연 활동 중심",
  },

  // ── 성남 (경기연맹) ────────────────────────────────────────────────
  {
    id: "seongnam-jeongja",
    name: "정자지역대",
    federation: "경기연맹",
    district: "분당지구",
    address: "경기도 성남시 분당구 정자동",
    lat: 37.3660, lng: 127.1085,
    sections: ["비버", "컵", "스카우트", "벤처"],
    meetingDay: "토요일",
    contact: "031-555-0204",
    note: "탄천 일대 도보·자전거 활동",
  },

  // ── 인천 (인천광역시연맹) ──────────────────────────────────────────
  {
    id: "incheon-guwol",
    name: "구월지역대",
    federation: "인천광역시연맹",
    district: "남동지구",
    address: "인천광역시 남동구 구월동",
    lat: 37.4486, lng: 126.7060,
    sections: ["컵", "스카우트", "벤처"],
    meetingDay: "일요일",
    contact: "032-555-0301",
    note: "인천시청 인근, 도심 봉사 활동 연계",
  },

  // ── 부산 (부산광역시연맹) ──────────────────────────────────────────
  {
    id: "busan-bujeon",
    name: "부전지역대",
    federation: "부산광역시연맹",
    district: "부산진지구",
    address: "부산광역시 부산진구 부전동",
    lat: 35.1577, lng: 129.0594,
    sections: ["비버", "컵", "스카우트"],
    meetingDay: "토요일",
    contact: "051-555-0401",
    note: "서면 일대, 도심형 지역대",
  },

  // ── 대구 (대구광역시연맹) ──────────────────────────────────────────
  {
    id: "daegu-beomeo",
    name: "범어지역대",
    federation: "대구광역시연맹",
    district: "수성지구",
    address: "대구광역시 수성구 범어동",
    lat: 35.8575, lng: 128.6206,
    sections: ["컵", "스카우트", "벤처", "로버"],
    meetingDay: "토요일",
    contact: "053-555-0501",
    note: "수성못 주변 자연 활동",
  },

  // ── 대전 (대전광역시연맹) ──────────────────────────────────────────
  {
    id: "daejeon-dunsan",
    name: "둔산지역대",
    federation: "대전광역시연맹",
    district: "서대전지구",
    address: "대전광역시 서구 둔산동",
    lat: 36.3515, lng: 127.3786,
    sections: ["비버", "컵", "스카우트"],
    meetingDay: "일요일",
    contact: "042-555-0601",
    note: "한밭수목원·갑천 일대 활동",
  },

  // ── 광주 (광주광역시연맹) ──────────────────────────────────────────
  {
    id: "gwangju-chipyeong",
    name: "치평지역대",
    federation: "광주광역시연맹",
    district: "서광주지구",
    address: "광주광역시 서구 치평동",
    lat: 35.1525, lng: 126.8497,
    sections: ["컵", "스카우트", "벤처"],
    meetingDay: "토요일",
    contact: "062-555-0701",
    note: "상무지구 인근, 학교 연계 모집",
  },

  // ── 춘천 (강원특별자치도연맹) ──────────────────────────────────────
  {
    id: "chuncheon-hyoja",
    name: "효자지역대",
    federation: "강원특별자치도연맹",
    district: "춘천지구",
    address: "강원특별자치도 춘천시 효자동",
    lat: 37.8743, lng: 127.7341,
    sections: ["컵", "스카우트", "벤처"],
    meetingDay: "토요일",
    contact: "033-555-0801",
    note: "의암호·삼악산 야영 활동",
  },

  // ── 제주 (제주특별자치도연맹) ──────────────────────────────────────
  {
    id: "jeju-nohyeong",
    name: "노형지역대",
    federation: "제주특별자치도연맹",
    district: "제주지구",
    address: "제주특별자치도 제주시 노형동",
    lat: 33.4845, lng: 126.4795,
    sections: ["비버", "컵", "스카우트", "벤처", "로버"],
    meetingDay: "일요일",
    contact: "064-555-0901",
    note: "한라산·해안 트레킹 등 자연 활동 풍부",
  },
];
