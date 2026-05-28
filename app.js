import * as THREE from "./node_modules/three/build/three.module.js";

// ─── Data ───
let allSongs = [];

const ASSET_BASE = "./assets/generated/";
const TONE_COLORS = ["tone-rose", "tone-gold", "tone-cyan", "tone-violet", "tone-mint"];
const EXHIBIT_COVERS = [
  "cover-afterwards", "cover-rain-night", "cover-blue-pencil",
  "cover-daily-light", "cover-old-rain",
];

const modeCopy = {
  microfilm: { title: "短片旁白", opening: "镜头先落在一段没发出去的消息上。", ending: "音乐没有替任何人回答，但它把那一刻完整地留了下来。" },
  xiaohongshu: { title: "小红书故事帖", opening: "有些歌真的不能在深夜随机播放。", ending: "原来我们收藏一首歌，是为了在某天重新遇见过去的自己。" },
  podcast: { title: "播客开场", opening: "今天的故事，来自一条被很多人点亮的音乐评论。", ending: "如果你也在某首歌里藏过一个人，这一集可能会很像你。" },
  lyrics: { title: "歌词式独白", opening: "我把那年的风，调成单曲循环。", ending: "你没有出现，可副歌替你回头了一次。" },
};

// ─── DOM refs ───
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const songName = $("#songName");
const commentInput = $("#commentInput");
const storyMode = $("#storyMode");
const emotionLevel = $("#emotionLevel");
const charCount = $("#charCount");
const resultTitle = $("#resultTitle");
const resultStory = $("#resultStory");
const resultSongTag = $("#resultSongTag");
const shotList = $("#shotList");
const tagCloud = $("#tagCloud");
const stageLabel = $("#stageLabel");
const stageTitle = $("#stageTitle");
const stageMode = $("#stageMode");
const memoryLine = $("#memoryLine");
const resultTempo = $("#resultTempo");
const canvas = $("#waveCanvas");
const exhibitGrid = $("#exhibitGrid");
const searchInput = $("#searchInput");
const filterTags = $("#filterTags");
const loadMoreWrap = $("#loadMoreWrap");
const loadMoreBtn = $("#loadMoreBtn");
const loadMoreInfo = $("#loadMoreInfo");
const songModal = $("#songModal");
const modalSong = $("#modalSong");
const modalArtist = $("#modalArtist");
const modalComments = $("#modalComments");
const modalGenerate = $("#modalGenerate");
const modalClose = $("#modalClose");

let hero3D;
let displayCount = 16;
let currentFilter = null;
let searchTerm = "";
let selectedModalComment = null;
let selectedModalSong = null;

// ─── Data loading ───
const loadingState = $("#loadingState");
const errorState = $("#errorState");
const retryBtn = $("#retryBtn");

function showLoading() {
  if (loadingState) loadingState.classList.remove("hidden");
  if (errorState) errorState.classList.add("hidden");
}

function showError() {
  if (loadingState) loadingState.classList.add("hidden");
  if (errorState) errorState.classList.remove("hidden");
}

function hideLoading() {
  if (loadingState) loadingState.classList.add("hidden");
}

async function loadSongs() {
  showLoading();
  let loaded = false;

  // Try fetch first (works with HTTP server)
  try {
    const res = await fetch("./data/songs.json");
    if (res.ok) {
      allSongs = await res.json();
      loaded = allSongs.length > 0;
    }
  } catch {}
  // Fallback: load embedded data script
  if (!loaded) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./data/embedded.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      if (typeof EMBEDDED_SONGS !== "undefined") {
        allSongs = EMBEDDED_SONGS;
        loaded = allSongs.length > 0;
      }
    } catch {}
  }

  if (!loaded) {
    showError();
    return;
  }

  hideLoading();
  updateMetrics();
  buildFilterTags();
  renderGallery();
  showRandomExhibit();
}

retryBtn?.addEventListener("click", () => loadSongs());

