/**
 * 主题注册表
 * 未来添加新主题:
 *   1. 在 src/themes/<name>/ 下实现 Theme<...>
 *   2. 在本文件 import + registry[name] = ...
 *   3. URL ?theme=<name> 即可切换
 */

import { universitiesTheme, universitiesMarkerVisual, citiesOverlayVisual } from "./universities/theme";
import type { ThemeRegistry } from "../core/types";

export const themeRegistry: ThemeRegistry = {
  universities: universitiesTheme,
};

/**
 * 默认主题
 */
export const defaultThemeId = "universities";

/**
 * 主题扩展配置 (主题特定的 marker/overlay visual + data 适配器)
 */
export const themeExtras = {
  universities: {
    markerVisual: universitiesMarkerVisual,
    overlayVisual: citiesOverlayVisual,
  },
  // 未来: disasters: {...}, demographics: {...}
};