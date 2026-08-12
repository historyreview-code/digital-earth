/**
 * 底座通用三维地球
 *
 * 不用 globe.gl wrapper (v2.46 在 Vite 8 下有初始化时序 bug)
 * 直接用 three-globe + OrbitControls + CSS2DRenderer (官方 example 已验证稳定)
 *
 * 支持:
 * - 主题 markers (HTML elements layer) - 视觉精致 + 屏幕像素大小不变
 * - 主题 overlays (HTML elements layer) - 城市/边界等附属图层
 * - 点击事件 (marker 自身事件 + 容器事件委托双保险)
 * - 自适应容器大小
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import ThreeGlobe from "three-globe";
import type { MarkerItem } from "./types";
import type { Language } from "./i18n";

export interface MarkerVisualConfig<T extends MarkerItem> {
  /** 把 marker 转成 CSS2DObject */
  createObject(item: T, lang: Language): CSS2DObject;
  /** 轻量更新 marker 显示文本 (语言切换时复用 DOM, 不重建) */
  updateLabel?(obj: CSS2DObject, item: T, lang: Language): void;
  /** 主题主题色或视觉标识 (供图例用) */
  primary?: string;
}

export interface OverlayVisualConfig<T extends MarkerItem> {
  createObject(item: T, lang: Language): CSS2DObject;
  /** 轻量更新 overlay 显示文本 */
  updateLabel?(obj: CSS2DObject, item: T, lang: Language): void;
  /** z-index baseline, 越大越在上层 */
  zIndex?: number;
}

export interface GlobeController {
  flyTo(lat: number, lng: number, altitude?: number): void;
  resetView(): void;
  /** 高亮某个 marker (按 id), 传入 null 清除高亮. 返回是否找到 */
  highlightMarker(id: string | null): boolean;
  setMarkers<T extends MarkerItem>(markers: T[], visual: MarkerVisualConfig<T>, lang: Language): void;
  setOverlays<T extends MarkerItem>(overlays: T[], visual: OverlayVisualConfig<T>, lang: Language): void;
  setLanguage(lang: Language): void;
  /** 相机变化时回调, 用于持久化视角 */
  onCameraChange(cb: (pov: { lat: number; lng: number; altitude: number }) => void): void;
  destroy(): void;
}

export interface CreateGlobeOptions {
  container: HTMLElement;
  globeImageUrl: string;
  bumpImage?: string;
  backgroundColor?: string;
  initialPointOfView?: { lat: number; lng: number; altitude: number };
  /** 点 marker 时回调, 接收 marker 原始 item */
  onMarkerClick?: (id: string) => void;
}

