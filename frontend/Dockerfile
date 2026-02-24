# E:\1. My App\React\ePeLARA\frontend\Dockerfile
# Stage 1: Build React/Vite
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy hasil build ke nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Ganti default nginx.conf agar support React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
