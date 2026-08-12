# Digital Earth · 数字地球可视化

> **3D 可旋转数字地球 · THE 2026 全球 200 强大学**
> 点击地球上的大学，查看维基百科中英双语介绍与校园图片。

![](./public/favicon.svg)

**在线体验**：https://web-production-c7ea8.up.railway.app

## ✨ 特性

- 🌐 **3D 可旋转地球**：基于 `three-globe` + `OrbitControls` + `CSS2DRenderer`
- 🎓 **200 所大学 + 32 个主要城市**：THE 2026 世界大学排名数据
- 🏷️ **按排名着色**：Top 10 金 / 11-50 橙 / 51-100 蓝 / 101-200 灰
- 🖱️ **点击飞行定位**：点 marker → 平滑飞向目标 → 右侧抽屉显示详情
- 📖 **维基百科中英双语**：摘要 + 校园/校徽图 + 维基原文链接
- 🔍 **排名筛选**：全部 / Top 10 / Top 50 / Top 100
- 🌓 **中英语言切换**、📱 **移动端自适应**（bottom sheet）
- 🔗 **深度链接**：`?uni=12` 直达清华大学，`?view=lat,lng,altitude` 自定义视角

## 🚀 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:5173/` 即可。

```bash
npm run build     # 生产构建到 dist/
npm run preview   # 预览生产构建
```

## 🏗 架构

```
src/
├── main.ts                # 入口: 读 ?theme= → 装配底座 + 主题
├── core/                  # 底座: 通用能力
│   ├── types.ts           # Theme<T>, MarkerItem, ThemeFilter, LegendItem
│   ├── globe.ts           # 通用 3D 地球 (three-globe + OrbitControls + CSS2DRenderer)
│   ├── drawer.ts          # 通用抽屉 + bottom sheet
│   ├── i18n.ts            # 通用语言状态 + 基础字典
│   ├── filter.ts          # 通用筛选条
│   ├── styles.css         # 暗色宇宙风基础
│   └── api/wikipedia.ts   # 维基 REST 客户端
└── themes/                # 主题
    ├── index.ts           # 主题注册表
    └── universities/      # 大学主题
        ├── theme.ts       # Theme<University> 实现 + 聚类 + 筛选
        ├── data.ts        # 32 个主要城市
        ├── markers.ts     # 大学/城市 HTML element maker
        ├── detail.ts      # 抽屉详情渲染 (维基摘要 + 图 + CTA)
        ├── types.ts       # University, MajorCity 接口
        └── styles.css     # marker 视觉样式 (按排名配色)
```

## 📊 数据源与许可

| 数据 | 来源 | 许可 |
|---|---|---|
| 排名 (rank, name, country, website) | [Times Higher Education World University Rankings 2026](https://www.timeshighereducation.com/world-university-rankings) | 遵循 THE 使用条款 |
| 坐标 (lat/lng) | [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) 构建期一次性固化 | CC0 (开放数据) |
| 摘要、校园图片 | Wikipedia REST `page/summary` 运行时获取 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 地球贴图 | NASA Visible Earth / Blue Marble | Public Domain (PD-USGov-NASA) |

## ⚙️ 数据采集

`src/data/universities.ts` 由 `scripts/fetch_universities.py` 生成：

```bash
python3 scripts/fetch_universities.py --limit 200
```

流程：THE 2026 JSON → 遍历候选标题调 Wikipedia REST 拿坐标 + 中文名 → 输出 TypeScript 常量。

**浏览器端**只调用 Wikipedia REST + 加载 Wikimedia 图片，符合 OSM / Wikipedia 公共服务 ToS。

## 🛡 API 使用条款

- **Wikipedia REST API**：浏览器直连（CORS OK），限流 200 req/min，无需 API key
- **Wikimedia 上传图片**（upload.wikimedia.org）：`<img>` 直接加载，CORS OK
- **THE JSON API**：仅在构建期 Python 脚本中使用，需发送合规 User-Agent

## 🛠 技术栈

- **构建**：Vite + TypeScript
- **3D 渲染**：`three` + `three-globe` + `CSS2DRenderer` + `OrbitControls`
- **数据**：Wikipedia REST API（运行时）+ THE JSON API（构建期）
- **样式**：原生 CSS（暗色宇宙风）
- **部署**：Docker + nginx（Railway）

## 🙏 致谢

- 3D 地球：[vasturiano/three-globe](https://github.com/vasturiano/three-globe) · [three.js](https://threejs.org/)
- 排名数据：Times Higher Education
- 知识内容：Wikipedia · Wikimedia Commons
- 地球贴图：NASA Visible Earth

## 📄 License

源代码遵循 MIT License。运行时展示的维基百科内容遵循 CC BY-SA 4.0。
