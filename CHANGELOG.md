# Changelog

## v1.0.0 (2026-08-12)

数字地球可视化 · 首个正式版本。THE 2026 全球 200 强大学主题上线，底座架构就绪。

### ✨ 核心功能

- 🌐 **3D 可旋转数字地球**：NASA Blue Marble 5400×2700 全分辨率贴图 + 地形凹凸图 + 大气层
- 🎓 **THE 2026 全球 200 强大学** + 32 个主要城市
- 🏷️ **按排名 4 档着色**：Top 10 金 / 11-50 橙 / 51-100 蓝 / 101-200 灰
- 📖 **维基百科中英双语详情**：摘要 + 校园/校徽图 + 原文链接
- 📊 **THE 分项评分进度条**：综合 / 教学 / 科研 / 引用

### 🎯 交互

- 🖱️ **点击 marker 飞行定位** + 右侧抽屉
- 🔍 **搜索框**：大学/城市/国家 + 知名缩写（MIT/ETH/NUS/USTC/Caltech 等）
- ✨ **搜索后高亮引导**：飞到目标 + 金色高亮 + "点击查看详情"提示
- 🌗 **中英语言切换**、🔗 **深度链接**（`?uni=` / `?view=` / `?highlight=`）
- 📱 **移动端自适应**：bottom sheet + 紧凑顶栏 + 触摸降速

### 🏗 底座架构

- `src/core/`：globe / drawer / i18n / filter / search / wikipedia API
- `src/themes/universities/`：大学主题参考实现（Theme<T> 接口）
- 未来主题（灾害/人口/战争/矿产/艺术/古迹）可复用 90% 基建

### 🛠 技术

- three-globe + OrbitControls + CSS2DRenderer（跳过 globe.gl wrapper 避开 Vite8 bug）
- 背面 marker 自动隐藏 / 同区域 3D 扇形展开 / 视角 localStorage 记忆
- Docker + nginx 部署（Railway）

### 🌍 部署

- GitHub：https://github.com/historyreview-code/digital-earth
- 线上：https://web-production-c7ea8.up.railway.app

### 📊 数据

- THE World University Rankings 2026（rank_order 前 200）
- Wikipedia REST API（真实坐标 + 中文名）
- NASA Visible Earth（公共域贴图）
