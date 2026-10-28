FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

# O Cloud Run injeta a porta real via variável de ambiente PORT — o servidor
# já lê isso em tempo de execução, este EXPOSE é só documentação do padrão.
EXPOSE 8080

# server.ts é TypeScript puro (sem passo de build próprio) — roda via tsx,
# mesma ferramenta já usada e testada em desenvolvimento.
CMD ["npx", "tsx", "server.ts"]
