# MCP Server Deployment Workflow

## ⚠️ IMPORTANT: Always Clean Rebuild Before Deploying

When working on MCP App SDK servers, **ALWAYS** follow this workflow before deploying to Railway:

### Required Steps:

1. **Delete build artifacts:**
   ```bash
   rm -rf assets dist
   ```

2. **Rebuild everything:**
   ```bash
   npm run build          # Builds TypeScript server
   npm run build:widgets   # Builds widget assets
   ```

3. **Commit and push:**
   ```bash
   git add -A
   git commit -m "Deploy: clean rebuild"
   git push
   ```

4. **Deploy to Railway:**
   ```bash
   railway up
   ```

### Quick Deploy Script

Use the provided `deploy.sh` script to automate this:

```bash
./deploy.sh
```

### Why This Is Necessary

- **Cached assets** can cause widgets to use old JavaScript bundles
- **Stale dist files** can cause server issues
- **Fresh builds** ensure the latest code is deployed
- **Widget hashes change** with each build, preventing cache issues

### Common Issues If You Skip This

- Widgets showing mock data instead of real data
- Old JavaScript bundles being served
- TypeScript errors not reflected in deployment
- Widget props not updating correctly

---

**Remember: Clean rebuild → Commit → Push → Deploy**

