#!/bin/bash

# Spotify MCP Server Quick Start Script

echo "🎵 Spotify MCP Server Quick Start"
echo "=================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo ""
  echo "Please create a .env file with the following variables:"
  echo ""
  echo "SPOTIFY_CLIENT_ID=your_client_id_here"
  echo "SPOTIFY_CLIENT_SECRET=your_client_secret_here"
  echo "SPOTIFY_REDIRECT_URI=http://localhost:8000/auth/callback"
  echo "PORT=8000"
  echo ""
  echo "Get your Spotify credentials at: https://developer.spotify.com/dashboard"
  exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$SPOTIFY_CLIENT_ID" ]; then
  echo "❌ SPOTIFY_CLIENT_ID is not set in .env"
  exit 1
fi

if [ -z "$SPOTIFY_CLIENT_SECRET" ]; then
  echo "❌ SPOTIFY_CLIENT_SECRET is not set in .env"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "✅ Dependencies installed"
echo ""

# Check if TypeScript is compiled
if [ ! -d "dist" ]; then
  echo "🔨 Building TypeScript..."
  npm run build
  echo ""
fi

echo "🚀 Starting Spotify MCP Server..."
echo ""
echo "Server Configuration:"
echo "  • Port: ${PORT:-8000}"
echo "  • OAuth Callback: ${SPOTIFY_REDIRECT_URI:-http://localhost:8000/auth/callback}"
echo ""
echo "MCP Endpoints:"
echo "  • SSE Stream: http://localhost:${PORT:-8000}/mcp"
echo "  • Message Post: http://localhost:${PORT:-8000}/mcp/messages?sessionId=<id>"
echo "  • OAuth Callback: http://localhost:${PORT:-8000}/auth/callback"
echo ""
echo "📖 Make sure to set your Redirect URI in Spotify Dashboard:"
echo "   https://developer.spotify.com/dashboard"
echo ""
echo "=================================="
echo ""

# Start the server
npm run dev

