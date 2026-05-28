#!/bin/bash
# 分批拉取网易云热评数据
# 用法: bash fetch-all.sh
# 前提: NeteaseCloudMusicApi 运行在 localhost:3000

set -e
cd "$(dirname "$0")"
mkdir -p data

API="http://localhost:3000/comment/music"

# 50首经典歌曲: id:name:artist
SONGS=(
"186016:晴天:周杰伦"
"185821:七里香:周杰伦"
"186005:稻香:周杰伦"
"25706282:夜曲:周杰伦"
"108242:简单爱:周杰伦"
"3360957051:告白气球:周杰伦"
"441491828:等你下课:周杰伦"
"1808492017:错位时空:艾辰"
"1330348068:起风了:买辣椒也用券"
"31419350:后来:刘若英"
"28285910:平凡之路:朴树"
"1460571716:飞鸟和蝉:任然"
"1397741417:踏山河:是七叔呢"
"1382596189:你的答案:阿冗"
"1407551413:世间美好与你环环相扣:柏松"
"1357785772:星球坠落:李佳隆/艾热"
"191232:遥远的她:张学友"
"347230:天空之城:李志"
"436346833:体面:于文文"
"442427660:说散就散:JC"
"428282203:纸短情长:烟把儿"
"516018613:那女孩对我说:黄明志"
"571340283:答案:杨坤/郭采洁"
"1399584752:大风吹:王赫野"
"1958354765:半生雪:七叔-叶泽浩"
"1374061413:漠河舞厅:柳爽"
"1842025914:孤勇者:陈奕迅"
"1901371647:人世间:雷佳"
"1958036561:铃芽之旅:周深"
"2014789751:奢香夫人:凤凰传奇"
"2001835985:骁:井胧"
"1824020871:从前说:小咪"
"1491889218:冬眠:司南"
"536623921:光年之外:邓紫棋"
"409872520:下山:要不要买菜"
"1386734837:心如止水:Ice Paper"
"531295576:最美的期待:周笔畅"
"553755658:有可能的夜晚:曾轶可"
"1299550532:倒数:G.E.M.邓紫棋"
"1317861361:写给黄淮:解忧邵帅"
"1403908961:芒种:赵方婧"
"440351080:浪费:林宥嘉"
"29999620:漂洋过海来看你:刘明湘"
"27731176:好久不见:陈奕迅"
"25706284:搁浅:周杰伦"
"65538:淘汰:陈奕迅"
"5243886:最长的电影:周杰伦"
"2111213:红玫瑰:陈奕迅"
"234075:老男孩:筷子兄弟"
"1397753446:四季予你:颜人中"
)

echo "[" > data/songs.json
FIRST=true

for entry in "${SONGS[@]}"; do
  IFS=':' read -r id name artist <<< "$entry"

  # 拉取评论
  raw=$(curl -s "$API?id=$id&limit=20")

  # 用 node 提取并格式化
  formatted=$(node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const hot = (data.hotComments || [])
      .filter(c => c.content.length >= 8 && c.content.length <= 300)
      .sort((a,b) => (b.likedCount||0) - (a.likedCount||0))
      .slice(0, 5)
      .map(c => ({
        content: c.content.trim(),
        nickname: c.user?.nickname || '匿名',
        likedCount: c.likedCount || 0
      }));
    console.log(JSON.stringify({
      id: $id,
      name: '$name',
      artist: '${artist}',
      comments: hot
    }));
  " <<< "$raw" 2>/dev/null)

  if [ -n "$formatted" ] && [ "$formatted" != "undefined" ]; then
    count=$(echo "$formatted" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); process.stdout.write(String(d.comments.length))")
    echo "[$count 条] $name - $artist"

    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> data/songs.json
    fi
    echo "$formatted" >> data/songs.json
  else
    echo "[跳过] $name - $artist"
  fi

  sleep 0.5
done

echo "]" >> data/songs.json

total=$(node -e "
  const d = JSON.parse(require('fs').readFileSync('data/songs.json','utf8'));
  const comments = d.reduce((s,x) => s + x.comments.length, 0);
  console.log(d.length + ' 首歌, ' + comments + ' 条评论');
")
echo "完成！$total"
