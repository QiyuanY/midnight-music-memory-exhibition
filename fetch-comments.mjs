/**
 * 从网易云 API 批量拉取歌曲热评
 * 用法: node fetch-comments.mjs
 * 前提: NeteaseCloudMusicApi 服务运行在 localhost:3000
 */

const API_BASE = "http://localhost:3000";

// 经典高热度歌曲 (ID → 歌名/歌手)
const SONGS = [
  { id: 186016, name: "晴天", artist: "周杰伦" },
  { id: 185821, name: "七里香", artist: "周杰伦" },
  { id: 186005, name: "稻香", artist: "周杰伦" },
  { id: 25706282, name: "夜曲", artist: "周杰伦" },
  { id: 108242, name: "简单爱", artist: "周杰伦" },
  { id: 436514312, name: "告白气球", artist: "周杰伦" },
  { id: 441491828, name: "等你下课", artist: "周杰伦" },
  { id: 1397345903, name: "Mojito", artist: "周杰伦" },
  { id: 1472480890, name: "错位时空", artist: "艾辰" },
  { id: 1330348068, name: "起风了", artist: "买辣椒也用券" },
  { id: 31419350, name: "后来", artist: "刘若英" },
  { id: 28285910, name: "平凡之路", artist: "朴树" },
  { id: 447925558, name: "飞鸟和蝉", artist: "任然" },
  { id: 1397741417, name: "踏山河", artist: "是七叔呢" },
  { id: 1382596189, name: "你的答案", artist: "阿冗" },
  { id: 1407551413, name: "世间美好与你环环相扣", artist: "柏松" },
  { id: 1357785772, name: "星球坠落", artist: "李佳隆/艾热" },
  { id: 1313354324, name: "遥远的她", artist: "张学友" },
  { id: 347230, name: "天空之城", artist: "李志" },
  { id: 436346833, name: "体面", artist: "于文文" },
  { id: 442427660, name: "说散就散", artist: "JC" },
  { id: 428282203, name: "纸短情长", artist: "烟把儿" },
  { id: 516018613, name: "那女孩对我说", artist: "黄明志" },
  { id: 571340283, name: "答案", artist: "杨坤/郭采洁" },
  { id: 1399584752, name: "大风吹", artist: "王赫野" },
  { id: 1463165983, name: "半生雪", artist: "是七叔呢" },
  { id: 1374061413, name: "漠河舞厅", artist: "柳爽" },
  { id: 1842025914, name: "孤勇者", artist: "陈奕迅" },
  { id: 1901371647, name: "人世间", artist: "雷佳" },
  { id: 1958036561, name: "铃芽之旅", artist: "周深" },
  { id: 2014789751, name: "奢香夫人", artist: "凤凰传奇" },
  { id: 2001835985, name: "骁", artist: "井胧" },
  { id: 1824020871, name: "从前说", artist: "小咪" },
  { id: 1491889218, name: "冬眠", artist: "司南" },
  { id: 1421642242, name: "世间与你", artist: "海伦" },
  { id: 536623921, name: "光年之外", artist: "邓紫棋" },
  { id: 409872520, name: "下山", artist: "要不要买菜" },
  { id: 1386734837, name: "心如止水", artist: "Ice Paper" },
  { id: 1363948882, name: "余生等你", artist: "王巨星" },
  { id: 1325905236, name: "醉仙美", artist: "王贰浪" },
  { id: 426487867, name: "最美情侣", artist: "白小白" },
  { id: 417596888, name: "最美期待", artist: "周笔畅" },
  { id: 553755658, name: "有可能的夜晚", artist: "曾轶可" },
  { id: 411214279, name: "倒数", artist: "邓紫棋" },
  { id: 1317861361, name: "写给黄淮", artist: "解忧邵帅" },
  { id: 1362516795, name: "你笑起来真好看", artist: "李昕融" },
  { id: 1403908961, name: "芒种", artist: "赵方婧" },
  { id: 440351080, name: "浪费", artist: "林宥嘉" },
  { id: 29999620, name: "漂洋过海来看你", artist: "刘明湘" },
];

async function fetchHotComments(songId, limit = 15) {
  try {
    const res = await fetch(
      `${API_BASE}/comment/music?id=${songId}&limit=${limit}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.hotComments || [];
  } catch (e) {
    console.error(`  ✗ 歌曲 ${songId} 请求失败: ${e.message}`);
    return null;
  }
}

function pickBestComments(comments, maxCount = 5) {
  if (!comments || comments.length === 0) return [];
  // 按点赞数排序，取前 maxCount 条有实质内容的评论
  const sorted = [...comments]
    .sort((a, b) => (b.likedCount || 0) - (a.likedCount || 0))
    .filter((c) => c.content && c.content.length >= 8 && c.content.length <= 300)
    .slice(0, maxCount);
  return sorted.map((c) => ({
    content: c.content.trim(),
    nickname: c.user?.nickname || "匿名",
    likedCount: c.likedCount || 0,
    time: c.time,
  }));
}

async function main() {
  console.log(`开始拉取 ${SONGS.length} 首歌的热评...\n`);

  const results = [];

  for (let i = 0; i < SONGS.length; i++) {
    const song = SONGS[i];
    process.stdout.write(
      `[${i + 1}/${SONGS.length}] ${song.name} - ${song.artist} ... `
    );

    const comments = await fetchHotComments(song.id);
    const picked = pickBestComments(comments);

    if (picked.length > 0) {
      results.push({
        id: song.id,
        name: song.name,
        artist: song.artist,
        comments: picked,
      });
      console.log(`✓ ${picked.length} 条热评`);
    } else {
      console.log("✗ 无可用热评");
    }

    // 间隔避免请求过快
    await new Promise((r) => setTimeout(r, 800));
  }

  // 写入 JSON
  const outputPath = new URL("./data/songs.json", import.meta.url);
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  mkdirSync(dirname(outputPath.pathname), { recursive: true });

  writeFileSync(
    outputPath.pathname.replace(/^\/([A-Z]:)/, "$1"),
    JSON.stringify(results, null, 2),
    "utf-8"
  );

  console.log(
    `\n完成！${results.length} 首歌的数据已保存到 data/songs.json`
  );
  console.log(
    `共 ${results.reduce((sum, s) => sum + s.comments.length, 0)} 条评论`
  );
}

main();
