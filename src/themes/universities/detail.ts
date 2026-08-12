/**
 * 大学主题 - 抽屉详情渲染
 * 加载维基 REST summary, 渲染标题 + 排名 + 国家 + 图 + 摘要 + CTA
 */

import type { University } from "./types";
import { getCountry, getName } from "./types";
import { getBilingualSummary } from "../../core/api/wikipedia";
import { getLanguage, subscribeLanguage, trBase } from "../../core/i18n";
import type { DrawerController } from "../../core/drawer";

export async function loadUniversityDetail(
  drawer: DrawerController,
  uni: University,
  flyTo: (lat: number, lng: number) => void,
): Promise<void> {
  drawer.showLoading(`#${uni.rank} ${getName(uni, getLanguage())}`, getCountry(uni, getLanguage()));
  flyTo(uni.lat, uni.lng);

  const lang = getLanguage();
  const result = await getBilingualSummary(uni.wikiTitleEn, uni.wikiTitleZh, lang);
  if (!result) {
    drawer.showError(trBase("noSummary"));
    return;
  }

  const fragment = document.createDocumentFragment();
  const s = result.summary;
  const actualLang = result.actualLang;

  // 排名徽章
  const rank = document.createElement("div");
  rank.className = "rank-badge";
  rank.textContent = String(uni.rank);
  fragment.append(rank);

  // 标题
  const title = document.createElement("h2");
  title.textContent = s.title;
  fragment.append(title);

  // 国家
  const country = document.createElement("p");
  country.className = "meta";
  country.textContent = getCountry(uni, actualLang);
  fragment.append(country);

  // 描述 (一行)
  if (s.description) {
    const desc = document.createElement("p");
    desc.className = "description";
    desc.textContent = s.description;
    fragment.append(desc);
  }

  // 图片 (骨架屏占位 + onerror 兜底)
  const imageUrl = s.originalimage?.source ?? s.thumbnail?.source;
  if (imageUrl) {
    const figure = document.createElement("figure");
    figure.className = "figure-loading"; // 骨架屏态
    const skel = document.createElement("div");
    skel.className = "figure-skeleton";
    figure.append(skel);

    const img = document.createElement("img");
    img.alt = s.title;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.src = imageUrl;
    // 加载完成: 移除骨架屏 + 淡入
    img.addEventListener("load", () => {
      figure.classList.remove("figure-loading");
      img.classList.add("img-loaded");
      skel.remove();
    });
    // 加载失败: 显示占位图标
    img.addEventListener("error", () => {
      figure.classList.remove("figure-loading");
      figure.classList.add("figure-error");
      skel.remove();
      figure.dataset.fallback = "true";
    });
    figure.append(img);
    fragment.append(figure);
  }

  // 摘要
  const extractText = (s.extract ?? "").trim();
  const extract = document.createElement("p");
  extract.className = "extract";
  extract.textContent = extractText || trBase("noSummary");
  fragment.append(extract);

  // CTA 按钮组
  const ctaGroup = document.createElement("div");
  ctaGroup.className = "cta-group";

  if (uni.website) {
    const a = document.createElement("a");
    a.className = "cta";
    a.href = uni.website;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = `🌐 ${trBase("visitWebsite")}`;
    ctaGroup.append(a);
  }

  const wikiPage = s.content_urls?.desktop?.page;
  if (wikiPage) {
    const a = document.createElement("a");
    a.className = "cta cta-secondary";
    a.href = wikiPage;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = `📖 ${trBase("readOnWikipedia")}`;
    ctaGroup.append(a);
  }

  fragment.append(ctaGroup);

  // 维基出处声明
  const attr = document.createElement("p");
  attr.className = "attribution";
  attr.textContent = trBase("wikipediaAttribution");
  fragment.append(attr);

  drawer.showContent(fragment);
}

/**
 * 城市点击暂时只显示基本信息 (没维基)
 */
export function loadCityDetail(drawer: DrawerController, city: { nameEn: string; nameZh: string; type: string; population: string }): void {
  const lang = getLanguage();
  const name = lang === "zh" ? city.nameZh : city.nameEn;
  drawer.showLoading(name);

  const fragment = document.createDocumentFragment();

  const title = document.createElement("h2");
  title.textContent = name;
  fragment.append(title);

  const typeNames = { en: { capital: "Capital", megacity: "Megacity", "tech-hub": "Tech Hub" }, zh: { capital: "首都", megacity: "大城市", "tech-hub": "科技中心" } } as const;
  const typeName = typeNames[lang][city.type as keyof typeof typeNames.en];

  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${typeName} · 人口 ${city.population}`;
  fragment.append(meta);

  const desc = document.createElement("p");
  desc.className = "description";
  desc.textContent = lang === "zh"
    ? `这是${name},一个${typeName}。`
    : `${name} is a ${typeName.toLowerCase()}.`;
  fragment.append(desc);

  // 延迟显示, 让 loading 转一下
  setTimeout(() => drawer.showContent(fragment), 250);
}

// 语言切换时, 如果抽屉打开, 重新渲染当前内容
// 这里没有"当前 item"状态, 由 main.ts 协调
export { subscribeLanguage };