/**
 * 大学主题 - HTML Element marker 视觉
 * 大学 + 城市 marker 都用 CSS2DObject (HTML elements layer)
 * - 大学校 marker: 按排名配色, hover 显示名字
 * - 城市 marker: 按类型配色, hover 显示名字
 */

import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { University, MajorCity } from "./types";
import { getName } from "./types";
import type { Language } from "../../core/i18n";

/**
 * 同区域大学的视觉错开策略
 * 按 ~1° 网格粗聚类, 同城内多校按 rank 排序后:
 *   1) 垂直分层 (altitude +0.015 per i)
 *   2) 扇形水平错开 (CSS transform rotate)
 * 保证任意缩放级别下都不重叠
 */

interface ClusteredUniversity extends University {
  _clusterId: string;
  _angleRad: number;
  _altitudeOffset: number;
  /** 同区域大学沿切向扇形展开的角度 (rad) */
  _clusterAngle?: number;
  /** 同区域大学沿切向扇形展开的距离 (rad) */
  _clusterSpread?: number;
}

export const clusteredUniversities: ClusteredUniversity[] = []; // 由 theme.ts 在加载 universitiesData 后填充

function rankClass(rank: number): string {
  if (rank <= 10) return "uni-rank-top10";
  if (rank <= 50) return "uni-rank-top50";
  if (rank <= 100) return "uni-rank-top100";
  return "uni-rank-rest";
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * 大学 marker DOM 生成
 */
function makeUniversityMarker(u: ClusteredUniversity, lang: Language): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `uni-marker ${rankClass(u.rank)}`;
  el.dataset.rank = String(u.rank);
  el.dataset.univId = String(u.rank);

  const name = escapeHtml(getName(u, lang));
  el.innerHTML = `
    <div class="uni-dot"></div>
    <div class="uni-pulse"></div>
    <div class="uni-label">
      <span class="uni-label-rank">#${u.rank}</span>
      <span class="uni-label-name">${name}</span>
    </div>
  `;

  // 位置错开由 globe.ts 通过 Three.js 沿切向推完成
  // 这里保持 DOM 默认 transform (-50%, -50% 居中)

  return el;
}

/**
 * 城市 marker DOM 生成
 */
function makeCityMarker(c: MajorCity, lang: Language): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `city-marker city-${c.type}`;
  el.dataset.cityId = `${c.lat.toFixed(2)}_${c.lng.toFixed(2)}`;
  const color =
    c.type === "capital" ? "#60a5fa" : c.type === "megacity" ? "#c084fc" : "#34d399";
  const name = escapeHtml(lang === "zh" ? c.nameZh : c.nameEn);
  el.innerHTML = `
    <div class="city-ring" style="--city-color: ${color}"></div>
    <div class="city-center" style="background: ${color}"></div>
    <div class="city-label" style="--city-color: ${color}">${name}</div>
  `;
  return el;
}

/**
 * 创建 CSS2DObject - 大学
 */
export function createUniversityObject(u: ClusteredUniversity, lang: Language): CSS2DObject {
  const el = makeUniversityMarker(u, lang);
  const obj = new CSS2DObject(el);
  obj.userData = { kind: "university", id: u.id, item: u };
  return obj;
}

/**
 * 创建 CSS2DObject - 城市
 */
export function createCityObject(c: MajorCity, lang: Language): CSS2DObject {
  const el = makeCityMarker(c, lang);
  const obj = new CSS2DObject(el);
  obj.userData = { kind: "city", id: c.id, item: c };
  return obj;
}

/**
 * 轻量更新 marker label (语言切换时复用 DOM, 不重建)
 * 返回 true 表示已更新, false 表示找不到对应 label
 */
export function updateUniversityMarkerLabel(
  obj: CSS2DObject,
  u: ClusteredUniversity,
  lang: Language,
): void {
  const nameEl = obj.element?.querySelector(".uni-label-name");
  if (nameEl) nameEl.textContent = getName(u, lang);
}

export function updateCityMarkerLabel(
  obj: CSS2DObject,
  c: MajorCity,
  lang: Language,
): void {
  const nameEl = obj.element?.querySelector(".city-label");
  if (nameEl) nameEl.textContent = lang === "zh" ? c.nameZh : c.nameEn;
}

export type { ClusteredUniversity };