# Multi-stage production Dockerfile for Risk Engine Microservice
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for SQLite
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Final lean runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app ./

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

EXPOSE 8080

# Seed on container boot if necessary, then run microservice
CMD ["npm", "start"]
