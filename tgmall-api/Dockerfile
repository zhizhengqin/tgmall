FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma/ prisma/
RUN npx prisma generate

COPY src/ src/

# .env is mounted at runtime via docker-compose — never COPY into image

EXPOSE 3000

CMD ["node", "src/index.js"]
