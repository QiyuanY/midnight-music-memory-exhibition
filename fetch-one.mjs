import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";

const API = "http://localhost:3000/comment/music";
const OUT = "data/songs.json";

const SONGS = [
  { id: 186016, name: "晴天", artist: "周杰伦" },
  { id: 185821, name: "七里香", artist: "周杰伦" },
  { id: 186005, name: "稻香", artist: "周杰伦" },
  { id: 25706282, name: "夜曲", artist: "周杰伦" },
  { id: 108242, name: "简单爱", artist: "周杰伦" },
  { id: 3360957051, name: "告白气球", artist: "周杰伦" },
  { id: 1330348068, name: "起风了", artist: "买辣椒也用券" },
  { id: 31419350, name: "后来", artist: "刘若英" },
  { id: 28285910, name: "平凡之路", artist: "朴树" },
  { id: 1374061413, name: "漠河舞厅", artist: "柳爽" },
  { id: 1842025914, name: "孤勇者", artist: "陈奕迅" },
  { id: 1958036561, name: "铃芽之旅", artist: "周深" },
  { id: 2014789751, name: "奢香夫人", artist: "凤凰传奇" },
  { id: 536623921, name: "光年之外", artist: "邓紫棋" },
  { id: 27731176, name: "好久不见", artist: "陈奕迅" },
  { id: 65538, name: "淘汰", artist: "陈奕迅" },
  { id: 5243886, name: "最长的电影", artist: "周杰伦" },
  { id: 2111213, name: "红玫瑰", artist: "陈奕迅" },
  { id: 234075, name: "老男孩", artist: "筷子兄弟" },
  { id: 440351080, name: "浪费", artist: "林宥嘉" },
  { id: 1397741417, name: "踏山河", artist: "是七叔呢" },
  { id: 1382596189, name: "你的答案", artist: "阿冗" },
  { id: 1407551413, name: "世间美好与你环环相扣", artist: "柏松" },
  { id: 1460571716, name: "飞鸟和蝉", artist: "任然" },
  { id: 436346833, name: "体面", artist: "于文文" },
  { id: 442427660, name: "说散就散", artist: "JC" },
  { id: 428282203, name: "纸短情长", artist: "烟把儿" },
  { id: 516018613, name: "那女孩对我说", artist: "黄明志" },
  { id: 1491889218, name: "冬眠", artist: "司南" },
  { id: 1403908961, name: "芒种", artist: "赵方婧" },
  { id: 29999620, name: "漂洋过海来看你", artist: "刘明湘" },
  { id: 347230, name: "天空之城", artist: "李志" },
  { id: 1317861361, name: "写给黄淮", artist: "解忧邵帅" },
  { id: 1808492017, name: "错位时空", artist: "艾辰" },
  { id: 1357785772, name: "星球坠落", artist: "李佳隆/艾热" },
  { id: 191232, name: "遥远的她", artist: "张学友" },
  { id: 1901371647, name: "人世间", artist: "雷佳" },
  { id: 2001835985, name: "骁", artist: "井胧" },
  { id: 1399584752, name: "大风吹", artist: "王赫野" },
  { id: 1824020871, name: "从前说", artist: "小咪" },
  { id: 1386734837, name: "心如止水", artist: "Ice Paper" },
  { id: 531295576, name: "最美的期待", artist: "周笔畅" },
  { id: 553755658, name: "有可能的夜晚", artist: "曾轶可" },
  { id: 1299550532, name: "倒数", artist: "G.E.M.邓紫棋" },
  { id: 441491828, name: "等你下课", artist: "周杰伦" },
  { id: 25706284, name: "搁浅", artist: "周杰伦" },
  { id: 1958354765, name: "半生雪", artist: "七叔-叶泽浩" },
  { id: 409872520, name: "下山", artist: "要不要买菜" },
  { id: 1397753446, name: "四季予你", artist: "颜人中" },
];

// 支持断点续传
let existing = [];
if (existsSync(OUT)) {
  try { existing = JSON.parse(readFileSync(OUT, "utf-8")); } catch {}
}
const doneIds = new Set(existing.map(s => s.id));
const remaining = SONGS.filter(s => !doneIds.has(s.id));

console.log(`已完成: ${existing.length}, 剩余: ${remaining.length}`);

for (const song of remaining) {
  process.stdout.write(`${song.name} - ${song.artist} ... `);
  try {
    const res = await fetch(`${API}?id=${song.id}&limit=20`);
    if (!res.ok) { console.log("✗ HTTP " + res.status); continue; }
    const data = await res.json();
    const hot = (data.hotComments || [])
      .filter(c => c.content.length >= 8 && c.content.length <= 300)
      .sort((a, b) => (b.likedCount || 0) - (a.likedCount || 0))
      .slice(0, 5)
      .map(c => ({
        content: c.content.trim(),
        nickname: c.user?.nickname || "匿名",
        likedCount: c.likedCount || 0,
      }));
    if (hot.length > 0) {
      existing.push({ id: song.id, name: song.name, artist: song.artist, comments: hot });
      console.log(`✓ ${hot.length} 条`);
    } else {
      console.log("✗ 无热评");
    }
    // 中途保存
    mkdirSync("data", { recursive: true });
    writeFileSync(OUT, JSON.stringify(existing, null, 2));
  } catch (e) {
    console.log("✗ " + e.message);
  }
  await new Promise(r => setTimeout(r, 600));
}

writeFileSync(OUT, JSON.stringify(existing, null, 2));
const total = existing.reduce((s, x) => s + x.comments.length, 0);
console.log(`\n完成！${existing.length} 首歌, ${total} 条评论 → ${OUT}`);
