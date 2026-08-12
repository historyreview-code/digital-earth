import type { WikiSummary } from "./wikipedia-types";
import type { Language as WikiLanguage } from "../i18n";

/**
 * 维基百科 REST page/summary 客户端
 * - 浏览器直连, CORS 已开放
 * - 内存缓存按 (lang, title) 做 key, 避免重复请求
 */

const cache = new Map<string, WikiSummary>();

function cacheKey(lang: WikiLanguage, title: string): string {
  return `${lang}:${title}`;
}

function wikiDomain(lang: WikiLanguage): string {
  return lang === "zh" ? "zh.wikipedia.org" : "en.wikipedia.org";
}

export async function getWikipediaSummary(
  title: string,
  lang: WikiLanguage,
): Promise<WikiSummary | null> {
  const normalized = title.trim().replaceAll(" ", "_");
  const key = cacheKey(lang, normalized);
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const url = `https://${wikiDomain(lang)}/api/rest_v1/page/summary/${encodeURIComponent(normalized)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Wikipedia ${res.status}`);
    }
    const data = (await res.json()) as WikiSummary;
    cache.set(key, data);
    return data;
  } catch (err) {
    console.error("[wiki] fetch failed:", err);
    return null;
  }
}

/**
 * 双语 fallback: 当前语言拿不到时自动切到另一语言
 */
export async function getBilingualSummary(
  titleEn: string,
  titleZh: string,
  lang: WikiLanguage,
): Promise<{ summary: WikiSummary; actualLang: WikiLanguage } | null> {
  const preferred = await getWikipediaSummary(
    lang === "zh" ? titleZh : titleEn,
    lang,
  );
  if (preferred) {
    return { summary: preferred, actualLang: lang };
  }
  const fallbackLang: WikiLanguage = lang === "zh" ? "en" : "zh";
  const fallbackTitle = lang === "zh" ? titleEn : titleZh;
  const fallback = await getWikipediaSummary(fallbackTitle, fallbackLang);
  if (fallback) {
    return { summary: fallback, actualLang: fallbackLang };
  }
  return null;
}

/** 调试用: 清空缓存 */
export function clearWikiCache(): void {
  cache.clear();
}