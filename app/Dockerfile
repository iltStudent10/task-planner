FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["npm", "start"]
