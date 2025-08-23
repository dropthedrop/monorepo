## Multi-stage build: compile TypeScript then produce small runtime image
### Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package metadata and tsconfig for deterministic install & build
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

# Copy source and build
COPY src ./src
RUN npm run build

### Stage 2: runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Copy built artifacts and package metadata
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./

ENV NODE_ENV=production
EXPOSE 8080

# Install only production dependencies
RUN npm ci --omit=dev

# Run the compiled app
CMD ["node", "dist/index.js"]
