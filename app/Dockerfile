FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm install --only=production

FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app .

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "server.js"]
