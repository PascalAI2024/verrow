# Build stage
FROM node:22-alpine AS build

# Accept build arguments for runtime URLs. Leave VITE_RUST_INGEST_API_URL empty to use the nginx /v1 proxy.
ARG VITE_ENABLE_SPACETIME=false
ARG VITE_SPACETIME_HOST=ws://localhost:3001
ARG VITE_SPACETIME_DB=verrow
ARG VITE_SPACETIME_MODULE=verrow
ARG VITE_RUST_INGEST_API_URL=

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN printf "VITE_ENABLE_SPACETIME=%s\nVITE_SPACETIME_HOST=%s\nVITE_SPACETIME_DB=%s\nVITE_SPACETIME_MODULE=%s\nVITE_RUST_INGEST_API_URL=%s\n" \
    "$VITE_ENABLE_SPACETIME" \
    "$VITE_SPACETIME_HOST" \
    "$VITE_SPACETIME_DB" \
    "$VITE_SPACETIME_MODULE" \
    "$VITE_RUST_INGEST_API_URL" > .env.production

# Build with production environment
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
