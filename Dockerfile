FROM node:22-bookworm-slim

# Instalar python3 para el extractor de docx
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos del proyecto
COPY package.json ./
COPY server/ ./server/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY data/ ./data/
COPY uploads/ ./uploads/
COPY observa_retro_peb.db ./

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "--experimental-sqlite", "server/index.js"]
