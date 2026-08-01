# =============================================================================
#  LifeTrack frontend — Vite 8 + React 19 build, served by nginx.
#
#  IMPORTANT: Vite inlines VITE_* variables at BUILD time. The defaults below
#  make the bundle talk to the same origin it is served from (/api and /ai),
#  which is proxied by this container's nginx and avoids CORS entirely.
#  Override with:  docker compose build --build-arg VITE_API_BASE_URL=...
# =============================================================================

# ---------- Stage 1: build the static bundle ---------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_AI_BASE_URL=/ai
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AI_BASE_URL=$VITE_AI_BASE_URL

# Vite gives real process env vars precedence over .env files, so the build
# args above beat the tracked frontend/.env. Local-only overrides are dropped
# so an image build can never pick up a developer's machine URLs.
RUN rm -f .env.local .env.production.local \
    && npm run build

# ---------- Stage 2: nginx runtime (also the public edge / reverse proxy) ----
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
# Rendered to /etc/nginx/conf.d/default.conf by the image's entrypoint, so the
# upstreams can differ per deployment topology without rebuilding.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Where /api and /ai are proxied. Defaults suit the single-VM compose stack;
# the split deployment overrides AI_UPSTREAM with the AI VM's address.
ENV BACKEND_UPSTREAM="http://backend:8080" \
    AI_UPSTREAM="http://ai-service:8100" \
    AI_PROXY_TOKEN="" \
    NGINX_ENVSUBST_FILTER="^(BACKEND_UPSTREAM|AI_UPSTREAM|AI_PROXY_TOKEN)$"

# Fail the build instead of shipping a broken config: render the template with
# the defaults, syntax-check it, then discard it so the entrypoint regenerates
# it from the real environment. extra/ is a runtime bind mount.
RUN mkdir -p /etc/nginx/conf.d/extra \
    && envsubst '${BACKEND_UPSTREAM} ${AI_UPSTREAM} ${AI_PROXY_TOKEN}' \
         < /etc/nginx/templates/default.conf.template \
         > /etc/nginx/conf.d/default.conf \
    && nginx -t \
    && rm /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
    CMD curl -fsS http://127.0.0.1/healthz >/dev/null || exit 1

STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
