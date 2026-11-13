# syntax=docker/dockerfile:1

# Stage 1: build the bundle. Dev dependencies are needed here because the build runs
# `tsc` and Vite, so this stage installs everything and the runtime stage copies only
# the compiled output.
FROM node:24-alpine AS builder
WORKDIR /app

# Copy the manifests first, so a source change does not invalidate the install layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
COPY convex ./convex
COPY scripts ./scripts

RUN npm run build

# Stage 2: serve the static bundle.
FROM nginx:alpine AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 80

# A plain text endpoint, so a platform health check does not depend on the JS bundle.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
