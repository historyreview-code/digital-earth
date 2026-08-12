# ─────────────────────────────────────────────────────────────
# Digital Earth — Railway / 任意容器平台部署
# 多阶段构建: Node 构建 Vite 静态站, 再用 nginx 托管
# ─────────────────────────────────────────────────────────────

# Stage 1: 构建静态资源
FROM node:20-alpine AS builder

WORKDIR /app

# 先拷贝依赖清单, 利用层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码 + 构建
COPY . .
RUN npm run build

# Stage 2: 轻量 nginx 托管
FROM nginx:alpine AS runner

COPY --from=builder /app/dist/ /usr/share/nginx/html/

# nginx 配置: SPA 回退 + 静态资源长缓存 + 正确 MIME
RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    # 静态资源长缓存 (带 hash 的文件名)' \
    '    location /assets/ {' \
    '        expires 1y;' \
    '        add_header Cache-Control "public, immutable";' \
    '    }' \
    '    # SPA 回退: 所有路由回 index.html' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '    # 图片/纹理缓存' \
    '    location ~* \.(jpg|jpeg|png|gif|webp|svg|ico)$ {' \
    '        expires 30d;' \
    '        add_header Cache-Control "public, max-age=2592000";' \
    '    }' \
    '    # gzip 压缩' \
    '    gzip on;' \
    '    gzip_types text/plain text/css application/json application/javascript image/svg+xml;' \
    '    gzip_min_length 1024;' \
    '}' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]