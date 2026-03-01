# Build stage
FROM node:20-slim AS builder

# Install pnpm
RUN npm install -g pnpm@10.22.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY config ./config
COPY packages ./packages
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/dto/package.json ./packages/dto/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build logger package first
RUN pnpm --filter @aimo/logger build

# Build DTO package first
RUN pnpm --filter @aimo/dto build

# Build web app (outputs to server/public)
RUN pnpm --filter @aimo/web build

# Build server
RUN pnpm --filter @aimo/server build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install pnpm for production
RUN npm install -g pnpm@10.22.0

# Copy package files for dependency resolution
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/packages/dto/package.json ./packages/dto/
COPY --from=builder /app/packages/logger/package.json ./packages/logger/

# Install production dependencies only
RUN HUSKY=0 pnpm install --prod --frozen-lockfile --prefer-offline

# Copy built files from builder stage
COPY --from=builder /app/apps/server/ ./apps/server/
COPY --from=builder /app/apps/server/drizzle/ ./drizzle/
COPY --from=builder /app/packages/dto/dist/ ./packages/dto/dist/
COPY --from=builder /app/packages/logger/lib/ ./packages/logger/lib/

# Create .env file with default values if not provided
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "apps/server/dist/index.js"]