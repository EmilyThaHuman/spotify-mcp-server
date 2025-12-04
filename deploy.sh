#!/bin/bash

# MCP Server Deployment Script
# Always deletes assets and dist, rebuilds widgets, and deploys to Railway
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🧹 Cleaning build artifacts..."
rm -rf assets dist

echo "🔨 Building TypeScript server..."
npm run build

echo "🎨 Building widgets..."
npm run build:widgets

echo "📦 Committing changes..."
git add -A
git commit -m "Deploy: clean rebuild and deploy" || echo "No changes to commit"

echo "🚀 Pushing to GitHub..."
git push

echo "🚂 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"