function updateMetrics() {
  const totalComments = allSongs.reduce((s, x) => s + x.comments.length, 0);
  const artists = new Set(allSongs.map((s) => s.artist)).size;
  const totalLikes = Math.round(
    allSongs.flatMap((s) => s.comments).reduce((s, c) => s + c.likedCount, 0) / 10000
  );
  $("#metricSongs").textContent = allSongs.length;
  $("#metricComments").textContent = totalComments;
  $("#metricArtists").textContent = artists;
  $("#metricTotalLikes").textContent = totalLikes;
  $("#exhibitCount").textContent = allSongs.length;
}

function buildFilterTags() {
  const artistCounts = {};
  allSongs.forEach((s) => {
    artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1;
  });
  const top = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  filterTags.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "filter-tag active";
  allBtn.textContent = "全部";
  allBtn.addEventListener("click", () => setFilter(null));
  filterTags.appendChild(allBtn);

  top.forEach(([artist]) => {
    const btn = document.createElement("button");
    btn.className = "filter-tag";
    btn.textContent = artist;
    btn.addEventListener("click", () => setFilter(artist));
    filterTags.appendChild(btn);
  });
}

function setFilter(artist) {
  currentFilter = artist;
  $$(".filter-tag").forEach((t) => t.classList.toggle("active", t.textContent === (artist || "全部")));
  displayCount = 16;
  renderGallery();
}

function getFilteredSongs() {
  let songs = allSongs;
  if (currentFilter) songs = songs.filter((s) => s.artist === currentFilter);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    songs = songs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.comments.some((c) => c.content.toLowerCase().includes(q))
    );
  }
  return songs;
}

