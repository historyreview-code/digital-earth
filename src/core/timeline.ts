/**
 * 底座通用时间滑块 (与具体主题解耦)
 *
 * 用法 (主题侧):
 *   const tl = createTimeline();
 *   tl.setRange(startTime, endTime);     // 数据时间范围
 *   tl.onChange((currentTime) => {
 *     markers.forEach(m => m.time <= currentTime && show(m));
 *   });
 *   tl.play(); / tl.pause();              // 自动回放
 *   tl.setSpeed(2);                       // 2x 速度
 *
 * 通用特性:
 *   - 拖动滑块手动选时间
 *   - 播放/暂停自动循环 (requestAnimationFrame)
 *   - 键盘 ←/→ 步进 1%, Space 切换播放
 *   - 触屏 (手机) 滑块可拖
 *
 * UI 由 index.html + timeline.css 提供 (底座负责逻辑, 主题可自定义外观)
 */

export interface TimelineController {
  el: HTMLElement;
  /** 设置数据时间范围 (epoch ms) */
  setRange(start: number, end: number): void;
  /** 主题订阅: 当前时间变化时回调 */
  onChange(cb: (currentTime: number, isPlaying: boolean) => void): void;
  /** 播放/暂停 */
  play(): void;
  pause(): void;
  toggle(): void;
  /** 设置播放速度 (1 = 实时, 2 = 2x 速度) */
  setSpeed(multiplier: number): void;
  /** 直接跳到某时刻 */
  setTime(t: number): void;
  /** 当前时间 (epoch ms) */
  getTime(): number;
  /** 是否在播放 */
  isPlaying(): boolean;
  destroy(): void;
}

const DEFAULTS = {
  width: "min(720px, 92vw)",
  height: 56,
  collapsedHeight: 30,
};
void DEFAULTS; // 保留尺寸常量供未来自定义外观使用

export function createTimeline(): TimelineController {
  // === DOM 创建 ===
  const el = document.createElement("div");
  el.id = "timeline";
  el.innerHTML = `
    <button id="tl-play" class="tl-btn" aria-label="播放/暂停">
      <span class="tl-play-icon">▶</span>
    </button>
    <div class="tl-track-wrap">
      <input id="tl-range" type="range" min="0" max="1000" value="1000" step="1" />
      <div class="tl-track-labels">
        <span id="tl-start">--</span>
        <span id="tl-now" class="tl-now">--</span>
        <span id="tl-end">--</span>
      </div>
    </div>
    <select id="tl-speed" class="tl-speed" title="播放速度">
      <option value="0.5">0.5x</option>
      <option value="1" selected>1x</option>
      <option value="2">2x</option>
      <option value="5">5x</option>
      <option value="20">20x</option>
    </select>
  `;

  document.body.appendChild(el);

  const rangeEl = el.querySelector<HTMLInputElement>("#tl-range")!;
  const playBtn = el.querySelector<HTMLButtonElement>("#tl-play")!;
  const playIcon = playBtn.querySelector<HTMLSpanElement>(".tl-play-icon")!;
  const startLabel = el.querySelector<HTMLSpanElement>("#tl-start")!;
  const nowLabel = el.querySelector<HTMLSpanElement>("#tl-now")!;
  const endLabel = el.querySelector<HTMLSpanElement>("#tl-end")!;
  const speedEl = el.querySelector<HTMLSelectElement>("#tl-speed")!;

  // === 状态 ===
  let rangeStart = 0;
  let rangeEnd = 0;
  let currentTime = 0;
  let speed = 1;
  let playing = false;
  let lastFrameTime = 0;
  let rafId: number | null = null;
  const listeners: Array<(t: number, playing: boolean) => void> = [];

  // === 时间格式化 (智能: 跨度 > 1 年用年月日, > 1 天用月日时分, 否则时分秒) ===
  function formatTime(t: number): string {
    if (!t) return "—";
    const d = new Date(t);
    const span = rangeEnd - rangeStart;
    if (span > 365 * 24 * 3600 * 1000) {
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    if (span > 2 * 24 * 3600 * 1000) {
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }

  function sync(): void {
    const span = Math.max(1, rangeEnd - rangeStart);
    const pct = Math.min(1, Math.max(0, (currentTime - rangeStart) / span));
    rangeEl.value = String(Math.round(pct * 1000));
    nowLabel.textContent = formatTime(currentTime);
    startLabel.textContent = formatTime(rangeStart);
    endLabel.textContent = formatTime(rangeEnd);
    playIcon.textContent = playing ? "❚❚" : "▶";
    playBtn.setAttribute("aria-label", playing ? "暂停" : "播放");
  }

  function fire(): void {
    listeners.forEach((cb) => cb(currentTime, playing));
  }

  // === Render loop ===
  // 速度语义: speed=1 → 100 秒播完整个范围, speed=2 → 50 秒, speed=5 → 20 秒
  // (回放场景, 实时速度没意义: 7 天地震数据用实时速度要播 7 天)
  function step(now: number): void {
    if (!playing) return;
    const span = Math.max(1, rangeEnd - rangeStart);
    const dt = (now - lastFrameTime) * (span * speed) / 100000; // 每秒走 span*speed/100
    lastFrameTime = now;
    currentTime += dt;
    if (currentTime >= rangeEnd) {
      // 到达末尾: 自动循环回起点
      currentTime = rangeStart;
    }
    sync();
    fire();
    rafId = requestAnimationFrame(step);
  }

  function start(): void {
    if (playing) return;
    playing = true;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(step);
    sync();
  }

  function stop(): void {
    playing = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    sync();
  }

  // === 事件 ===
  rangeEl.addEventListener("input", () => {
    if (rangeEnd <= rangeStart) return;
    const span = rangeEnd - rangeStart;
    currentTime = rangeStart + (Number(rangeEl.value) / 1000) * span;
    sync();
    fire();
  });

  playBtn.addEventListener("click", () => {
    if (playing) stop();
    else start();
  });

  speedEl.addEventListener("change", () => {
    const v = Number(speedEl.value);
    if (Number.isFinite(v) && v > 0) speed = v;
  });

  document.addEventListener("keydown", (e) => {
    // 跳过输入框
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.code === "Space") {
      e.preventDefault();
      if (playing) stop();
      else start();
    } else if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      if (rangeEnd <= rangeStart) return;
      const dir = e.code === "ArrowRight" ? 1 : -1;
      const span = rangeEnd - rangeStart;
      currentTime = Math.min(rangeEnd, Math.max(rangeStart, currentTime + dir * 0.01 * span));
      sync();
      fire();
    }
  });

  // === 公开 API ===
  return {
    el,
    setRange(start, end) {
      rangeStart = start;
      rangeEnd = end;
      if (currentTime < start || currentTime > end) {
        currentTime = start;
      }
      sync();
      fire();
    },
    onChange(cb) {
      listeners.push(cb);
    },
    play: start,
    pause: stop,
    toggle() {
      if (playing) stop();
      else start();
    },
    setSpeed(multiplier) {
      if (Number.isFinite(multiplier) && multiplier > 0) {
        speed = multiplier;
        speedEl.value = String(multiplier);
      }
    },
    setTime(t) {
      if (rangeEnd <= rangeStart) return;
      currentTime = Math.min(rangeEnd, Math.max(rangeStart, t));
      sync();
      fire();
    },
    getTime: () => currentTime,
    isPlaying: () => playing,
    destroy() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.remove();
    },
  };
}