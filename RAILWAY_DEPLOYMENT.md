# Railway Deployment Guide - Spotify MCP Server

## Prerequisites
- Railway CLI installed: `npm install -g @railway/cli`
- Railway account connected: `railway login`
- Spotify OAuth credentials (Client ID and Secret)

## Deployment Steps

1. **Get Spotify Credentials from Cloudflare**
   - You need to retrieve the actual values for:
     - `SPOTIFY_CLIENT_ID`
     - `SPOTIFY_CLIENT_SECRET`
   - These are stored as secrets in Cloudflare Workers

2. **Initialize Railway Project**
```bash
cd /Users/reedvogt/Documents/GitHub/spotify-mcp-server
railway init
```

3. **Set Environment Variables**
```bash
railway variables set SPOTIFY_CLIENT_ID="<your_spotify_client_id>"
railway variables set SPOTIFY_CLIENT_SECRET="<your_spotify_client_secret>"
railway variables set SPOTIFY_REDIRECT_URI="https://spotify-mcp-server-production.up.railway.app/auth/callback"
railway variables set BASE_URL="https://spotify-mcp-server-production.up.railway.app"
railway variables set PORT="8005"
```

4. **Deploy**
```bash
railway up
```

5. **Get Deployment URL**
```bash
railway status
```

6. **Update Spotify OAuth Settings**
   - Go to your Spotify Developer Dashboard
   - Update the redirect URI to match your Railway deployment URL

## Environment Variables Required
- `SPOTIFY_CLIENT_ID` - Spotify OAuth client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify OAuth client secret
- `SPOTIFY_REDIRECT_URI` - OAuth callback URL (must match Railway URL)
- `BASE_URL` - Your Railway deployment URL
- `PORT` - Port to run on (default: 8005)

## Storage Notes
- **Cloudflare Version:** Used KV namespace for token storage
- **Railway Version:** Uses in-memory storage (tokens lost on restart)
- **Production Recommendation:** Add Redis or PostgreSQL for persistent storage

## Verification
Once deployed, test the server:
```bash
curl https://your-railway-url.up.railway.app/health
```

## OAuth Flow
1. User visits `/auth/login`
2. Redirected to Spotify for authorization
3. Callback to `/auth/callback`
4. Tokens stored and user can use MCP tools

## Retrieving Cloudflare Secrets
Unfortunately, Cloudflare doesn't allow reading secret values directly. You need to:
1. Check your local environment or documentation where you stored these values
2. Or regenerate new credentials from Spotify Developer Dashboard
3. Or check your deploy scripts (like `deploy-secrets.sh`) if they contain the values

