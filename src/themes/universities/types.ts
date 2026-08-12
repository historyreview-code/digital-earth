/**
 * 大学主题 - 数据契约
 * 继承底座 MarkerItem 接口, lat/lng 是必填
 */

import type { MarkerItem } from "../../core/types";

export interface University extends MarkerItem {
  /** THE 排名 1-100 */
  rank: number;
  /** 英文名 */
  nameEn: string;
  /** 中文名 */
  nameZh: string;
  /** 英文国家名 */
  countryEn: string;
  /** 中文国家名 */
  countryZh: string;
  /** 英文维基条目标题 */
  wikiTitleEn: string;
  /** 中文维基条目标题 */
  wikiTitleZh: string;
  /** Wikidata QID */
  wikidataQid?: string;
  /** THE 详情页 URL */
  website?: string;
}

export type CityType = "capital" | "megacity" | "tech-hub";

export interface MajorCity extends MarkerItem {
  country: string;
  nameEn: string;
  nameZh: string;
  type: CityType;
  population: string;
}

export function getName(u: University, lang: "en" | "zh"): string {
  return lang === "zh" ? u.nameZh : u.nameEn;
}
export function getCountry(u: University, lang: "en" | "zh"): string {
  return lang === "zh" ? u.countryZh : u.countryEn;
}
export function getWikiTitle(u: University, lang: "en" | "zh"): string {
  return lang === "zh" ? u.wikiTitleZh : u.wikiTitleEn;
}