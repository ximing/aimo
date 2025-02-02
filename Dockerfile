# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build web app
RUN cd apps/web && pnpm build

# Build server with path alias resolution
RUN cd apps/server && pnpm build

# Move web dist to server public
RUN mkdir -p apps/server/public && \
    cp -r apps/web/dist/* apps/server/public/

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json ./apps/server/

# Install production dependencies
RUN npm install -g pnpm && \
    pnpm install --prod

# Copy built files
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/public ./apps/server/public
COPY --from=builder /app/apps/server/migrations ./apps/server/migrations
COPY --from=builder /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "apps/server/dist/index.js"]