FROM node:22-alpine
WORKDIR /app

# Спочатку залежності: цей шар кешується, поки package.json не змінився
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 5000
CMD ["node", "src/index.js"]
