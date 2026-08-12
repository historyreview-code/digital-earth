import { defineConfig } from "vite";

/**
 * Vite 8 配置:
 * - host: '0.0.0.0' (IPv4 all interfaces) - 让系统代理能转发到
 *   之前 host:true 没生效, 用 '0.0.0.0' 显式 IPv4 字符串最稳
 * - strictPort: 端口被占报错而不是跳到 5174
 * - cors: 允许任意 origin
 */
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
