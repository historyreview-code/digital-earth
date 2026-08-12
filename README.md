# Digital Earth · 数字地球可视化底座

> **3D 可旋转数字地球 + 任意主题的可视化框架**
> 首个主题参考实现：**THE 2026 全球百强大学**
> 后续主题：灾害、人口、战争、矿产、艺术、古迹……

![](./public/favicon.svg)

## ✨ 特性

- 🌐 **3D 可旋转地球**：基于 `three-globe` + `OrbitControls` + `CSS2DRenderer`（官方验证的稳定组合）
- 🎯 **HTML Elements 标记层**：100 个大学 + 32 个主要城市标记，**始终屏幕像素大小**、同区域**垂直分层不重叠**
- 🏷️ **按排名/类型着色**：Top10 金色 / 11-50 橙色 / 其余灰蓝；首都蓝 / 大城市紫 / 科技中心青
- 🖱️ **点击飞行定位**：点 marker → 1 秒平滑飞向目标 → 右侧抽屉滑出
- 📖 **维基百科中英双语**：摘要 + 校园/校徽图 + 维基原文链接
- 🔍 **排名筛选**：全部 / Top 10 / Top 50
- 📱 **响应式**：桌面右侧抽屉 + 移动端 bottom sheet
- 🌗 **底座架构**：6 个未来主题共用 90% 基建，URL `?theme=xxx` 一键切换

---

## 🚀 本地运行

```bash
npm install
npm run dev
```

dev server 默认监听 `0.0.0.0:5173` (IPv4 所有接口)，可通过：
- `http://localhost:5173/`（如果浏览器代理绕开 localhost）
- `http://127.0.0.1:5173/`（同上）
- `http://<本机局域网 IP>:5173/`（**推荐**，绕开 localhost 解析 + 系统代理问题）

> **如果浏览器打不开** —— 多半是系统代理（Clash/小飞机等）干扰了 localhost。解决：
> 1. 在系统设置 → 网络 → 代理 → "忽略这些主机与域的代理设置"加上 `localhost` 和 `127.0.0.1`
> 2. 或者用浏览器无痕模式 + 关系统代理
> 3. 或者用局域网 IP 访问（如 `http://192.168.x.x:5173/`）
>
> **⚠️ 本机 Clash Verge 端口是 `7897`**（不是环境变量默认的 `7890`）。跑数据脚本时显式指定：
> ```bash
> export http_proxy=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897
> python3 scripts/fetch_universities.py --limit 200
> ```

```bash
npm run build     # 生产构建到 dist/
npm run preview   # 预览生产构建 (端口 4173)
```

URL 切换主题（未来）：`http://localhost:5173/?theme=disasters`

---

## 🏗 架构

```
globe_explorer/
├── index.html
├── vite.config.ts             # 强制 host:true 监听 IPv4+IPv6 (绕过代理坑)
├── public/
│   ├── assets/earth-topo.jpg  # NASA 公共域地球贴图
│   └── favicon.svg
├── scripts/
│   └── fetch_universities.py  # 构建期: THE 2026 → 维基 REST 补坐标
└── src/
    ├── main.ts                # 入口: 读 ?theme= → 装配底座 + 主题
    ├── core/                  # 🆕 底座: 6 主题共享
    │   ├── types.ts           # Theme<T>, MarkerItem, ThemeFilter, LegendItem
    │   ├── globe.ts           # 通用 3D 地球 (three-globe + OrbitControls + CSS2DRenderer)
    │   ├── drawer.ts          # 通用抽屉 + bottom sheet
    │   ├── i18n.ts            # 通用语言状态 + 基础字典
    │   ├── filter.ts          # 通用筛选条
    │   ├── styles.css         # 暗色宇宙风基础
    │   └── api/
    │       ├── wikipedia.ts        # 维基 REST 客户端
    │       └── wikipedia-types.ts  # WikiSummary 类型
    └── themes/                # 🆕 主题
        ├── index.ts           # 主题注册表 + 主题特定 visual 适配器
        └── universities/      # 大学主题参考实现
            ├── theme.ts       # Theme<University> 实现 + cluster + filter
            ├── data.ts       # 32 个主要城市
            ├── markers.ts    # 大学/城市 HTML element maker
            ├── detail.ts     # 抽屉详情渲染 (维基摘要 + 图 + CTA)
            ├── types.ts      # University, MajorCity 接口
            └── styles.css    # marker 视觉样式 (按排名配色)
```

---

## 🎯 Theme API（添加新主题只需 3 步）

