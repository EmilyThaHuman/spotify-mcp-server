# Spotify MCP Server - Deployment Guide

## Overview

This guide covers deploying the Spotify MCP Server to various platforms. Choose the deployment method that best fits your needs.

## Table of Contents

1. [Local Development](#local-development)
2. [Cloudflare Workers](#cloudflare-workers)
3. [Docker Deployment](#docker-deployment)
4. [VPS/Cloud Deployment](#vpscloud-deployment)
5. [Production Considerations](#production-considerations)

---

## Local Development

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd spotify-mcp-server

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Edit .env with your Spotify credentials
# Get credentials from: https://developer.spotify.com/dashboard

# 5. Start the server
./quick-start.sh
# OR
npm run dev
```

### Environment Variables

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8000/auth/callback
PORT=8000
```

---

## Cloudflare Workers

Cloudflare Workers provides serverless deployment with global edge network distribution.

### Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Spotify App credentials

### Setup Steps

#### 1. Login to Cloudflare

```bash
wrangler login
```

#### 2. Create KV Namespace

```bash
# Production namespace
wrangler kv:namespace create SPOTIFY_TOKENS

# Preview namespace (for development)
wrangler kv:namespace create SPOTIFY_TOKENS --preview
```

Copy the namespace IDs from the output.

#### 3. Update wrangler.toml

Edit `wrangler.toml` and replace the KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "SPOTIFY_TOKENS"
id = "your_production_namespace_id"
preview_id = "your_preview_namespace_id"
```

#### 4. Set Environment Secrets

```bash
# Set Spotify Client ID
wrangler secret put SPOTIFY_CLIENT_ID
# Enter your client ID when prompted

# Set Spotify Client Secret
wrangler secret put SPOTIFY_CLIENT_SECRET
# Enter your client secret when prompted

# Set Spotify Redirect URI
wrangler secret put SPOTIFY_REDIRECT_URI
# Enter your redirect URI (e.g., https://spotify-mcp.your-subdomain.workers.dev/auth/callback)
```

#### 5. Update Spotify App Settings

Go to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and add the Worker URL to your Redirect URIs:

```
https://spotify-mcp.your-subdomain.workers.dev/auth/callback
```

#### 6. Deploy

```bash
# Deploy to production
wrangler deploy

# Or for development
wrangler dev
```

### Custom Domain (Optional)

```bash
# Add a custom domain
wrangler route add "spotify-mcp.example.com/*" your-worker-name
```

Update `wrangler.toml`:

```toml
routes = [
  { pattern = "spotify-mcp.example.com/*", zone_name = "example.com" }
]
```

---

## Docker Deployment

### Dockerfile

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY ui-components ./ui-components

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8000

# Start server
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  spotify-mcp:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SPOTIFY_CLIENT_ID=${SPOTIFY_CLIENT_ID}
      - SPOTIFY_CLIENT_SECRET=${SPOTIFY_CLIENT_SECRET}
      - SPOTIFY_REDIRECT_URI=${SPOTIFY_REDIRECT_URI}
      - PORT=8000
    restart: unless-stopped
    volumes:
      - ./data:/app/data
```

### Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## VPS/Cloud Deployment

### AWS EC2, DigitalOcean, Linode, etc.

#### 1. Provision Server

- Ubuntu 22.04 LTS recommended
- Minimum 1 GB RAM
- Open port 8000 (or your chosen port)

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx
```

#### 3. Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> spotify-mcp
cd spotify-mcp

# Install dependencies
sudo npm install

# Build TypeScript
sudo npm run build

# Create .env file
sudo nano .env
# Add your environment variables

# Start with PM2
sudo pm2 start dist/server.js --name spotify-mcp

# Save PM2 configuration
sudo pm2 save
sudo pm2 startup
```

#### 4. Configure Nginx (Optional)

Create `/etc/nginx/sites-available/spotify-mcp`:

```nginx
server {
    listen 80;
    server_name spotify-mcp.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/spotify-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d spotify-mcp.example.com
```

#### 6. Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Production Considerations

### Security

#### 1. Token Storage

Replace in-memory token storage with a database:

**PostgreSQL Example:**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function storeTokens(userId: string, tokens: any) {
  await pool.query(
    'INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4',
    [userId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt]
  );
}

async function getTokens(userId: string) {
  const result = await pool.query(
    'SELECT * FROM spotify_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows[0];
}
```

**Redis Example:**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function storeTokens(userId: string, tokens: any) {
  await redis.set(
    `spotify:tokens:${userId}`,
    JSON.stringify(tokens),
    'EX',
    86400 * 30 // 30 days
  );
}

async function getTokens(userId: string): Promise<any> {
  const data = await redis.get(`spotify:tokens:${userId}`);
  return data ? JSON.parse(data) : null;
}
```

#### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);
```

#### 3. CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://chat.openai.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### Monitoring

#### 1. Health Checks

Add a health check endpoint:

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    spotify: await checkSpotifyConnection(),
  };
  res.json(health);
});
```

#### 2. Logging

Use structured logging:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

#### 3. Error Tracking

Integrate Sentry or similar:

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance

#### 1. Caching

Cache Spotify API responses:

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function cachedSpotifyRequest(key: string, fetchFn: () => Promise<any>) {
  const cached = cache.get(key);
  if (cached) return cached;
  
  const result = await fetchFn();
  cache.set(key, result);
  return result;
}
```

#### 2. Connection Pooling

Use connection pooling for database:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Backup and Recovery

#### 1. Database Backups

```bash
# Automated PostgreSQL backups
0 2 * * * pg_dump -U postgres spotify_mcp > /backups/spotify_mcp_$(date +\%Y\%m\%d).sql
```

#### 2. Configuration Backups

```bash
# Backup .env and configuration
0 3 * * * tar -czf /backups/config_$(date +\%Y\%m\%d).tar.gz /var/www/spotify-mcp/.env /var/www/spotify-mcp/wrangler.toml
```

### Scaling

#### Horizontal Scaling

Use a load balancer with multiple instances:

```nginx
upstream spotify_mcp {
    least_conn;
    server 10.0.1.10:8000;
    server 10.0.1.11:8000;
    server 10.0.1.12:8000;
}

server {
    listen 80;
    location / {
        proxy_pass http://spotify_mcp;
    }
}
```

#### Database Scaling

- Use read replicas for read-heavy workloads
- Implement database connection pooling
- Consider Redis for session storage

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

#### Permission Denied

```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/spotify-mcp
```

#### OAuth Redirect Mismatch

- Ensure redirect URI in code matches Spotify Dashboard exactly
- Include protocol (http/https)
- No trailing slashes

### Logs

```bash
# PM2 logs
pm2 logs spotify-mcp

# System logs
sudo journalctl -u spotify-mcp -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Support

- **Spotify API**: https://developer.spotify.com/support
- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **MCP Protocol**: https://github.com/modelcontextprotocol/servers

---

## Next Steps

1. Choose your deployment platform
2. Follow the specific deployment guide
3. Implement production security measures
4. Set up monitoring and backups
5. Test OAuth flow end-to-end
6. Monitor performance and scale as needed

Happy deploying! 🚀

