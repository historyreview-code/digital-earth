/**
 * 底座通用搜索框
 * - 输入时实时过滤: 大学/城市/国家
 * - 上下键选择 + 回车确认 / 点击
 * - 选中回调 (由调用者负责 flyTo + 开抽屉)
 */

export interface SearchableItem {
  id: string;
  /** 显示名 (跟随当前语言) */
  name: string;
  /** 次要信息 (排名/国家/类型) */
  meta: string;
  /** 用于匹配的文本 (中英名 + 国家 + 别名) */
  haystack: string;
}

export interface SearchController {
  el: HTMLElement;
  input: HTMLInputElement;
  results: HTMLElement;
  /** 渲染候选列表 */
  setItems(items: SearchableItem[]): void;
  /** 选中回调 */
  onSelect(cb: (item: SearchableItem) => void): void;
  destroy(): void;
}

export function createSearchBox(): SearchController {
  const el = document.getElementById("search-box") as HTMLElement;
  const input = document.getElementById("search-input") as HTMLInputElement;
  const results = document.getElementById("search-results") as HTMLElement;

  let items: SearchableItem[] = [];
  let selectCb: ((item: SearchableItem) => void) | null = null;
  let activeIdx = -1;

  function filter(query: string): SearchableItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter((it) => it.haystack.toLowerCase().includes(q))
      .slice(0, 8);
  }

  function renderList(list: SearchableItem[]): void {
    results.replaceChildren();
    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.textContent = "无匹配结果";
      results.append(empty);
      results.classList.remove("hidden");
      activeIdx = -1;
      return;
    }
    list.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "search-item";
      row.dataset.idx = String(idx);
      row.innerHTML = "";
      const rank = document.createElement("span");
      rank.className = "si-rank";
      rank.textContent = item.meta;
      const name = document.createElement("span");
      name.className = "si-name";
      name.textContent = item.name;
      row.append(rank, name);
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectCb?.(item);
        hide();
      });
      results.append(row);
    });
    activeIdx = -1;
    results.classList.remove("hidden");
  }

  function highlight(idx: number): void {
    const rows = results.querySelectorAll<HTMLElement>(".search-item");
    rows.forEach((r, i) => r.classList.toggle("active", i === idx));
    activeIdx = idx;
  }

  function hide(): void {
    results.classList.add("hidden");
    activeIdx = -1;
  }

  input.addEventListener("input", () => {
    const list = filter(input.value);
    renderList(list);
  });

  input.addEventListener("focus", () => {
    const list = filter(input.value);
    if (list.length) renderList(list);
  });

  input.addEventListener("keydown", (e) => {
    const rows = results.querySelectorAll<HTMLElement>(".search-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlight(Math.min(activeIdx + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlight(Math.max(activeIdx - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < rows.length) {
        const item = filter(input.value)[activeIdx];
        if (item) {
          selectCb?.(item);
          hide();
        }
      }
    } else if (e.key === "Escape") {
      hide();
      input.blur();
    }
  });

  document.addEventListener("click", (e) => {
    if (!el.contains(e.target as Node)) hide();
  });

  return {
    el,
    input,
    results,
    setItems: (list) => {
      items = list;
    },
    onSelect: (cb) => {
      selectCb = cb;
    },
    destroy: () => {
      // listeners bound to DOM, GC handles
    },
  };
}