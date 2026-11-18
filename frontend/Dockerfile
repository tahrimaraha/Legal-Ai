# Production image for the Legal AI website: builds the React app, then serves it with Caddy, which also
# reverse-proxies /api (including WebSockets for video calls) to the backend and gets HTTPS certificates
# automatically. Built by deploy/docker-compose.yml — see deploy/README.md.
FROM node:20-alpine AS build
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx vite build

FROM caddy:2.8-alpine
COPY --from=build /web/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
