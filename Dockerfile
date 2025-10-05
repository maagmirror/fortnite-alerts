FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

ENV NEWS_LANGUAGE=es \
    CRON_SCHEDULE="0 12 * * *" \
    CRON_TZ=UTC

CMD ["npm", "start"]


