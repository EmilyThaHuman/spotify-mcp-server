#!/bin/bash

# Deploy Secrets to Cloudflare Worker for Spotify MCP Server
# This script sets all required environment variables as Cloudflare Worker secrets

set -e

echo "==================================="
echo "Deploying Spotify MCP Server Secrets"
echo "==================================="
echo ""

# Spotify Client ID
echo "Setting SPOTIFY_CLIENT_ID..."
echo "5719d0273f1848c0a73005144f0ca40d" | wrangler secret put SPOTIFY_CLIENT_ID --env=""

# Spotify Client Secret
echo "Setting SPOTIFY_CLIENT_SECRET..."
echo "61b59bf5ff91462e93849111bddc5feb" | wrangler secret put SPOTIFY_CLIENT_SECRET --env=""

# Spotify Redirect URI (will be the Worker's own callback endpoint)
echo "Setting SPOTIFY_REDIRECT_URI..."
echo "https://spotify-mcp-server.reed-b9b.workers.dev/auth/callback" | wrangler secret put SPOTIFY_REDIRECT_URI --env=""

echo ""
echo "==================================="
echo "✅ All secrets deployed successfully!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Update Spotify Developer Dashboard redirect URI to:"
echo "   https://spotify-mcp-server.reed-b9b.workers.dev/auth/callback"
echo ""
echo "2. Deploy the worker:"
echo "   wrangler deploy src/server/worker.ts"
echo ""


