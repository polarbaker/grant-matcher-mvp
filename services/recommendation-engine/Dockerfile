# Build stage
FROM node:16-alpine as builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci && \
    npm install -g typescript

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:16-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY .env ./

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 4002

CMD ["node", "dist/index.js"]
