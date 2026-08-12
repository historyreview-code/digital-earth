/**
 * 数字地球可视化底座 · 核心类型
 * 主题 (theme) 通过实现以下接口接入底座
 */

/** 一个可在地球上展示的点 (lat/lng 是必填) */
export interface MarkerItem {
  /** 主题内唯一标识, 用于事件和缓存 */
  id: string;
  /** 维度 (-90 ~ 90) */
  lat: number;
  /** 经度 (-180 ~ 180) */
  lng: number;
  /** 可选的高度 (globe radii 单位, 0=贴地) 用于同区域垂直分层 */
  altitude?: number;
}

/** 多语言字符串, 同时给出中英两种 */
export interface Bilingual {
  en: string;
  zh: string;
}

/** 通用筛选器配置 (用于顶栏按钮组) */
export interface ThemeFilter {
  /** 唯一 key */
  key: string;
  /** 显示名 (多语言) */
  label: Bilingual;
  /** 筛选函数: true 表示保留 */
  match: (item: MarkerItem) => boolean;
}

/** 通用图例项 (用于底部图例) */
export interface LegendItem {
  /** 标签 (多语言) */
  label: Bilingual;
  /** 视觉表示 (CSS) */
  swatch:
    | "dot-gold"
    | "dot-orange"
    | "dot-blue"
    | "dot-slate"
    | "ring-blue"
    | "ring-purple"
    | "ring-cyan";
}

/** 主题元数据 */
export interface ThemeMeta {
  /** 主题 ID, 用于 URL ?theme=xxx */
  id: string;
  /** 主题名 */
  name: Bilingual;
  /** 主题副标题 */
  subtitle: Bilingual;
}

/** 主题完整定义: 数据 + 视觉 + 行为 */
export interface Theme<T extends MarkerItem> extends ThemeMeta {
  /** 所有 marker 数据 (主题接管) */
  markers: T[];
  /** 可选: 附属图层 (城市、边界等), 由主题自己渲染 */
  overlays?: MarkerItem[];
  /** 顶栏筛选配置 */
  filters?: ThemeFilter[];
  /** 底部图例配置 */
  legend?: LegendItem[];
  /** 点击 marker 时返回该 marker 的可读信息 (供 drawer 使用) */
  describeMarker(item: T, lang: "en" | "zh"): {
    title: string;
    subtitle?: string;
    meta?: string;
    image?: string;
    description?: string;
    website?: string;
    wikiUrl?: string;
    rank?: number;
  };
  /** 抽屉 CTA 按钮列表 */
  ctas?: Array<{ label: Bilingual; url: string }>;
}

/** 主题注册表 */
export type ThemeRegistry = Record<string, Theme<MarkerItem>>;