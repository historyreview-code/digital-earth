/**
 * 大学主题 - Theme<University> 实现
 * 这是底座的第一个参考实现, 展示如何接入主题 API
 */

import { universities as universitiesData } from "../../data/universities";
import { majorCities } from "./data";
import type { University, MajorCity } from "./types";
import { getCountry, getName } from "./types";
import {
  createUniversityObject,
  createCityObject,
  updateUniversityMarkerLabel,
  updateCityMarkerLabel,
  type ClusteredUniversity,
} from "./markers";
import type { Theme, MarkerItem } from "../../core/types";
import type { MarkerVisualConfig, OverlayVisualConfig } from "../../core/globe";

// 给 universities data 补 id
const universitiesWithId: University[] = universitiesData.map((u) => ({
  ...u,
  id: `uni-${u.rank}`,
}));

// 同区域大学聚类 (沿切向扇形展开 + 垂直分层)
// 大学按 ~1° 网格粗聚类, 同城多校:
//   1) 垂直分层 altitude (避免上下挤) - 0.025 globe radii per i
//   2) 切向扇形展开 (避免水平挤) - 沿"东向"推开 8km per i
// 这样 6 所同城(如 UC 系统) 在 3D 空间形成完美的 6 角分布
const CLUSTER_ALT_STEP = 0.025; // 0.025 globe radii ≈ 160km 垂直间距
const CLUSTER_SPREAD_KM = 8;     // 8km 水平间距 (在 6371km 地球 ≈ 0.00125 rad)
const CLUSTER_SPREAD_RAD = CLUSTER_SPREAD_KM / 6371;

function clusterUniversities(unis: University[]): ClusteredUniversity[] {
  const groups = new Map<string, University[]>();
  for (const u of unis) {
    const key = `${Math.round(u.lat)}_${Math.round(u.lng)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }
  const clustered: ClusteredUniversity[] = [];
  for (const [key, group] of groups) {
    if (group.length === 1) {
      clustered.push({
        ...group[0],
        _clusterId: key,
        _angleRad: 0,
        _altitudeOffset: 0.01,
      });
      continue;
    }
    group.sort((a, b) => a.rank - b.rank);
    const step = (Math.PI * 2) / group.length;
    group.forEach((u, i) => {
      clustered.push({
        ...u,
        _clusterId: key,
        _angleRad: i * step,
        _altitudeOffset: 0.01 + i * CLUSTER_ALT_STEP,
        // 给 globe.ts 用, 沿"东向"切线方向推开
        _clusterAngle: i * step,
        _clusterSpread: i * CLUSTER_SPREAD_RAD,
      } as ClusteredUniversity);
    });
  }
  return clustered;
}

// 导出聚类后的 universities (供 main.ts 直接 import)
export const universitiesClustered: ClusteredUniversity[] = clusterUniversities(universitiesWithId);

export function filterUniversitiesByKey(
  markers: ClusteredUniversity[],
  key: string,
): ClusteredUniversity[] {
  if (key === "all") return markers;
  if (key === "top10") return markers.filter((u) => u.rank <= 10);
  if (key === "top50") return markers.filter((u) => u.rank <= 50);
  if (key === "top100") return markers.filter((u) => u.rank <= 100);
  return markers;
}

const cityMarkers: MajorCity[] = majorCities;

// 动态数量: 从数据推断 (100 或 200)
const totalUniversities = universitiesWithId.length;

export const universitiesTheme: Theme<University> = {
  id: "universities",
  name: {
    en: `Global Top ${totalUniversities} Universities`,
    zh: `全球 ${totalUniversities} 强大学`,
  },
  subtitle: { en: "Based on THE World University Rankings 2026", zh: "基于 THE 2026 世界大学排名" },

  markers: universitiesWithId,
  overlays: cityMarkers,

  filters: [
    {
      key: "all",
      label: { en: "All", zh: "全部" },
      match: () => true,
    },
    {
      key: "top10",
      label: { en: "Top 10", zh: "Top 10" },
      match: (u) => (u as University).rank <= 10,
    },
    {
      key: "top50",
      label: { en: "Top 50", zh: "Top 50" },
      match: (u) => (u as University).rank <= 50,
    },
    ...(totalUniversities > 100
      ? [
          {
            key: "top100",
            label: { en: "Top 100", zh: "Top 100" },
            match: (u: MarkerItem) => (u as University).rank <= 100,
          },
        ]
      : []),
  ],

  legend: [
    { label: { en: "Top 10", zh: "Top 10" }, swatch: "dot-gold" },
    { label: { en: "11–50", zh: "11–50" }, swatch: "dot-orange" },
    { label: { en: "51–100", zh: "51–100" }, swatch: "dot-blue" },
    ...(totalUniversities > 100
      ? ([{ label: { en: "101–200", zh: "101–200" }, swatch: "dot-slate" }] as const)
      : []),
    { label: { en: "Capital", zh: "首都" }, swatch: "ring-blue" },
    { label: { en: "Megacity", zh: "大城市" }, swatch: "ring-purple" },
    { label: { en: "Tech Hub", zh: "科技中心" }, swatch: "ring-cyan" },
  ],

  describeMarker(item, lang) {
    return {
      title: getName(item, lang),
      subtitle: `#${item.rank}`,
      meta: getCountry(item, lang),
      website: item.website,
      wikiUrl: undefined, // 由 detail.ts 异步加载维基时填入
      rank: item.rank,
    };
  },

  ctas: [
    { label: { en: "Visit Website", zh: "访问官网" }, url: "" },
    { label: { en: "Read on Wikipedia", zh: "在维基百科阅读" }, url: "" },
  ],
};

/**
 * 大学 marker视觉配置 (给底座 globe 调用)
 */
export const universitiesMarkerVisual: MarkerVisualConfig<ClusteredUniversity> = {
  createObject(item, lang) {
    return createUniversityObject(item, lang);
  },
  updateLabel(obj, item, lang) {
    updateUniversityMarkerLabel(obj, item, lang);
  },
  primary: "#fbbf24",
};

/**
 * 城市 overlay 视觉配置
 */
export const citiesOverlayVisual: OverlayVisualConfig<MajorCity> = {
  createObject(item, lang) {
    return createCityObject(item, lang);
  },
  updateLabel(obj, item, lang) {
    updateCityMarkerLabel(obj, item, lang);
  },
  zIndex: 1,
};