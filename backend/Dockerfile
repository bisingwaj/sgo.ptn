# PTN-RDC · API de gouvernance
#
# Construction en trois temps. Le dernier n'emporte que ce qui sert à
# servir : ni sources TypeScript, ni outils de compilation, ni dépendances
# de développement. Une image qui contient son compilateur donne à qui la
# pénètre de quoi en fabriquer une autre.

# ---------- 1. Dépendances ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Les manifestes seuls : tant qu'ils ne bougent pas, cette couche est
# reprise du cache et l'installation ne se rejoue pas.
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2. Compilation ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Le client Prisma est engendré AVANT la compilation : le code TypeScript
# importe ses types, et sans lui rien ne compile. C'est le piège déjà
# consigné au dépôt — une migration ne régénère pas le client.
RUN npx prisma generate
RUN npm run build

# Les dépendances de développement partent une fois la compilation faite.
RUN npm prune --omit=dev

# ---------- 3. Exécution ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Un utilisateur sans privilège. L'image node en fournit un, `node` :
# l'utiliser évite d'en créer un et de se tromper d'identifiant.
RUN mkdir -p /app && chown -R node:node /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/generated ./generated
COPY --from=build --chown=node:node /app/package.json ./package.json

# Le schéma et les migrations voyagent avec l'image : `migrate deploy`
# s'exécute au démarrage, et il lui faut le dossier des migrations.
COPY --from=build --chown=node:node /app/prisma ./prisma

# Les fontes du composeur de documents. Sans elles, le PDF se compose
# quand même — il retombe sur les polices intégrées de pdfkit — mais il
# cesse de ressembler à une pièce imprimée.
COPY --from=build --chown=node:node /app/assets ./assets

USER node

EXPOSE 3001

# Le point de santé est déjà servi par l'application ; l'orchestrateur s'en
# sert pour savoir si le conteneur répond avant de lui envoyer du trafic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.BACKENDPORT||process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/src/main"]
