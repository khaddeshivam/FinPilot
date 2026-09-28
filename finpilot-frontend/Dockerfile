FROM node:20.19-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Rewrite all paths to index.html so React Router handles client-side routing.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
