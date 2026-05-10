const form = document.querySelector("#portfolio-form");
const preview = document.querySelector("#admin-preview");
const output = document.querySelector("#json-output");
const clearButton = document.querySelector("#clear-items");
const downloadButton = document.querySelector("#download-json");
const storageKey = "jimmypark-portfolio-draft";

let items = [];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
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

function sync() {
  localStorage.setItem(storageKey, JSON.stringify(items));
  output.value = JSON.stringify(items, null, 2);
  preview.innerHTML = "";

  items.forEach((item, index) => {
    const videoId = getYouTubeId(item.youtubeUrl);
    const card = document.createElement("article");
    card.className = "admin-card";

    const image = document.createElement("img");
    image.src = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
    image.alt = "";

    const body = document.createElement("div");
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("h3");
    title.textContent = item.ko.title;
    const role = document.createElement("p");
    role.textContent = item.ko.role;

    body.append(number, title, role);
    card.append(image, body);
    preview.append(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const titleKo = data.get("titleKo").trim();

  items.unshift({
    id: slugify(`${data.get("published") || new Date().getFullYear()}-${titleKo}`),
    youtubeUrl: data.get("youtubeUrl").trim(),
    published: data.get("published").trim() || String(new Date().getFullYear()),
    ko: {
      title: titleKo,
      role: data.get("roleKo").trim(),
      description: data.get("descriptionKo").trim()
    },
    en: {
      title: data.get("titleEn").trim() || titleKo,
      role: data.get("roleEn").trim() || data.get("roleKo").trim(),
      description: data.get("descriptionEn").trim() || data.get("descriptionKo").trim()
    }
  });

  form.reset();
  sync();
});

clearButton.addEventListener("click", () => {
  items = [];
  sync();
});

downloadButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "portfolio.json";
  link.click();
  URL.revokeObjectURL(link.href);
});

async function loadItems() {
  const saved = localStorage.getItem(storageKey);

  if (saved) {
    items = JSON.parse(saved);
    sync();
    return;
  }

  try {
    const response = await fetch("data/portfolio.json", { cache: "no-store" });
    items = response.ok ? await response.json() : [];
  } catch {
    items = [];
  }

  sync();
}

loadItems();
