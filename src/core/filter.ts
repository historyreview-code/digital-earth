/**
 * 底座通用筛选条
 * - 渲染一组按钮 (根据 ThemeFilter[])
 * - 回调当前激活的 key (default: 'all')
 */

import type { ThemeFilter } from "./types";
import { getLanguage } from "./i18n";

export interface FilterController {
  el: HTMLElement;
  getActive: () => string;
  onChange: (cb: (key: string) => void) => void;
  render(filters: ThemeFilter[]): void;
}

export function createFilterBar(elementId = "filter-bar"): FilterController {
  const el = document.getElementById(elementId) as HTMLElement;
  if (!el) throw new Error(`[filter] #${elementId} missing`);

  let active = "all";
  const cbs: Array<(k: string) => void> = [];

  function renderActive(): void {
    el.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((b) => {
      b.classList.toggle("active", b.dataset.filter === active);
    });
  }

  el.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest("[data-filter]");
    if (!target) return;
    const k = (target as HTMLElement).dataset.filter!;
    if (k && k !== active) {
      active = k;
      renderActive();
      cbs.forEach((cb) => cb(active));
    }
  });

  function render(filters: ThemeFilter[]): void {
    el.replaceChildren();
    const lang = getLanguage();
    filters.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.filter = f.key;
      btn.textContent = f.label[lang];
      if (f.key === active) btn.classList.add("active");
      el.appendChild(btn);
    });
  }

  return {
    el,
    getActive: () => active,
    onChange: (cb) => cbs.push(cb),
    render,
  };
}