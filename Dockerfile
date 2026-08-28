# PTN-RDC · Plateforme de gouvernance — interface
#
# Une particularité de Next : les variables `NEXT_PUBLIC_*` sont INSCRITES
# DANS LE CODE à la compilation, et non lues au démarrage. L'adresse de
# l'API est donc un argument de construction, pas une variable
# d'environnement d'exécution — changer d'API impose de reconstruire
# l'image. C'est le prix de leur disponibilité côté navigateur.

# ---------- 1. Dépendances ----------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. Compilation ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Les valeurs par défaut ne sont pas un confort, elles ferment un piège.
# Un `ARG` non fourni ne laisse pas la variable absente : il pose une
# chaîne VIDE. Or une variable présente et vide bat `.env.production`
# — et elle traverse `?? "http://localhost:3001/api"` sans le déclencher,
# puisque `??` ne réagit qu'à `undefined`. L'image se construisait alors
# sans erreur, avec une adresse d'API vide.
#
# `docker compose` fournit ces arguments et l'emporte donc sur ces
# valeurs ; elles ne servent qu'au `docker build` lancé à la main.
ARG NEXT_PUBLIC_API_URL=https://ugpt-api.urgences-rdc.com/api
ARG NEXT_PUBLIC_SESSION_IDLE_MINUTES=30
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SESSION_IDLE_MINUTES=${NEXT_PUBLIC_SESSION_IDLE_MINUTES}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- 3. Exécution ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `standalone` rassemble le serveur et ses seules dépendances utiles ; le
# reste de `node_modules` ne monte pas dans l'image.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
