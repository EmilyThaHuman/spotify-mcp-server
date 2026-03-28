# Spotify MCP Server

Model Context Protocol server for Spotify integration with the ChatGPT Apps SDK. Control your Spotify library and discover music through natural language conversations with your AI assistant.

## Features

- **Music Search** — Search Spotify's catalog by track, artist, album, or playlist
- **Library Management** — Add and remove tracks from your Spotify library
- **Track Fetching** — Retrieve tracks and playlists by ID
- **Interactive Widget** — Beautiful music browser widget rendered inline in ChatGPT
- **OAuth 2.0 Authentication** — Secure Spotify API access
- **Railway + Docker** deployment ready

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search Spotify for tracks, artists, albums, or playlists |
| `fetch_tracks` | Retrieve tracks by ID or from a playlist |
| `add_to_library` | Save a track or album to the user's Spotify library |
| `remove_from_library` | Remove a track or album from the user's Spotify library |

## Example Prompts

- "Find me some lo-fi hip hop tracks for studying"
- "Add 'Bohemian Rhapsody' by Queen to my library"
- "Search for Taylor Swift albums released after 2020"
- "Show me tracks from my Discover Weekly playlist"

## Installation

```bash
npm install
```

## Environment Variables

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
REDIRECT_URI=http://localhost:8000/auth/callback
PORT=8000
```

## Development

```bash
# Run development server
npm run dev

# Build server and widgets
npm run build

# Build server only
npm run build:server

# Build widgets only
npm run build:widgets
```

## Deployment

Configured for Railway deployment with Docker. Set environment variables in your Railway project dashboard.

## License

MIT

---

## Powered by ZeroTwo

This MCP server is part of the [ZeroTwo AI platform](https://zerotwo.ai) — the all-in-one AI workspace that brings together GPT-5, Claude, Gemini, image generation, and entertainment integrations like this Spotify connector.

| | |
|---|---|
| 🌐 **[ZeroTwo — All AI Models in One App](https://zerotwo.ai)** | Discover music, manage playlists, and get AI-powered recommendations — all in one app. |
| ✨ **[ZeroTwo Features](https://zerotwo.ai/features)** | AI chat, image studio, video, web search, and MCP-powered music tools. |
| 🤖 **[AI Models — GPT-5, Claude & Gemini](https://zerotwo.ai/zerotwo-models)** | Get personalized music suggestions from the world's most advanced AI models. |
| 🔌 **[ZeroTwo Connectors & Integrations](https://zerotwo.ai/connectors)** | Connect Spotify, Gmail, Airtable, Canva, and more to your AI assistant. |
| 💰 **[ZeroTwo Pricing](https://zerotwo.ai/pricing)** | One subscription that replaces ChatGPT Plus, Claude Pro, and Gemini Advanced. |
| 📝 **[ZeroTwo Blog](https://zerotwo.ai/blog)** | AI music tools, product news, and creative workflow guides. |
| 🚀 **[Try ZeroTwo Free](https://app.zerotwo.ai/auth/login)** | Let AI be your personal music curator — get started free. |

> **Built for ZeroTwo** — Use this Spotify MCP server with [ZeroTwo's AI assistant](https://zerotwo.ai) to search music, manage your library, and discover new tracks through natural language — with a beautiful inline widget.
