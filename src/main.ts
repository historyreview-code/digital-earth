/**
 * 数字地球可视化底座 · 主入口
 *
 * 流程:
 *   1. 读 URL ?theme=<id> → 从 themeRegistry 取主题
 *   2. 装配: globe (底座) + drawer (底座) + filter (底座) + lang switch
 *   3. 主题提供 data + marker visual + overlay visual + detail renderer
 *   4. 点击 marker → 主题 detail loader → drawer 渲染
 *   5. 语言切换 → globe markers 重建 + drawer 重新渲染
 */

import "./core/styles.css";
import "./themes/universities/styles.css";

import { createGlobe } from "./core/globe";
import { createDrawer, type DrawerController } from "./core/drawer";
import { createFilterBar, type FilterController } from "./core/filter";
import { createSearchBox, type SearchableItem } from "./core/search";
import { createTimeline } from "./core/timeline";
import { getLanguage, setLanguage, subscribeLanguage, type Language } from "./core/i18n";
import { themeRegistry, themeExtras, defaultThemeId } from "./themes";
import {
  loadUniversityDetail,
  loadCityDetail,
} from "./themes/universities/detail";
import {
  universitiesClustered,
  filterUniversitiesByKey,
} from "./themes/universities/theme";
import { majorCities } from "./themes/universities/data";
import type { Theme } from "./core/types";
import type { University, MajorCity } from "./themes/universities/types";
import type { GlobeController, MarkerVisualConfig, OverlayVisualConfig } from "./core/globe";

function getActiveTheme(): Theme<University> {
  const url = new URL(window.location.href);
  const themeId = url.searchParams.get("theme") ?? defaultThemeId;
  const theme = themeRegistry[themeId];
  if (!theme) {
    console.warn(`[main] theme '${themeId}' not found, fallback to '${defaultThemeId}'`);
    return themeRegistry[defaultThemeId] as Theme<University>;
  }
  return theme as Theme<University>;
}

function applyTopbarText(theme: Theme<University>): void {
  const lang = getLanguage();
  const titleEl = document.getElementById("app-title");
  const subtitleEl = document.getElementById("app-subtitle");
  if (titleEl) titleEl.textContent = theme.name[lang];
  if (subtitleEl) subtitleEl.textContent = theme.subtitle[lang];
}

function renderLegend(theme: Theme<University>): void {
  const lang = getLanguage();
  const main = document.getElementById("legend-main");
  if (!main || !theme.legend) return;
  main.replaceChildren();
  const group = document.createElement("div");
  group.style.display = "flex";
  group.style.gap = "14px";
  group.style.flexWrap = "wrap";
  theme.legend.forEach((item) => {
    const span = document.createElement("span");
    const sw = document.createElement("i");
    sw.className = item.swatch;
    span.append(sw, document.createTextNode(item.label[lang]));
    group.append(span);
  });
  main.append(group);
}

