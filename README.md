# 午夜音乐记忆展览

Midnight Music Memory Exhibition — 收藏网易云音乐最动人的热评，把每一条评论背后的故事整理成一场私人深夜展览。

## 快速开始

```bash
# 安装依赖
npm install

# 启动本地服务器
./start.sh
# 或: python3 -m http.server 8080

# 访问 http://localhost:8080
```

## 数据获取

需要 [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 运行在 `localhost:3000`：

```bash
node fetch-one.mjs
```

支持断点续传，中断后重新运行会从上次位置继续。

## 技术栈

- 纯 HTML / CSS / JavaScript（无框架、无构建工具）
- Three.js 用于 3D 唱片封面渲染
- 数据来自网易云音乐 API

## 目录结构

- `app.js` — 应用逻辑（展览画廊、3D 渲染、故事生成）
- `styles.css` — 样式
- `index.html` — 页面结构
- `data/` — 歌曲和评论数据
- `assets/generated/` — 生成的封面和纹理图片
- `fetch-one.mjs` — 数据获取脚本（支持断点续传）
