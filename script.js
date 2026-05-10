const year = document.querySelector("#year");
const languageButtons = document.querySelectorAll("[data-lang-button]");
const portfolioList = document.querySelector("#portfolio-list");

const translations = {
  ko: {
    brand: "박지민",
    heroEyebrow: "Media · Community · Scouting",
    heroTitle: "박지민",
    heroLead: "프로젝트를 만들고, 기록을 정리하고, 사람과 커뮤니티가 더 잘 연결되는 방식을 고민합니다.",
    viewPortfolio: "포트폴리오 보기",
    emailMe: "이메일 보내기",
    quickBasedLabel: "위치",
    quickBased: "한국",
    quickFocusLabel: "분야",
    quickFocus: "미디어, 교육, 커뮤니티",
    quickOutputLabel: "결과물",
    quickOutput: "영상, 기록, 운영 도구",
    profileTitle: "차분하게 만들고, 오래 남게 정리합니다.",
    profileBody:
      "박지민은 스카우팅, 교육, 미디어, 디지털 운영의 접점에서 프로젝트를 기획하고 실행합니다. 현장의 이야기를 읽기 쉬운 형태로 정리하고, 반복되는 일을 줄이는 도구와 구조를 만드는 데 관심이 있습니다.",
    workTitle: "주요 작업",
    workMedia: "스카우팅과 커뮤니티 현장의 기록을 읽기 쉬운 미디어로 정리합니다.",
    workCommunity: "사람이 모이고 배우는 장면을 더 넓게 연결하는 프로젝트를 기획합니다.",
    workTools: "운영자가 더 쉽게 판단하고 움직일 수 있도록 작고 단단한 도구를 만듭니다.",
    portfolioTitle: "영상 포트폴리오",
    portfolioIntro: "YouTube 영상 링크와 함께 내가 맡은 역할, 기획 의도, 작업 내용을 소개합니다.",
    interestsTitle: "관심사",
    interestOne: "스카우트 운동과 청소년 교육",
    interestTwo: "로컬 커뮤니티와 국제 네트워크",
    interestThree: "디지털 퍼블리싱과 운영 자동화",
    interestFour: "좋은 기록, 좋은 도구, 좋은 팀워크",
    contactTitle: "함께 이야기할 일이 있다면",
    contactBody: "프로젝트, 영상, 커뮤니티 협업에 대해 편하게 연락해 주세요.",
    roleLabel: "내 역할",
    watchLabel: "YouTube에서 보기",
    emptyPortfolio: "영상 포트폴리오를 준비하고 있습니다.",
    emptyPortfolioHint: "YouTube 링크와 역할 설명이 정리되는 대로 이곳에 케이스 스터디 형태로 공개됩니다."
  },
  en: {
    brand: "Jimmy Park",
    heroEyebrow: "Media · Community · Scouting",
    heroTitle: "Jimmy Park",
    heroLead: "I build projects, organize stories, and think about better ways for people and communities to connect.",
    viewPortfolio: "View portfolio",
    emailMe: "Email me",
    quickBasedLabel: "Based in",
    quickBased: "Korea",
    quickFocusLabel: "Focus",
    quickFocus: "Media, education, community",
    quickOutputLabel: "Output",
    quickOutput: "Video, records, operations tools",
    profileTitle: "Making things calmly, and documenting them to last.",
    profileBody:
      "Jimmy Park works across scouting, education, media, and digital operations. He plans and runs projects, shapes field stories into clear formats, and builds small systems that reduce repetitive work.",
    workTitle: "Selected work",
    workMedia: "Organizing stories from scouting and community fields into readable media.",
    workCommunity: "Planning projects that help people gather, learn, and connect more widely.",
    workTools: "Building focused digital tools that help operators make better decisions.",
    portfolioTitle: "Video portfolio",
    portfolioIntro: "A collection of YouTube-based projects with notes on my role, intention, and contribution.",
    interestsTitle: "Interests",
    interestOne: "Scouting and youth education",
    interestTwo: "Local communities and international networks",
    interestThree: "Digital publishing and operations automation",
    interestFour: "Good records, good tools, good teamwork",
    contactTitle: "If there is something to discuss",
    contactBody: "Reach out about projects, video work, or community collaboration.",
    roleLabel: "My role",
    watchLabel: "Watch on YouTube",
    emptyPortfolio: "Video portfolio is in preparation.",
    emptyPortfolioHint: "YouTube links and role notes will be published here as compact case studies."
  }
};

let currentLanguage = localStorage.getItem("jimmypark-language") || "ko";
let portfolioItems = [];

if (year) {
  year.textContent = new Date().getFullYear();
}

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }

    const embedMatch = parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return embedMatch ? embedMatch[2] : "";
  } catch {
    return "";
  }
}

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("jimmypark-language", lang);
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (translations[lang][key]) {
      node.textContent = translations[lang][key];
    }
  });

  languageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.langButton === lang);
  });

  renderPortfolio();
}

function renderPortfolio() {
  if (!portfolioList) return;

  portfolioList.innerHTML = "";

  if (!portfolioItems.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    const title = document.createElement("h3");
    title.textContent = translations[currentLanguage].emptyPortfolio;
    const body = document.createElement("p");
    body.textContent = translations[currentLanguage].emptyPortfolioHint;
    empty.append(title, body);
    portfolioList.append(empty);
    return;
  }

  portfolioItems.forEach((item, index) => {
    const content = item[currentLanguage] || item.ko || item.en;
    const videoId = getYouTubeId(item.youtubeUrl);
    const article = document.createElement("article");
    article.className = "portfolio-item";

    const media = document.createElement("a");
    media.className = "portfolio-media";
    media.href = item.youtubeUrl;
    media.target = "_blank";
    media.rel = "noreferrer";

    if (videoId) {
      const image = document.createElement("img");
      image.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      image.alt = "";
      image.loading = "lazy";
      const play = document.createElement("span");
      play.className = "play-mark";
      play.textContent = "Play";
      media.append(image, play);
    }

    const body = document.createElement("div");
    body.className = "portfolio-body";

    const number = document.createElement("div");
    number.className = "portfolio-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("h3");
    title.textContent = content.title;

    const role = document.createElement("p");
    role.className = "portfolio-role";
    const roleLabel = document.createElement("strong");
    roleLabel.textContent = translations[currentLanguage].roleLabel;
    role.append(roleLabel, document.createTextNode(` ${content.role}`));

    const description = document.createElement("p");
    description.textContent = content.description;

    const meta = document.createElement("div");
    meta.className = "portfolio-meta";
    const published = document.createElement("span");
    published.textContent = item.published || "";
    const link = document.createElement("a");
    link.href = item.youtubeUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = translations[currentLanguage].watchLabel;
    meta.append(published, link);

    body.append(number, title, role, description, meta);

    article.append(media, body);
    portfolioList.append(article);
  });
}

async function loadPortfolio() {
  if (!portfolioList) return;

  try {
    const response = await fetch("data/portfolio.json", { cache: "no-store" });
    portfolioItems = response.ok ? await response.json() : [];
  } catch {
    portfolioItems = [];
  }

  renderPortfolio();
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.langButton));
});

setLanguage(currentLanguage);
loadPortfolio();
