/**
 * 底座通用抽屉
 * - 桌面: 右侧滑出 panel
 * - 移动端: bottom sheet
 * - 内容由调用者提供 renderItem(item, container) 函数
 * - 状态由 drawer controller 管理 (open / close)
 */

export interface DrawerController {
  el: HTMLElement;
  content: HTMLElement;
  loading: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  showLoading(title: string, subtitle?: string): void;
  showContent(node: Node | string): void;
  showError(message: string): void;
  bindEsc(): void;
  destroy(): void;
}

export interface CreateDrawerOptions {
  /** 抽屉 DOM id (默认 'detail-drawer') */
  elementId?: string;
}

export function createDrawer(opts: CreateDrawerOptions = {}): DrawerController {
  const drawerId = opts.elementId ?? "detail-drawer";
  const loadingId = "detail-loading";
  const contentId = "detail-content";
  const closeId = "drawer-close";

  const el = document.getElementById(drawerId) as HTMLElement;
  const loading = document.getElementById(loadingId) as HTMLElement;
  const content = document.getElementById(contentId) as HTMLElement;
  const closeBtn = document.getElementById(closeId) as HTMLElement;

  if (!el || !loading || !content || !closeBtn) {
    throw new Error(
      `[drawer] DOM elements missing: #${drawerId}, #${loadingId}, #${contentId}, #${closeId}`,
    );
  }

  let open = false;

  closeBtn.addEventListener("click", () => close());

  function openDrawer(): void {
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    open = true;
  }
  function close(): void {
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    open = false;
  }

  function showLoading(title: string, subtitle?: string): void {
    openDrawer();
    loading.classList.remove("hidden");
    content.replaceChildren();

    // 头部 (即使加载中也可以显示)
    const h = document.createElement("h2");
    h.textContent = title;
    h.style.opacity = "0.6";
    content.append(h);
    if (subtitle) {
      const m = document.createElement("p");
      m.className = "meta";
      m.textContent = subtitle;
      content.append(m);
    }
    const skel = document.createElement("div");
    skel.className = "skeleton";
    content.append(skel);
  }

  function showContent(node: Node | string): void {
    loading.classList.add("hidden");
    content.replaceChildren();
    if (typeof node === "string") {
      content.innerHTML = node; // 调用方负责安全转义
    } else {
      content.appendChild(node);
    }
  }

  function showError(message: string): void {
    loading.classList.add("hidden");
    content.replaceChildren();
    const errEl = document.createElement("p");
    errEl.className = "error";
    errEl.textContent = message;
    content.append(errEl);
  }

  function bindEsc(): void {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) close();
    });
  }

  function destroy(): void {
    // 移除 ESC 监听 (如需要可优化记录 listener 然后 remove)
  }

  return {
    el,
    content,
    loading,
    open: openDrawer,
    close,
    isOpen: () => open,
    showLoading,
    showContent,
    showError,
    bindEsc,
    destroy,
  };
}