export function createGlobe(opts: CreateGlobeOptions): GlobeController {
  const {
    container,
    globeImageUrl,
    bumpImage,
    backgroundColor = "#020617",
    initialPointOfView = { lat: 30, lng: 110, altitude: 2.0 },
    onMarkerClick,
  } = opts;

  // === Scene ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  // === Camera ===
  const { clientWidth: w, clientHeight: h } = container;
  const camera = new THREE.PerspectiveCamera();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  camera.position.z = 300;

  // === Globe ===
  const globe = new ThreeGlobe()
    .globeImageUrl(globeImageUrl)
    .showAtmosphere(true)
    .atmosphereColor("#60a5fa")
    .atmosphereAltitude(0.18);

  if (bumpImage) globe.bumpImageUrl(bumpImage);
  scene.add(globe);

  // === 贴图清晰度优化 ===
  // 各向异性过滤 (anisotropy): three.js 默认 1x, 地球边缘/斜视角会糊
  // 拉满到 GPU 上限后, 即使单张贴图, 视觉清晰度也大幅提升
  const applyAnisotropy = (): void => {
    const material = globe.globeMaterial() as THREE.Material & {
      map?: THREE.Texture;
      bumpMap?: THREE.Texture;
    };
    if (material?.map) {
      material.map.anisotropy = webglRenderer.capabilities.getMaxAnisotropy();
      material.map.needsUpdate = true;
    }
    if (material?.bumpMap) {
      material.bumpMap.anisotropy = webglRenderer.capabilities.getMaxAnisotropy();
      material.bumpMap.needsUpdate = true;
    }
  };
  // 贴图异步加载, 等就绪后再设置
  globe.onGlobeReady(() => {
    applyAnisotropy();
    // bump 图可能比主贴图稍晚就绪, 再补一次 (延迟轮询)
    setTimeout(() => applyAnisotropy(), 800);
    setTimeout(() => applyAnisotropy(), 2000);
    // 验证钩子: 把 anisotropy 值写到 DOM (供自动化测试/调试)
    const debugEl = document.createElement("span");
    debugEl.id = "anisotropy-debug";
    debugEl.style.display = "none";
    const mat = globe.globeMaterial() as THREE.Material & { map?: THREE.Texture };
    debugEl.textContent = String(mat?.map?.anisotropy ?? "none");
    document.body.appendChild(debugEl);
  });

  // === Lights ===
  scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
  scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

  // === WebGL Renderer ===
  const webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  webglRenderer.setSize(w, h);
  webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(webglRenderer.domElement);
  webglRenderer.domElement.style.position = "absolute";
  webglRenderer.domElement.style.top = "0";
  webglRenderer.domElement.style.left = "0";

  // === CSS2D Renderer (HTML elements layer) ===
  const css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(w, h);
  css2dRenderer.domElement.style.position = "absolute";
  css2dRenderer.domElement.style.top = "0";
  css2dRenderer.domElement.style.left = "0";
  css2dRenderer.domElement.style.pointerEvents = "none"; // 让事件穿透到 webgl canvas
  container.appendChild(css2dRenderer.domElement);

  // === Orbit Controls ===
  const controls = new OrbitControls(camera, webglRenderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.6;
  controls.minDistance = 101; // 至少在地球外
  controls.enablePan = false;

  // 设定初始视角
  controls.update();
  globe.setPointOfView(camera);
  // 视角初始化后, controls 在 change 事件里持续更新 globe pov + 背面隐藏
  // + 触发 onCameraChange (用于 main.ts 持久化视角)
  let cameraChangeListeners: Array<(pov: { lat: number; lng: number; altitude: number }) => void> = [];
  controls.addEventListener("change", () => {
    globe.setPointOfView(camera);
    updateMarkerVisibility();
    // 通知订阅者 (camera.position 在屏幕空间中转 lat/lng/altitude 需 globe.toGeoCoords)
    if (cameraChangeListeners.length > 0) {
      const geo = globe.toGeoCoords(camera.position);
      cameraChangeListeners.forEach((cb) =>
        cb({ lat: geo.lat, lng: geo.lng, altitude: geo.altitude }),
      );
    }
  });

  // === Container: markers / overlays ===
  // CSS2DObject 会被自动加入 css2dRenderer.domElement 的子节点
  // 我们维护 markerObject 数组以便后续 remove
  let markerObjects: CSS2DObject[] = [];
  let overlayObjects: CSS2DObject[] = [];

  /**
   * 每帧更新 marker 可见性
   * CSS2D 默认没有深度测试 → 地球背面的 marker 会浮到正面
   * 解法: 计算 marker 相对相机方向 vs 地球中心方向, dot < 0 → 隐藏
   */
  function updateMarkerVisibility(): void {
    // 相机看向地心的方向 (相机位置已经看向 0,0,0 因为 OrbitControls target = origin)
    // 但实际上 camera.position 可能在 Z=300, 所以 vector 是 (camera.position - origin) normalized
    const camToOrigin = camera.position.clone().normalize();

    let visibleCount = 0;
    markerObjects.forEach((obj) => {
      // marker.position 是世界空间 (从地心向外). 归一化即"从地心指向 marker"
      const markerDir = obj.position.clone().normalize();
      // dot > 0 → marker 在相机一侧 (正面)
      // dot < 0 → marker 在相机另一侧 (背面)
      const dot = markerDir.dot(camToOrigin);
      const isFront = dot > 0;
      if (obj.element) {
        obj.element.classList.toggle("is-hidden", !isFront);
        if (isFront) visibleCount++;
      }
    });

    overlayObjects.forEach((obj) => {
      const markerDir = obj.position.clone().normalize();
      const dot = markerDir.dot(camToOrigin);
      const isFront = dot > 0;
      if (obj.element) {
        obj.element.classList.toggle("is-hidden", !isFront);
      }
    });

    // 更新可见 marker 计数 (让用户感知背面隐藏在工作)
    const elCount = document.getElementById("visible-count");
    if (elCount) elCount.textContent = String(visibleCount);
    const elTotal = document.getElementById("total-count");
    if (elTotal) elTotal.textContent = String(markerObjects.length);
  }

  // 重建 markers (缓存 + diff: 已存在的对象复用, 只更新 position/label)
  function setMarkers<T extends MarkerItem>(
    markers: T[],
    visual: MarkerVisualConfig<T>,
    lang: Language,
  ): void {
    const nextIds = new Set(markers.map((m) => m.id));

    // 1. 移除不再需要的 marker
    const stale = markerObjects.filter((obj) => !nextIds.has(obj.userData?.id));
    stale.forEach((obj) => {
      scene.remove(obj);
      if (obj.element && obj.element.parentNode) {
        obj.element.parentNode.removeChild(obj.element);
      }
    });
    markerObjects = markerObjects.filter((obj) => nextIds.has(obj.userData?.id));

    // 2. 新增或更新 marker (复用已缓存的 DOM)
    const existing = new Map(markerObjects.map((obj) => [obj.userData?.id, obj]));
    markers.forEach((item) => {
      let obj = existing.get(item.id);
      if (!obj) {
        obj = visual.createObject(item, lang);
        obj.userData = { ...obj.userData, id: item.id };
        // 绑定点击事件 (只绑一次)
        if (obj.element && onMarkerClick) {
          obj.element.style.pointerEvents = "auto";
          obj.element.style.cursor = "pointer";
          obj.element.addEventListener("click", (e) => {
            e.stopPropagation();
            onMarkerClick(item.id);
          });
        }
        scene.add(obj);
        markerObjects.push(obj);
      }
      // 更新位置 (cluster 参数可能在 filter 时变化)
      applyMarkerPosition(obj, item);
      // 语言切换时更新 label (复用 DOM, 不重建)
      visual.updateLabel?.(obj, item, lang);
    });

    // 首次或重建后立即应用 visibility
    updateMarkerVisibility();
  }

  // 计算 marker 世界坐标 (支持同城 cluster 切向偏移)
  function applyMarkerPosition<T extends MarkerItem>(obj: CSS2DObject, item: T): void {
    const spread = (item as { _clusterSpread?: number })._clusterSpread;
    const angle = (item as { _clusterAngle?: number })._clusterAngle ?? 0;
    const baseAlt = item.altitude ?? (obj.userData?.kind === "overlay" ? 0.005 : 0.01);
    const c = globe.getCoords(item.lat, item.lng, baseAlt);
    if (spread) {
      // 沿"切向任意方向"推开 spread (360° 扇形, 不只是东向)
      // 方向 = east 向量绕 up 轴旋转 angle 弧度
      const basePos = new THREE.Vector3(c.x, c.y, c.z);
      const up = basePos.clone().normalize();
      const east = new THREE.Vector3(0, 0, 1).cross(up).normalize();
      // 绕 up 轴旋转 east 得到任意切向
      const dir = east.clone().applyAxisAngle(up, angle).normalize();
      obj.position.copy(basePos.add(dir.multiplyScalar(spread)));
    } else {
      obj.position.set(c.x, c.y, c.z);
    }
  }

  function setOverlays<T extends MarkerItem>(
    overlays: T[],
    visual: OverlayVisualConfig<T>,
    lang: Language,
  ): void {
    const nextIds = new Set(overlays.map((o) => o.id));

    // 移除不再需要的
    const stale = overlayObjects.filter((obj) => !nextIds.has(obj.userData?.id));
    stale.forEach((obj) => {
      scene.remove(obj);
      if (obj.element && obj.element.parentNode) {
        obj.element.parentNode.removeChild(obj.element);
      }
    });
    overlayObjects = overlayObjects.filter((obj) => nextIds.has(obj.userData?.id));

    // 新增或更新
    const existing = new Map(overlayObjects.map((obj) => [obj.userData?.id, obj]));
    overlays.forEach((item) => {
      let obj = existing.get(item.id);
      if (!obj) {
        obj = visual.createObject(item, lang);
        obj.userData = { ...obj.userData, id: item.id };
        if (obj.element && onMarkerClick) {
          obj.element.style.pointerEvents = "auto";
          obj.element.style.cursor = "pointer";
          obj.element.addEventListener("click", (e) => {
            e.stopPropagation();
            onMarkerClick(item.id);
          });
        }
        scene.add(obj);
        overlayObjects.push(obj);
      }
      const c = globe.getCoords(item.lat, item.lng, item.altitude ?? 0.005);
      obj.position.set(c.x, c.y, c.z);
      visual.updateLabel?.(obj, item, lang);
    });
    updateMarkerVisibility();
  }

  function setLanguage<T extends MarkerItem>(
    lang: Language,
    currentMarkers: T[],
    currentMarkerVisual: MarkerVisualConfig<T>,
    currentOverlays: T[],
    currentOverlayVisual: OverlayVisualConfig<T>,
  ): void {
    setMarkers(currentMarkers, currentMarkerVisual, lang);
    setOverlays(currentOverlays, currentOverlayVisual, lang);
  }

  // === Render loop ===
  let running = true;
  function render(): void {
    if (!running) return;
    requestAnimationFrame(render);
    controls.update();
    webglRenderer.render(scene, camera);
    css2dRenderer.render(scene, camera);
  }
  render();

  // === Resize ===
  function resize(): void {
    const ww = container.clientWidth;
    const hh = container.clientHeight;
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(ww, hh);
    css2dRenderer.setSize(ww, hh);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // === Initial fly-to ===
  // 把 OrbitControls target 设为地球中心 (0,0,0), camera 设到 initialPointOfView
  // flyTo: 直接设置相机位置 + 同步 OrbitControls
  // (tween 版会被 render loop 的 controls.update() 干扰, 改用瞬时跳转保证可靠)
  let flyTweenId: number | null = null;

  function flyTo(lat: number, lng: number, altitude = 0.4): void {
    const target = globe.getCoords(lat, lng, altitude);
    const end = new THREE.Vector3(target.x, target.y, target.z);

    // 取消可能存在的 tween
    if (flyTweenId !== null) {
      cancelAnimationFrame(flyTweenId);
      flyTweenId = null;
    }

    // 瞬时设置相机位置, controls.update 从 position 重建 spherical
    camera.position.copy(end);
    controls.update();
    // 程序化跳转不触发 controls.change, 手动刷新背面隐藏
    globe.setPointOfView(camera);
    updateMarkerVisibility();
  }

  // 当前高亮的 marker id
  let highlightedId: string | null = null;

  /**
   * 高亮某个 marker (放大 + 光晕 + 常显名称), 传入 null 清除
   */
  function highlightMarker(id: string | null): boolean {
    // 清除上一个
    if (highlightedId && highlightedId !== id) {
      const prev = markerObjects.find((o) => o.userData?.id === highlightedId);
      prev?.element?.classList.remove("is-highlighted");
    }
    highlightedId = id;
    if (!id) return true;

    const obj = markerObjects.find((o) => o.userData?.id === id);
    if (!obj?.element) return false;
    obj.element.classList.add("is-highlighted");
    return true;
  }
  flyTo(initialPointOfView.lat, initialPointOfView.lng, initialPointOfView.altitude);

  /**
   * 重置视角到"上次保存的位置"
   * - 默认 = initialPointOfView (地中海 lat=20/lng=20)
   * - 如果 main.ts 传入了 savedPOV, 用 savedPOV
   * 设计意图: 双击空地时, 不论用户当前视角如何, 都能"返回出发点"
   */
  function resetView(): void {
    // 这里 main.ts 通过 onCameraChange 第一次保存的 POV 在 .change 触发后会被存,
    // 但 dblclick 时我们直接读 initialPointOfView + 让 main.ts 重新同步到 localStorage
    flyTo(initialPointOfView.lat, initialPointOfView.lng, initialPointOfView.altitude);
  }

  // 监听 webgl canvas 双击 - 双击空地区域时 resetView 到默认视角
  // (用 dblclick 而不是 click, 因为 mouseup 之后会冒泡 click,
  //  导致拖动结束时也会触发 click → resetView 把视角拉回默认)
  webglRenderer.domElement.addEventListener("dblclick", (e) => {
    if (e.target === webglRenderer.domElement) {
      resetView();
    }
  });

  // 监听 drag/touch 结束 - OrbitControls 的 damping 让 controls.change 异步触发,
  // 拖动结束立刻同步 POV 一次, 确保 localStorage 不丢
  function fireImmediatePOV(): void {
    if (cameraChangeListeners.length === 0) return;
    const geo = globe.toGeoCoords(camera.position);
    cameraChangeListeners.forEach((cb) =>
      cb({ lat: geo.lat, lng: geo.lng, altitude: geo.altitude }),
    );
  }
  webglRenderer.domElement.addEventListener("mouseup", fireImmediatePOV);
  webglRenderer.domElement.addEventListener("touchend", fireImmediatePOV);

  // === Cleanup ===
  function destroy(): void {
    running = false;
    ro.disconnect();
    markerObjects.forEach((obj) => scene.remove(obj));
    overlayObjects.forEach((obj) => scene.remove(obj));
    webglRenderer.dispose();
    controls.dispose();
    if (webglRenderer.domElement.parentNode) {
      webglRenderer.domElement.parentNode.removeChild(webglRenderer.domElement);
    }
    if (css2dRenderer.domElement.parentNode) {
      css2dRenderer.domElement.parentNode.removeChild(css2dRenderer.domElement);
    }
  }

  // 简化 setLanguage: 不带参数, 需要外部再次 setMarkers/setOverlays
  // (避免 generic state 复杂度)
  return {
    flyTo,
    resetView,
    highlightMarker,
    setMarkers,
    setOverlays,
    setLanguage: setLanguage as unknown as GlobeController["setLanguage"],
    onCameraChange: (cb) => {
      cameraChangeListeners.push(cb);
    },
    destroy,
  };
}