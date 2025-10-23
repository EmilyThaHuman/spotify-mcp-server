# Spotify MCP Server

A Model Context Protocol (MCP) server for Spotify integration with ChatGPT Apps SDK. This server enables AI assistants to search Spotify content, manage user libraries, and interact with playlists through authenticated API access.

## Features

### Tools

1. **search** - Search Spotify for tracks, albums, artists, playlists, shows, and episodes
   - Personalized results based on user's listening history
   - Rich UI widget with search results
   - Support for multiple content types
   - Market-specific results

2. **add_to_library** - Add content to user's Spotify library
   - Widget-accessible only (triggered by user actions in widget)
   - Support for tracks, albums, artists, shows, and episodes
   - Requires authentication

3. **remove_from_library** - Remove content from user's Spotify library
   - Widget-accessible only (triggered by user actions in widget)
   - Support for tracks, albums, artists, shows, and episodes
   - Requires authentication

4. **fetch_tracks** - Get detailed playlist track information
   - Widget-accessible only
   - Includes saved status for each track
   - Returns track metadata, explicit flags, and deep links

### UI Components

- **Spotify Search Widget** - Beautiful, Spotify-themed search results display
  - Responsive grid layout for albums, artists, and playlists
  - Track list view with album art and metadata
  - Play buttons and interactive elements
  - Explicit content badges
  - Empty state handling

## Prerequisites

- Node.js 18+ (for local development)
- Spotify Developer Account
- Spotify App credentials (Client ID and Client Secret)

## Setup

### 1. Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click "Create an App"
3. Fill in the app details:
   - **App name**: Your MCP Server name
   - **App description**: MCP Server for ChatGPT integration
   - **Redirect URI**: `http://localhost:8000/auth/callback`
4. Save your **Client ID** and **Client Secret**

### 2. Configure Required Scopes

Your app needs the following Spotify API scopes:
- `user-library-read` - Read user's library
- `user-library-modify` - Modify user's library
- `user-follow-read` - Read user's followed artists
- `user-follow-modify` - Modify user's followed artists
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists
- `playlist-modify-public` - Modify public playlists
- `playlist-modify-private` - Modify private playlists
- `user-read-private` - Read user profile
- `user-read-email` - Read user email
- `user-top-read` - Read user's top tracks and artists
- `user-read-recently-played` - Read recently played tracks

### 3. Environment Variables

Create a `.env` file in the project root:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8000/auth/callback
PORT=8000
```

### 4. Install Dependencies

```bash
npm install
```

## Running the Server

### Local Development

```bash
npm run dev
```

The server will start on `http://localhost:8000` (or the PORT specified in .env).

### Production

```bash
npm start
```

## Authentication Flow

1. When a user first uses a Spotify tool, they'll receive an authentication URL
2. User visits the URL and authorizes the app with their Spotify account
3. Spotify redirects back to the callback URL with an authorization code
4. The server exchanges the code for access and refresh tokens
5. Tokens are stored in memory (use a database in production)
6. The server automatically refreshes expired tokens

## Deployment

### Cloudflare Workers

The project includes a Cloudflare Worker implementation for serverless deployment.

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Configure `wrangler.toml` with your settings

3. Set up KV namespace for token storage:
```bash
wrangler kv:namespace create SPOTIFY_TOKENS
```

4. Set environment variables:
```bash
wrangler secret put SPOTIFY_CLIENT_ID
wrangler secret put SPOTIFY_CLIENT_SECRET
wrangler secret put SPOTIFY_REDIRECT_URI
```

5. Deploy:
```bash
wrangler deploy
```

## API Endpoints

### MCP Protocol

- **GET /mcp** - SSE stream endpoint for MCP protocol
- **POST /mcp/messages** - Message posting endpoint
- **POST /mcp** - RPC-style endpoint (Cloudflare Workers)

### OAuth

- **GET /auth/callback** - OAuth callback handler

## Project Structure

```
spotify-mcp-server/
├── src/
│   ├── server.ts         # Node.js HTTP server implementation
│   └── worker.ts         # Cloudflare Worker implementation
├── ui-components/
│   └── spotify-search.html  # Search results widget UI
├── package.json
├── tsconfig.json
├── wrangler.toml
└── README.md
```

## Tool Usage Examples

### Search for Music

```json
{
  "tool": "search",
  "arguments": {
    "query": "taylor swift",
    "types": ["track", "artist", "album"],
    "limit": 20,
    "market": "US"
  }
}
```

### Add Track to Library

```json
{
  "tool": "add_to_library",
  "arguments": {
    "itemType": "track",
    "itemId": "3n3Ppam7vgaVa1iaRUc9Lp"
  }
}
```

### Fetch Playlist Tracks

```json
{
  "tool": "fetch_tracks",
  "arguments": {
    "playlistId": "37i9dQZF1DXcBWIGoYBM5M",
    "offset": 0,
    "limit": 100
  }
}
```

## Security Considerations

### Production Deployment

1. **Token Storage**: Use a secure database (PostgreSQL, Redis, etc.) instead of in-memory storage
2. **Environment Variables**: Never commit secrets to version control
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Session Management**: Implement proper session handling and expiration
6. **CORS**: Configure appropriate CORS policies
7. **OAuth State**: Validate OAuth state parameter to prevent CSRF attacks

### Spotify API Limits

- Rate limiting: 30 requests per second per user
- Token expiration: Access tokens expire after 1 hour
- Refresh tokens: Valid until user revokes access

## Important Rules

### Widget-Accessible Tools

The following tools are marked as `widgetAccessible` and should **only** be called from within the Spotify widget UI, not from free-form chat:

- `add_to_library` - Only trigger when user clicks "Save" in the widget
- `remove_from_library` - Only trigger when user clicks "Remove" in the widget
- `fetch_tracks` - Only call for playlists shown in the widget

### Content Restrictions

- **Audiobooks**: Not supported via this tool. Return the message: "You can't search audiobooks on Spotify yet. Try the Spotify app, or search for something else."
- **Deep Links**: Only use Spotify URIs/URLs returned by the API. Never construct your own.
- **Metadata**: Never fabricate, truncate, or alter entity names or metadata

## Troubleshooting

### Authentication Issues

- Verify your Client ID and Client Secret are correct
- Check that the Redirect URI matches exactly in Spotify Dashboard
- Ensure all required scopes are enabled in your Spotify app settings

### API Errors

- Check Spotify API status: https://status.spotify.com
- Verify your access token is valid and not expired
- Check rate limits and implement exponential backoff

### Token Refresh

- Tokens are automatically refreshed when expired
- If refresh fails, user needs to re-authenticate
- Implement error handling for expired refresh tokens

## Development

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Testing Tools Locally

Use the quick-start script:

```bash
./quick-start.sh
```

This will:
1. Check for required environment variables
2. Install dependencies if needed
3. Start the development server
4. Display authentication URL

## Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [ChatGPT Apps SDK](https://platform.openai.com/docs/apps)
- [OAuth 2.0 Authorization Code Flow](https://developer.spotify.com/documentation/general/guides/authorization/code-flow/)

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Spotify API: https://developer.spotify.com/support
- MCP Protocol: https://github.com/modelcontextprotocol/servers
- This Project: Open an issue on GitHub

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0 (2025-01-23)
- Initial release
- Spotify search with UI widget
- Library management (add/remove)
- Playlist track fetching
- OAuth authentication
- Node.js and Cloudflare Worker implementations

---

Built with ❤️ using the Model Context Protocol and Spotify Web API
