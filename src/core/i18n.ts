/**
 * 底座通用语言状态 + 基础字典
 * 主题自带 Bilingual 字段, 不需要主题翻译注册
 */

export type Language = "en" | "zh";

let current: Language = "zh";
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  listeners.forEach((fn) => fn(current));
}

export function subscribeLanguage(fn: (lang: Language) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 底座通用 UI 字符串 (主题可扩展自己的字典)
 */
export const baseDict = {
  en: {
    appTitle: "Digital Earth",
    rankBadge: "Rank",
    noSummary: "No summary available.",
    visitWebsite: "Visit Website",
    readOnWikipedia: "Read on Wikipedia",
    wikipediaAttribution:
      "Content from Wikipedia (CC BY-SA 4.0). Click for full article.",
    loading: "Loading…",
    networkError: "Network error. Please retry.",
    languageLabel: "Language",
    themeLabel: "Theme",
  },
  zh: {
    appTitle: "数字地球",
    rankBadge: "排名",
    noSummary: "暂无摘要。",
    visitWebsite: "访问官网",
    readOnWikipedia: "在维基百科阅读",
    wikipediaAttribution: "内容来自维基百科(CC BY-SA 4.0),点击查看完整条目。",
    loading: "加载中…",
    networkError: "网络错误,请重试。",
    languageLabel: "语言",
    themeLabel: "主题",
  },
} as const;

export type BaseDictKey = keyof typeof baseDict.en;

export function trBase(key: BaseDictKey): string {
  return baseDict[current][key];
}