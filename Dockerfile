# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./

# Install dependencies (no cache to ensure fresh installs)
RUN npm ci --no-cache

# Copy source code
COPY src ./src

# Clear any existing build artifacts and node cache
RUN rm -rf dist assets node_modules/.cache .vite

# Build the widgets (Vite) and server (TypeScript)
# This creates the assets/ directory with built HTML/JS/CSS
# Add timestamp to force rebuild
RUN npm run build && npm run build:widgets && \
    echo "Build completed at $(date)" > /app/.build-timestamp

# Expose the port
EXPOSE 8005

# Set environment variable for port
ENV PORT=8005

# Start the server
CMD ["node", "dist/server/server.js"]

