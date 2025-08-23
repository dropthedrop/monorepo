FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN npm ci --production
CMD ["node","src/index.js"]