```ts
// 1. 定义你的数据类型（必须继承 MarkerItem）
interface EarthquakePoint extends MarkerItem {
  id: string;
  magnitude: number;
  occurredAt: string;
  // ...
}

// 2. 实现 Theme<T> 接口
export const earthquakesTheme: Theme<EarthquakePoint> = {
  id: "earthquakes",
  name: { en: "Global Earthquakes", zh: "全球地震" },
  subtitle: { en: "Magnitude ≥ 5.0, last 30 days", zh: "近 30 天 ≥ 5.0 级地震" },
  markers: [...],  // 你的数据
  filters: [...],  // 顶栏筛选
  legend: [...],  // 底部图例
  describeMarker(item, lang) { return { title: "...", meta: "..." }; },
};

// 3. 在 src/themes/index.ts 注册
import { earthquakesTheme } from "./earthquakes/theme";
export const themeRegistry = {
  universities: universitiesTheme,
  earthquakes: earthquakesTheme,  // 🆕
};
```

`?theme=earthquakes` 即可切换。**不需要改任何底座代码**。

---

## 📊 数据源与许可

| 数据 | 来源 | 许可 |
|---|---|---|
| 排名 (rank, name, country, website) | [Times Higher Education World University Rankings 2026](https://www.timeshighereducation.com/world-university-rankings) JSON API | 遵循 THE 使用条款 |
| 坐标 (lat/lng) | [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) 构建期一次性固化 | CC0 (开放数据) |
| 摘要、校园图片 | Wikipedia REST `page/summary` 运行时获取 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 地球贴图 | NASA Visible Earth / Blue Marble (earth-topo.jpg) | Public Domain (PD-USGov-NASA) |

---

## ⚙️ 数据采集工作流（以 universities 为例）

```bash
# 默认 100 所; 用 --limit 200 生成 200 所
export http_proxy=http://127.0.0.1:7897 https_proxy=http://127.0.0.1:7897
python3 scripts/fetch_universities.py --limit 200 --json /tmp/the_2026.json
```

脚本步骤：
1. 拉 THE 2026 JSON（或 `--json` 用本地文件避开网络/限流）
2. 按 `rank_order` 取前 N 所
3. 对每所学校，遍历候选标题（名字+别名拆分）调 `en.wikipedia.org/api/rest_v1/page/summary/{title}` 拿 `coordinates` / `wikibase_item`
4. 通过 Wikidata sitelink 拿中文 wiki title，再调 `zh.wikipedia.org/...` 补全中文摘要与缺失坐标
5. 少数条目 en.wiki 无 `coordinates` 字段（如 Imperial/UCL/KAIST）→ 用国家中心坐标 fallback
6. 输出 TypeScript 常量 `universities.ts`（含 `id: uni-N`）

**浏览器端**只调用维基 REST + 加载 Wikimedia 图片，**不调用 Nominatim / Wikidata SPARQL**，符合 OSM / Wikipedia 公共服务 ToS。

---

## 🛡 API 使用条款（重要）

- **Wikipedia REST API**：浏览器直连（CORS OK），限流 200 req/min，无需 API key
- **Wikimedia 上传图片**（upload.wikimedia.org）：`<img>` 直接加载，CORS OK
- **THE JSON API**：仅在构建期 Python 脚本中使用，需发送合规 User-Agent

---

## 🛠 技术栈

- **构建**：Vite 8 + vanilla TypeScript
- **3D 渲染**：`three@0.185` + `three-globe@2.45`（直接用，未走 globe.gl wrapper 以避开 Vite 8 初始化 bug）
- **HTML 标记**：`CSS2DRenderer`（three 自带）
- **相机控制**：`OrbitControls`（three 自带）
- **数据**：Wikipedia REST API（运行时）+ THE JSON API（构建期）
- **样式**：原生 CSS（暗色宇宙风）
- **类型**：TypeScript strict mode

---

## 🚧 不在 MVP 范围

- 任意坐标点击 + 反向地理（已通过固定预置数据绕开）
- Nominatim（不需要）
- LLM 改写 / TTS 朗读 / 时间轴
- 3D 建筑 / 校园 3D 模型
- 登录 / 收藏 / 笔记
- 后端代理 / Edge Function / 生产部署（本地先跑通）

---

## 🙏 致谢

- 3D 地球：[vasturiano/three-globe](https://github.com/vasturiano/three-globe) · [three.js](https://threejs.org/)
- 排名数据：Times Higher Education
- 知识内容：Wikipedia · Wikimedia Commons
- 地球贴图：NASA Visible Earth

## 📄 License

源代码遵循 MIT License。运行时展示的维基百科内容遵循 CC BY-SA 4.0。