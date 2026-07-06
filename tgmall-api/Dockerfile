FROM node:20-alpine

# 安装 OpenSSL，使 Prisma 能正确检测并链接 OpenSSL 3.0 引擎
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma/ prisma/
RUN npx prisma generate

COPY src/ src/
COPY public/ public/

EXPOSE 3000

CMD ["node", "src/index.js"]
