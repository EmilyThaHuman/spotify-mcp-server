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

# NUCLEAR OPTION: Remove ONLY build output directories (not node_modules cache)
# This ensures a completely fresh build every time without breaking TypeScript
RUN rm -rf dist assets .vite .wrangler \
    && echo "Cleaned build artifacts at $(date)"

# Build the widgets (Vite) and server (TypeScript)
# This creates the assets/ directory with built HTML/JS/CSS
# Build timestamp to verify fresh builds
RUN npm run build && npm run build:widgets && \
    echo "Build completed at $(date)" > /app/.build-timestamp && \
    echo "=== Built JavaScript files ===" && \
    ls -la /app/assets/*.js 2>/dev/null | head -10 || echo "No JS files found" && \
    echo "=== HTML file contents ===" && \
    cat /app/assets/src/components/spotify-search.html 2>/dev/null | grep -o "spotify-search-[^.]*\.js" || echo "HTML file not found"

# Expose the port
EXPOSE 8005

# Set environment variable for port
ENV PORT=8005

# Start the server
CMD ["node", "dist/server/server.js"]

