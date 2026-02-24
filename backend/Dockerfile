# E:\1. My App\React\ePeLARA\backend\Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm install --production

# Copy semua source
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