function bootstrap(): void {
  // 调试错误 (写到 DOM 上)
  window.addEventListener("error", (e) => {
    const div = document.createElement("div");
    div.style.cssText =
      "position:fixed;top:60px;left:12px;background:red;color:white;padding:8px;font-size:11px;z-index:9999;max-width:600px;font-family:monospace;";
    div.textContent = `WIN ERR: ${e.message} @ ${e.filename}:${e.lineno}`;
    document.body.appendChild(div);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string };
    const div = document.createElement("div");
    div.style.cssText =
      "position:fixed;top:80px;left:12px;background:red;color:white;padding:8px;font-size:11px;z-index:9999;max-width:600px;font-family:monospace;";
    div.textContent = `REJ: ${r?.message || String(e.reason)}`;
    document.body.appendChild(div);
  });

  const theme = getActiveTheme();
  applyTopbarText(theme);
  renderLegend(theme);

  // === localStorage 视角持久化 ===
  // 用户每次访问地球看到的视角一致 (包括 reload 后), 由 localStorage 记住
  const POV_STORAGE_KEY = "globe_explorer:pov";
  function loadSavedPOV(): { lat: number; lng: number; altitude: number } | null {
    try {
      const raw = localStorage.getItem(POV_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.lat === "number" &&
        typeof parsed.lng === "number" &&
        typeof parsed.altitude === "number" &&
        parsed.lat >= -90 &&
        parsed.lat <= 90 &&
        parsed.lng >= -180 &&
        parsed.lng <= 180 &&
        parsed.altitude > 0
      ) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  let saveThrottleTimer: number | null = null;
  function savePOVThrottled(lat: number, lng: number, altitude: number): void {
    // 首调立即存 (避免 throttle 把首次保存推到 500ms 后用户关闭页面丢失)
    if (saveThrottleTimer === null) {
      try {
        localStorage.setItem(
          POV_STORAGE_KEY,
          JSON.stringify({ lat, lng, altitude }),
        );
        console.log("[globe_explorer] POV saved:", lat.toFixed(1), lng.toFixed(1), altitude.toFixed(2));
      } catch {
        /* localStorage 不可用时静默 */
      }
      saveThrottleTimer = window.setTimeout(() => {
        saveThrottleTimer = null;
      }, 500);
    }
    // throttle 期间的后续调用直接丢弃 - 拖动结束时 controls.change 还会 fire 一次
  }

  // === Lang switch ===
  document.getElementById("lang-switch")?.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-lang]");
    if (!target) return;
    const lang = (target as HTMLElement).dataset.lang as Language | undefined;
    if (lang) setLanguage(lang);
  });

  // === Filter ===
  const filter: FilterController = createFilterBar();
  if (theme.filters && theme.filters.length > 0) {
    filter.render(theme.filters);
  }

  // === Globe (需要先建, 再绑定 onMarkerClick 因为要用到 drawer + flyTo) ===
  const container = document.getElementById("globe")!;
  let lastSelected: University | MajorCity | null = null;

  const drawer: DrawerController = createDrawer();
  drawer.bindEsc();

  // === URL 深度链接 ===
  // 支持 ?uni=<rank> 直达某所大学 (刷新/分享可恢复抽屉)
  // 同时支持 ?view=lat,lng,altitude 自定义初始视角
  function readDeepLink(): { uniRank?: number; pov?: { lat: number; lng: number; altitude: number } } {
    const url = new URL(window.location.href);
    const result: { uniRank?: number; pov?: { lat: number; lng: number; altitude: number } } = {};
    const uniParam = url.searchParams.get("uni");
    if (uniParam && /^\d+$/.test(uniParam)) {
      const rank = Number(uniParam);
      if (rank >= 1 && rank <= universitiesClustered.length) result.uniRank = rank;
    }
    const viewParam = url.searchParams.get("view");
    if (viewParam) {
      const parts = viewParam.split(",").map(Number);
      if (
        parts.length === 3 &&
        parts.every(Number.isFinite) &&
        parts[0] >= -90 && parts[0] <= 90 &&
        parts[1] >= -180 && parts[1] <= 180 &&
        parts[2] > 0
      ) {
        result.pov = { lat: parts[0], lng: parts[1], altitude: parts[2] };
      }
    }
    return result;
  }

  // 点击 marker 后更新 URL (支持分享)
  function updateUrlForSelected(id: string): void {
    const url = new URL(window.location.href);
    if (id.startsWith("uni-")) {
      url.searchParams.set("uni", id.slice(4));
    } else {
      url.searchParams.delete("uni");
    }
    window.history.replaceState(null, "", url.toString());
  }

  // 默认初始视角: 北非上空 (lat=20, lng=20)
  // 这样首次加载能同时看到 北美(偏左) + 欧洲(中央) + 亚洲(偏右)
  // (100所大学中70%+都在这一面)
  // 优先级: ?view= 参数 > localStorage > 默认
  const DEFAULT_POV = { lat: 20, lng: 20, altitude: 2.2 };
  const deepLink = readDeepLink();
  const initialPOV = deepLink.pov ?? loadSavedPOV() ?? DEFAULT_POV;
  console.log("[globe_explorer] initial POV:", initialPOV);

  const globe: GlobeController = createGlobe({
    container,
    globeImageUrl: "/assets/earth-topo.jpg",
    bumpImage: "/assets/earth-topology.png", // 地形凹凸图, 提升地貌立体感
    backgroundColor: "#020617",
    initialPointOfView: initialPOV,
    onMarkerClick: (id: string) => {
      updateUrlForSelected(id);
      // 点击 marker 打开详情: 清除高亮 + 隐藏引导提示
      globe.highlightMarker(null);
      const hint = document.getElementById("highlight-hint");
      if (hint) hint.classList.add("hidden");
      if (id.startsWith("uni-")) {
        const rank = Number(id.slice(4));
        const uni = universitiesClustered.find((u) => u.rank === rank);
        if (uni) {
          lastSelected = uni as unknown as University;
          void loadUniversityDetail(drawer, lastSelected, (lat, lng) =>
            globe.flyTo(lat, lng),
          );
        }
      } else {
        const [latS, lngS] = id.split("_");
        const lat = Number(latS);
        const lng = Number(lngS);
        const city = (theme.overlays ?? []).find(
          (c) =>
            (c as MajorCity).lat.toFixed(2) === lat.toFixed(2) &&
            (c as MajorCity).lng.toFixed(2) === lng.toFixed(2),
        );
        if (city) {
          lastSelected = city as unknown as MajorCity;
          loadCityDetail(drawer, lastSelected);
          globe.flyTo((city as MajorCity).lat, (city as MajorCity).lng, 0.3);
        }
      }
    },
  });

  // === 搜索框 ===
  // 知名学校缩写别名 (搜索更友好)
  const ALIASES: Record<string, string> = {
    "Massachusetts Institute of Technology": "MIT",
    "University of Oxford": "Oxford",
    "University of Cambridge": "Cambridge",
    "University of California, Berkeley": "UC Berkeley",
    "University of California, Los Angeles": "UCLA",
    "University of California, San Diego": "UCSD",
    "California Institute of Technology": "Caltech",
    "ETH Zurich": "ETH",
    "National University of Singapore": "NUS",
    "Nanyang Technological University, Singapore": "NTU",
    "UCL": "UCL",
    "London School of Economics and Political Science": "LSE",
    "Imperial College London": "Imperial",
    "The University of Tokyo": "UTokyo",
    "Georgia Institute of Technology": "Georgia Tech",
    "Tsinghua University": "THU",
    "Peking University": "PKU",
    "University of Hong Kong": "HKU",
    "The Chinese University of Hong Kong": "CUHK",
    "Zhejiang University": "ZJU",
    "Fudan University": "复旦",
    "Shanghai Jiao Tong University": "SJTU",
    "University of Science and Technology of China": "USTC",
    "Korea Advanced Institute of Science and Technology": "KAIST",
    "Yonsei University (Seoul campus)": "Yonsei",
    "Sungkyunkwan University (SKKU)": "SKKU",
  };
  const searchItems: SearchableItem[] = [
    ...universitiesClustered.map((u) => ({
      id: u.id,
      name: getLanguage() === "zh" ? u.nameZh : u.nameEn,
      meta: `#${u.rank}`,
      haystack: `${u.nameEn} ${u.nameZh} ${u.countryEn} ${u.countryZh} rank${u.rank} ${ALIASES[u.nameEn] ?? ""}`,
    })),
    ...majorCities.map((c) => ({
      id: c.id,
      name: getLanguage() === "zh" ? c.nameZh : c.nameEn,
      meta: getLanguage() === "zh" ? (c.type === "capital" ? "首都" : c.type === "megacity" ? "大城市" : "科技中心") : c.type,
      haystack: `${c.nameEn} ${c.nameZh} ${c.type} city`,
    })),
  ];
  const search = createSearchBox();
  search.setItems(searchItems);
  // 高亮引导提示: 显示 4 秒后自动消失
  let hintTimer: number | null = null;
  function showHighlightHint(): void {
    const hint = document.getElementById("highlight-hint");
    if (hint) hint.classList.remove("hidden");
    if (hintTimer !== null) window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
      const h = document.getElementById("highlight-hint");
      if (h) h.classList.add("hidden");
    }, 4000);
  }
  search.onSelect((item) => {
    // 飞向目标 + 高亮 marker + 提示点击 (不直接开抽屉, 引导用户发现)
    if (item.id.startsWith("uni-")) {
      const rank = Number(item.id.slice(4));
      const uni = universitiesClustered.find((u) => u.rank === rank);
      if (uni) {
        lastSelected = uni as unknown as University;
        globe.flyTo(uni.lat, uni.lng, 0.35);
        globe.highlightMarker(item.id);
        showHighlightHint();
      }
    } else {
      const city = majorCities.find((c) => c.id === item.id);
      if (city) {
        lastSelected = city as unknown as MajorCity;
        globe.flyTo(city.lat, city.lng, 0.3);
        globe.highlightMarker(item.id);
        showHighlightHint();
      }
    }
  });

  // === 初始 marker ===
  refreshGlobe(globe, theme, filter.getActive());

  // === 深度链接: 自动打开 ?uni= 指定的大学 ===
  if (deepLink.uniRank) {
    const uni = universitiesClustered.find((u) => u.rank === deepLink.uniRank);
    if (uni) {
      // 等贴图 + marker 渲染完成再飞行/开抽屉 (避免被 init flyTo 覆盖)
      setTimeout(() => {
        lastSelected = uni as unknown as University;
        void loadUniversityDetail(drawer, lastSelected, (lat, lng) =>
          globe.flyTo(lat, lng, 0.4),
        );
      }, 600);
    }
  }

  // === 深度链接: ?highlight=<rank> 自动高亮某个大学 (分享/演示/测试用) ===
  const urlParams = new URL(window.location.href).searchParams;
  const highlightRankParam = urlParams.get("highlight");
  if (highlightRankParam && /^\d+$/.test(highlightRankParam)) {
    const uni = universitiesClustered.find((u) => u.rank === Number(highlightRankParam));
    if (uni) {
      setTimeout(() => {
        globe.flyTo(uni.lat, uni.lng, 0.35);
        globe.highlightMarker(uni.id);
        showHighlightHint();
      }, 700);
    }
  }

  // === 相机变化持久化 (用户拖动地球后记住位置) ===
  globe.onCameraChange(({ lat, lng, altitude }) => {
    savePOVThrottled(lat, lng, altitude);
  });

  // === 底座时间滑块 (V2 第1步: 独立组件, 未来地震主题联动) ===
  // 第1步交付: 滑块可见可交互可播放, 时间标签滚动即验证组件工作
  // 第2步 (地震主题): onChange 里按 item.time 过滤 markers
  const tl = createTimeline();
  {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 3600 * 1000;
    tl.setRange(weekAgo, now);
    tl.play(); // 自动播放展示时间流逝
    tl.onChange((t, isPlaying) => {
      // 调试: 打印当前时间 (未来地震主题在此联动 markers)
      console.log(`[timeline] t=${new Date(t).toISOString()} playing=${isPlaying}`);
    });
  }

  // === Filter 绑定 ===
  filter.onChange((key) => {
    refreshGlobe(globe, theme, key);
  });

  // === 语言切换重渲染 ===
  subscribeLanguage(() => {
    applyTopbarText(theme);
    renderLegend(theme);
    if (theme.filters) filter.render(theme.filters);
    refreshGlobe(globe, theme, filter.getActive());
    // 搜索索引随语言刷新
    search.setItems(
      [
        ...universitiesClustered.map((u) => ({
          id: u.id,
          name: getLanguage() === "zh" ? u.nameZh : u.nameEn,
          meta: `#${u.rank}`,
          haystack: `${u.nameEn} ${u.nameZh} ${u.countryEn} ${u.countryZh} rank${u.rank} ${ALIASES[u.nameEn] ?? ""}`,
        })),
        ...majorCities.map((c) => ({
          id: c.id,
          name: getLanguage() === "zh" ? c.nameZh : c.nameEn,
          meta: getLanguage() === "zh" ? (c.type === "capital" ? "首都" : c.type === "megacity" ? "大城市" : "科技中心") : c.type,
          haystack: `${c.nameEn} ${c.nameZh} ${c.type} city`,
        })),
      ],
    );
    const input = document.getElementById("search-input") as HTMLInputElement | null;
    if (input) {
      input.placeholder = getLanguage() === "zh" ? "搜索大学 / 城市 / 国家…" : "Search university / city / country…";
    }
    if (drawer.isOpen() && lastSelected) {
      if ("rank" in lastSelected) {
        void loadUniversityDetail(drawer, lastSelected, (lat, lng) => globe.flyTo(lat, lng));
      } else {
        loadCityDetail(drawer, lastSelected);
      }
    }
  });

  console.log(
    `[globe_explorer] theme=${theme.id}, markers=${universitiesClustered.length}, overlays=${theme.overlays?.length ?? 0}`,
  );
}

function refreshGlobe(globe: GlobeController, theme: Theme<University>, filterKey: string): void {
  const lang = getLanguage();
  const filtered = filterUniversitiesByKey(universitiesClustered, filterKey);
  const markerVisual = themeExtras.universities.markerVisual as MarkerVisualConfig<typeof filtered[number]>;
  globe.setMarkers(filtered, markerVisual, lang);
  if (theme.overlays && theme.overlays.length > 0) {
    const overlayVisual = themeExtras.universities.overlayVisual as OverlayVisualConfig<MajorCity>;
    globe.setOverlays(theme.overlays as unknown as MajorCity[], overlayVisual, lang);
  }
}

// 抑制 unused warning
void (undefined as unknown);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}