function formatLikes(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function renderGallery() {
  const songs = getFilteredSongs();
  const visible = songs.slice(0, displayCount);

  exhibitGrid.innerHTML = "";
  visible.forEach((song, i) => {
    const best = song.comments.reduce((a, b) => (a.likedCount > b.likedCount ? a : b));
    const coverClass = i < EXHIBIT_COVERS.length ? EXHIBIT_COVERS[i] : TONE_COLORS[i % TONE_COLORS.length];
    const cardTags = inferEmotion(best.content, 3).slice(0, 3);

    const card = document.createElement("article");
    card.className = "exhibit-card" + (i === 0 ? " featured" : "");
    card.innerHTML = `
      <div class="card-cover">
        <div class="card-cover-inner ${coverClass}">
          <span class="card-index">NO.${String(i + 1).padStart(4, "0")}</span>
          <span class="card-badge">${i === 0 ? "最新" : "展品"}</span>
          <div class="mini-vinyl"></div>
        </div>
      </div>
      <div class="card-body">
        <div>
          <div class="card-song">
            <span>${song.name}</span>
            <span class="card-likes">${formatLikes(best.likedCount)}</span>
          </div>
          <div class="card-artist">${song.artist}</div>
        </div>
        <p class="card-comment">${best.content}</p>
        <div class="card-tags">
          ${cardTags.map((tag) => `<span>${tag}</span>`).join("")}
        </div>
        <div class="card-meta">
          <span class="card-likes">${formatLikes(best.likedCount)} 次共鸣</span>
          <span class="card-more">${song.comments.length} 条热评 →</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => openSongModal(song));
    exhibitGrid.appendChild(card);
  });

  if (visible.length < songs.length) {
    loadMoreWrap.classList.remove("hidden");
    loadMoreInfo.textContent = `${visible.length} / ${songs.length}`;
  } else {
    loadMoreWrap.classList.add("hidden");
  }
}

// ─── Modal ───
function openSongModal(song) {
  selectedModalSong = song;
  selectedModalComment = null;
  modalSong.textContent = song.name;
  modalArtist.textContent = song.artist;

  modalComments.innerHTML = "";
  const sortedComments = [...song.comments].sort((a, b) => b.likedCount - a.likedCount);
  selectedModalComment = sortedComments[0] || null;

  sortedComments
    .sort((a, b) => b.likedCount - a.likedCount)
    .forEach((comment, index) => {
      const div = document.createElement("div");
      div.className = "modal-comment" + (index === 0 ? " selected" : "");
      div.innerHTML = `
        <p class="modal-comment-text">${comment.content}</p>
        <div class="modal-comment-meta">
          <span class="modal-comment-nickname">@${comment.nickname}</span>
          <span class="modal-comment-likes">${formatLikes(comment.likedCount)}</span>
        </div>
      `;
      div.addEventListener("click", () => {
        $$(".modal-comment").forEach((c) => c.classList.remove("selected"));
        div.classList.add("selected");
        selectedModalComment = comment;
      });
      modalComments.appendChild(div);
    });

  songModal.classList.remove("hidden");
}

function closeSongModal() {
  songModal.classList.add("hidden");
  selectedModalComment = null;
}

function applyModalComment() {
  if (!selectedModalComment || !selectedModalSong) return;
  songName.value = selectedModalSong.name;
  commentInput.value = selectedModalComment.content;
  closeSongModal();
  updateCharCount();
  generate();
  document.querySelector(".result-exhibit")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Random exhibit ───
function showRandomExhibit() {
  if (!allSongs.length) return;
  const song = allSongs[Math.floor(Math.random() * allSongs.length)];
  const best = song.comments.reduce((a, b) => (a.likedCount > b.likedCount ? a : b));
  songName.value = song.name;
  commentInput.value = best.content;
  updateCharCount();
  generate();
}

// ─── Story generation (kept from original) ───
const memoryFallback = "“有些歌不是被播放，是被某个瞬间重新打开。”";

function pickKeywords(text) {
  const lexicon = [
    "高三", "毕业", "地铁", "深夜", "晚自习", "耳机", "磁带", "父亲", "妈妈",
    "再见", "十年", "蓝色", "学校", "雨", "车站", "消息", "大学", "青春",
    "眼泪", "想念", "回忆", "冬天", "初恋", "结婚", "分离", "错过", "成长",
    "父亲", "奶奶", "分手", "初恋", "未来", "少年",
  ];
  return [...new Set(lexicon.filter((w) => text.includes(w)))].slice(0, 8);
}

function inferEmotion(text, level) {
  const map = [
    ["怀念", "错过", "青春"],
    ["亲情", "克制", "温柔"],
    ["深夜", "释怀", "遗憾"],
    ["重逢", "时间", "未说出口"],
  ];
  const base = text.includes("爸") || text.includes("妈") || text.includes("奶奶")
    ? map[1] : map[0];
  const extra = Number(level) > 3 ? map[2] : map[3];
  return [...base, ...extra];
}

function extractMemoryLine(text) {
  const sentence = text
    .split(/[。！？!?]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  if (!sentence) return memoryFallback;
  return `“${sentence.slice(0, 44)}${sentence.length > 44 ? "..." : ""}”`;
}

function buildStory({ song, comment, mode, level }) {
  const config = modeCopy[mode];
  const keywords = pickKeywords(comment);
  const emotions = inferEmotion(comment, level);
  const subject = song ? `《${song}》` : "这首歌";
  const detail = keywords.length ? keywords.join("、") : "某个忽然被音乐照亮的细节";
  const intensity = Number(level);
  const pulse = intensity >= 4
    ? "情绪被推得很近，像镜头贴着呼吸。"
    : "情绪保持克制，像隔着玻璃看一场旧雨。";

  return {
    title: `${config.title}：${subject}里的未完成故事`,
    story: `${config.opening}\n\n评论里最动人的不是“我想你”，而是${detail}。这些词没有解释完整的关系，却让人看见一个人怎样把回忆藏进日常：一支笔、一副耳机、一班地铁，或者一句始终没有说出口的再见。\n\n${subject}响起时，故事里的主角并没有立刻崩溃。他只是突然停了一下，好像时间从人群里抽身，回到那个还来得及告别的下午。${pulse}\n\n${config.ending}`,
    shots: [
      `近景：手机屏幕停在评论区，背景里响起${subject}的前奏。`,
      `中景：主角在通勤、教室或车站里停顿，画面保留一个具体物件：${keywords[0] || "旧耳机"}。`,
      `闪回：把评论中的关键记忆拍成三秒碎片，避免解释太满。`,
      `空镜：歌曲进入副歌，环境声降低，只留下脚步、风声或列车进站声。`,
      `结尾：主角继续向前走，字幕只保留一句从评论改写出的独白。`,
    ],
    tags: [...emotions, ...keywords].slice(0, 12),
  };
}

// ─── 3D Cover ───
let defaultCoverImage = null;
function loadDefaultCover() {
  if (defaultCoverImage) return Promise.resolve(defaultCoverImage);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { defaultCoverImage = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = ASSET_BASE + "cover-midnight-loop.png";
  });
}

async function makeCoverTexture(title = "故事会从一句话开始", subtitle = "Memory extract") {
  const tc = document.createElement("canvas");
  tc.width = 1024; tc.height = 1280;
  const cover = tc.getContext("2d");

  // Draw base: use generated cover image if available, else fallback gradient
  const bgImg = await loadDefaultCover();
  if (bgImg) {
    cover.drawImage(bgImg, 0, 0, 1024, 1280);
    cover.fillStyle = "rgba(12,10,20,0.45)";
    cover.fillRect(0, 0, 1024, 1280);
  } else {
    const gradient = cover.createLinearGradient(0, 0, 1024, 1280);
    gradient.addColorStop(0, "#1a1520"); gradient.addColorStop(0.5, "#0f0c14"); gradient.addColorStop(1, "#0a0810");
    cover.fillStyle = gradient; cover.fillRect(0, 0, 1024, 1280);
  }

  // Text overlay
  cover.fillStyle = "rgba(244,184,96,0.9)";
  cover.font = "700 28px Avenir Next, system-ui, sans-serif";
  cover.fillText("MIDNIGHT MEMORY", 128, 110);

  cover.fillStyle = "#f5efe6";
  cover.font = "700 88px Georgia, Songti SC, serif";
  cover.textBaseline = "top";
  const lines = wrapCanvasText(cover, title, 760);
  lines.slice(0, 3).forEach((line, idx) => cover.fillText(line, 128, 188 + idx * 100));

  cover.fillStyle = "rgba(245,239,230,0.6)";
  cover.font = "500 26px Avenir Next, system-ui, sans-serif";
  cover.fillText(subtitle, 132, 1038);
  cover.fillStyle = "rgba(245,239,230,0.35)";
  cover.font = "400 22px Avenir Next, system-ui, sans-serif";
  cover.fillText("Stories turned into a cover you can almost hold", 132, 1080);

  const texture = new THREE.CanvasTexture(tc);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeRecordLabelTexture() {
  const tc = document.createElement("canvas");
  tc.width = 512; tc.height = 512;
  const ctx = tc.getContext("2d");
  const gradient = ctx.createRadialGradient(256, 220, 20, 256, 256, 256);
  gradient.addColorStop(0, "#ffe8ad");
  gradient.addColorStop(0.58, "#d6953c");
  gradient.addColorStop(1, "#7a421d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = i % 2 ? "#fff3cd" : "#3b1f10";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(34,19,12,0.82)";
  ctx.font = "900 38px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("SIDE A", 256, 198);
  ctx.font = "700 24px Avenir Next, sans-serif";
  ctx.fillText("MIDNIGHT EXHIBIT", 256, 244);
  ctx.fillStyle = "rgba(34,19,12,0.34)";
  ctx.beginPath();
  ctx.arc(256, 256, 34, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(tc);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function wrapCanvasText(ctx, text, maxW) {
  const chars = [...text];
  const lines = [];
  let cur = "";
  chars.forEach((ch) => {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  return lines;
}

async function createHero3D(targetCanvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.12, 7.5);

  const renderer = new THREE.WebGLRenderer({ canvas: targetCanvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

  const group = new THREE.Group();
  group.rotation.set(-0.08, -0.18, -0.04);
  scene.add(group);

  const initialTexture = await makeCoverTexture();
  const coverMat = new THREE.MeshStandardMaterial({ map: initialTexture, roughness: 0.48, metalness: 0.08, emissive: 0x180b10, emissiveIntensity: 0.12 });
  const cover = new THREE.Mesh(new THREE.BoxGeometry(2.65, 3.48, 0.14), coverMat);
  cover.position.set(-0.58, 0, 0.42); cover.rotation.y = -0.22;
  group.add(cover);
  cover.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(cover.geometry),
    new THREE.LineBasicMaterial({ color: 0xffd68a, transparent: true, opacity: 0.7 })
  ));

  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(2.78, 3.62, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x17111f, roughness: 0.82, metalness: 0.05 }));
  sleeve.position.set(-0.47, -0.02, 0.2); sleeve.rotation.y = -0.2;
  group.add(sleeve);

  const record = new THREE.Group();
  record.position.set(1.35, -0.02, 0.26); record.rotation.x = Math.PI / 2;
  group.add(record);
  record.add(new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.12, 128),
    new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.26, metalness: 0.78, emissive: 0x050301, emissiveIntensity: 0.05 })));
  record.add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.136, 96),
    new THREE.MeshStandardMaterial({ map: makeRecordLabelTexture(), roughness: 0.32, metalness: 0.24, emissive: 0x2a1208, emissiveIntensity: 0.18 })));

  [0.52, 0.78, 1.02, 1.2].forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 128),
      new THREE.MeshBasicMaterial({ color: [0xf4b860, 0xf26d7d, 0x6ee7f2, 0xfff8ee][i], transparent: true, opacity: i === 3 ? 0.18 : 0.25 }));
    ring.rotation.x = Math.PI / 2;
    record.add(ring);
  });
  for (let i = 0; i < 22; i++) {
    const r = 0.46 + i * 0.04;
    const groove = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0022, 6, 160),
      new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? 0x8f764d : 0x242021, transparent: true, opacity: i % 4 === 0 ? 0.2 : 0.12 }));
    groove.rotation.x = Math.PI / 2;
    record.add(groove);
  }
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.012, 8, 192),
    new THREE.MeshBasicMaterial({ color: 0xffdf9c, transparent: true, opacity: 0.18 }));
  rimRing.rotation.x = Math.PI / 2;
  record.add(rimRing);

  const particles = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 + (i % 3) * 0.004, 8, 8),
      new THREE.MeshBasicMaterial({ color: [0xf4b860, 0xf26d7d, 0x6ee7f2][i % 3], transparent: true, opacity: 0.55 }));
    dot.position.set((Math.random() - 0.5) * 6.3, (Math.random() - 0.5) * 3.7, -0.8 - Math.random() * 1.8);
    particles.add(dot);
  }
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0xfff4e8, 1.1));
  const key = new THREE.DirectionalLight(0xffd68a, 2.0); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.PointLight(0x6ee7f2, 1.8, 9); rim.position.set(2.8, 1.6, 2.2); scene.add(rim);
  const rose = new THREE.PointLight(0xf26d7d, 1.2, 8); rose.position.set(-2.8, -1.4, 2.6); scene.add(rose);

  const pointer = { x: 0, y: 0 };
  targetCanvas.closest(".audio-stage").addEventListener("pointermove", (e) => {
    const rect = targetCanvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  function resize() {
    const rect = targetCanvas.getBoundingClientRect();
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w < 700) {
      camera.position.set(0, 0.04, 8.1); group.scale.setScalar(1.05); group.position.set(0.08, 0.08, 0);
      cover.position.set(-0.52, 0.02, 0.72); record.position.set(1.08, 0, 0.42);
    } else {
      camera.position.set(0, 0.12, 7.5); group.scale.setScalar(1); group.position.set(0, 0, 0);
      cover.position.set(-0.58, 0, 0.42); record.position.set(1.35, -0.02, 0.26);
    }
    camera.updateProjectionMatrix();
  }

  function animate(time = 0) {
    resize();
    const t = time * 0.001;
    group.rotation.y += (pointer.x * 0.12 - group.rotation.y) * 0.035;
    group.rotation.x += (-0.08 - pointer.y * 0.08 - group.rotation.x) * 0.035;
    record.rotation.y = t * 0.45;
    particles.rotation.y = t * 0.02;
    cover.position.y = Math.sin(t * 1.2) * 0.025;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  resize(); animate();
  return {
    async update(title, subtitle) {
      const prev = coverMat.map;
      coverMat.map = await makeCoverTexture(title, subtitle);
      coverMat.needsUpdate = true;
      if (prev) prev.dispose();
    },
  };
}

// ─── Controls ───
function updateCharCount() {
  const c = commentInput.value.trim();
  charCount.textContent = `${c.length} 字`;
}

function updateControls() {
  stageMode.textContent = modeCopy[storyMode.value].title;
}

async function generate() {
  const comment = commentInput.value.trim();
  if (!comment) { commentInput.focus(); return; }

  const btn = $("#generateBtn");
  const stage = $(".audio-stage");
  const resultPanel = $(".result-exhibit");
  btn.classList.add("generating");
  stage?.classList.add("is-pressing");
  resultPanel?.classList.remove("result-ready");

  // Brief delay for generation feel
  await new Promise((r) => setTimeout(r, 900));

  const payload = buildStory({
    song: songName.value.trim(),
    comment,
    mode: storyMode.value,
    level: emotionLevel.value,
  });

  resultTitle.textContent = payload.title;
  resultStory.textContent = payload.story;
  resultSongTag.textContent = songName.value.trim() || "自定义评论";
  shotList.replaceChildren(...payload.shots.map((s) => Object.assign(document.createElement("li"), { textContent: s })));
  tagCloud.replaceChildren(...payload.tags.map((t) => Object.assign(document.createElement("span"), { textContent: t })));
  stageLabel.textContent = modeCopy[storyMode.value].title;
  stageTitle.textContent = songName.value.trim() || "从评论里提取出的故事";
  memoryLine.textContent = extractMemoryLine(comment);
  resultTempo.textContent = Number(emotionLevel.value) >= 4 ? "高情绪" : "克制叙事";

  if (!hero3D) hero3D = await createHero3D(canvas);
  await hero3D.update(
    stageTitle.textContent,
    `${modeCopy[storyMode.value].title} · 情绪浓度 ${emotionLevel.value}/5`
  );

  btn.classList.remove("generating");
  stage?.classList.remove("is-pressing");
  resultPanel?.classList.add("result-ready");
}

function switchTab(tabName) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabName));
  ["story", "shots", "tags"].forEach((name) => {
    $(`#${name}Tab`).classList.toggle("hidden", name !== tabName);
  });
}

// ─── Event listeners ───
$("#loadSample")?.addEventListener("click", showRandomExhibit);
$("#randomExhibit")?.addEventListener("click", showRandomExhibit);
$("#generateBtn").addEventListener("click", generate);
commentInput.addEventListener("input", updateCharCount);
storyMode.addEventListener("change", updateControls);
emotionLevel.addEventListener("input", updateControls);
$$(".tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

searchInput?.addEventListener("input", (e) => {
  searchTerm = e.target.value.trim();
  displayCount = 16;
  renderGallery();
});

loadMoreBtn?.addEventListener("click", () => {
  displayCount += 16;
  renderGallery();
});

modalClose?.addEventListener("click", closeSongModal);
songModal?.addEventListener("click", (e) => { if (e.target === songModal) closeSongModal(); });
modalGenerate?.addEventListener("click", applyModalComment);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSongModal();
});

// ─── Init ───
updateCharCount();
updateControls();
loadSongs();

// ─── Sidebar Navigation ───
$$(".sidebar-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    $$(".sidebar-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

// ─── Scroll Reveal ───
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

function setupScrollReveal() {
  $$(".exhibit-card").forEach((card, i) => {
    card.style.transitionDelay = `${i * 60}ms`;
    revealObserver.observe(card);
  });
}

// Re-setup after gallery renders
const originalRenderGallery = renderGallery;
renderGallery = function () {
  originalRenderGallery();
  setupScrollReveal();
};
// Initial call already happened in loadSongs, so setup reveal for existing cards
setTimeout(setupScrollReveal, 100);
