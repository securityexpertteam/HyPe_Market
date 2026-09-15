FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --omit=dev
COPY server ./server
WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
