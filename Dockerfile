FROM node:20-bookworm-slim

WORKDIR /app

# python3/make/g++ garantem que os pacotes com código nativo (better-sqlite3, sharp)
# consigam compilar caso não haja binário pré-compilado para a plataforma do servidor.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data/uploads

# /app/data guarda o banco (SQLite) e as fotos enviadas — monte um volume
# persistente nesse caminho no painel do servidor, senão os dados somem a cada deploy.
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
