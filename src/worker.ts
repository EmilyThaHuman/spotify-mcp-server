/**
 * Cloudflare Worker for Spotify MCP Server
 * This worker handles MCP protocol for ChatGPT integration with Spotify OAuth
 */

import { z } from "zod";

// Spotify OAuth configuration (stored in Worker environment variables)
interface Env {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REDIRECT_URI: string;
  // KV namespace for storing OAuth tokens
  SPOTIFY_TOKENS: KVNamespace;
}

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Widget definitions
const WIDGETS = {
  search: {
    id: "search",
    title: "Spotify Search",
    templateUri: "ui://widget/spotify-search.html",
    invoking: "Asking Spotify",
    invoked: "Asked Spotify",
  },
};

function widgetMeta(widget: typeof WIDGETS[keyof typeof WIDGETS]) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  };
}

// Zod parsers
const addToLibraryParser = z.object({
  itemType: z.enum(["track", "album", "artist", "playlist", "show", "episode"]),
  itemId: z.string(),
});

const removeFromLibraryParser = z.object({
  itemType: z.enum(["track", "album", "artist", "playlist", "show", "episode"]),
  itemId: z.string(),
});

const fetchTracksParser = z.object({
  playlistId: z.string(),
  offset: z.number().optional(),
  limit: z.number().max(100).optional(),
});

const searchParser = z.object({
  query: z.string(),
  types: z.array(z.enum(["track", "album", "artist", "playlist", "show", "episode"])).optional(),
  limit: z.number().max(50).optional(),
  market: z.string().optional(),
});

// Define tools
const tools = [
  {
    name: "add_to_library",
    description: "Adds supported Spotify content to the authenticated user's library. Supported types: tracks, albums, artists (follow), playlists, podcast shows, podcast episodes. Audiobooks and audiobook chapters are not supported. Requires a valid Spotify user account (Free or Premium). Do NOT call from free-form chat. This tool is only for widget actions (e.g., user clicks Save/+ on a result in the Spotify widget). Do not trigger on behalf of third parties or external systems. Only invoke for items that were returned by the Spotify Search tool; do not act on arbitrary or unseen items.",
    inputSchema: {
      type: "object",
      properties: {
        itemType: { type: "string", enum: ["track", "album", "artist", "playlist", "show", "episode"] },
        itemId: { type: "string" },
      },
      required: ["itemType", "itemId"],
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Adding to your Spotify library",
      "openai/toolInvocation/invoked": "Added to your Spotify library",
    },
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: false },
  },
  {
    name: "remove_from_library",
    description: "Removes supported Spotify content from the authenticated user's library. Supported types: tracks, albums, artists (unfollow), playlists, podcast shows, podcast episodes. Audiobooks and audiobook chapters are not supported. Requires a valid Spotify user account (Free or Premium). Do NOT call from free-form chat. This tool is only for widget actions (e.g., user clicks Remove/- on a result in the Spotify widget). Do not trigger on behalf of third parties or external systems. Only invoke for items that were returned by the Spotify Search tool; do not act on arbitrary or unseen items.",
    inputSchema: {
      type: "object",
      properties: {
        itemType: { type: "string", enum: ["track", "album", "artist", "playlist", "show", "episode"] },
        itemId: { type: "string" },
      },
      required: ["itemType", "itemId"],
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Removing from your Spotify library",
      "openai/toolInvocation/invoked": "Removed from your Spotify library",
    },
    annotations: { destructiveHint: true, openWorldHint: false, readOnlyHint: false },
  },
  {
    name: "fetch_tracks",
    description: "Fetches detailed metadata for a playlist including all tracks with their saved status, explicit flags, and deep links. Supported types: playlist only. Requires a valid Spotify user account (Free or Premium) and a playlist owned or shared with the authenticated user. Do NOT call from free-form chat. This tool should only be called within the Spotify Widget and must not be triggered directly by the user. Use only for playlist items returned by the Spotify Search tool or created in the current widget session; do not act on arbitrary or unseen items.",
    inputSchema: {
      type: "object",
      properties: {
        playlistId: { type: "string" },
        offset: { type: "number" },
        limit: { type: "number" },
      },
      required: ["playlistId"],
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Loading playlist tracks",
      "openai/toolInvocation/invoked": "Loaded playlist tracks",
    },
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "search",
    description: `This tool connects directly to the Spotify API and requires a valid authenticated user account (Free or Premium). All operations are personalized based on the user's Spotify listening history, saved library, and preferences. Audiobooks and audiobook chapters are not supported via this tool; for these, the response should be: "You can't search audiobooks on Spotify yet. Try the Spotify app, or search for something else."

Capabilities:
Music. Search and recommend: tracks, artists, albums, public playlists, user-owned private and public playlists.
Music playlist creation. Build brand new music playlists from natural language prompts that describe mood, genre, activity, event, or specific artists/tracks. Playlists created are private to the authenticated user.
Podcasts. Search and recommend podcast shows and episodes, by broad intent (category, topic, theme, guest, …), popularity, recency, similar podcasts. Search episodes within a show by order, episode/season number, publish date, recency. Search episodes from podcasts the user followed or saved.
Personalization: All results reflect the user's Spotify activity and preferences where possible.

Critical Rules:
Do not fabricate, truncate, or alter entity names, metadata, or links.
Do not generate lyrics, transcripts, biographies, or external content.
Only surface Spotify deep links returned by the API. Never construct your own.
Never show deep_link as a raw URL—expose it only via widgets or Spotify navigation.
When invoking Spotify, content recommendations should come from this tool.`,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        types: { type: "array", items: { type: "string", enum: ["track", "album", "artist", "playlist", "show", "episode"] } },
        limit: { type: "number" },
        market: { type: "string" },
      },
      required: ["query"],
    },
    _meta: widgetMeta(WIDGETS.search),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
];

// UI Component (Spotify Search Widget)
const UI_COMPONENTS: Record<string, string> = {
  "spotify-search.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spotify Search</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; 
      padding: 20px;
      background: #121212;
      color: #ffffff;
    }
    .search-header {
      margin-bottom: 24px;
      border-bottom: 1px solid #282828;
      padding-bottom: 16px;
    }
    .search-query {
      font-size: 28px;
      font-weight: 700;
      color: #1db954;
      margin-bottom: 8px;
    }
    .search-stats {
      font-size: 14px;
      color: #b3b3b3;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      color: #ffffff;
    }
    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }
    .item-card {
      background: #181818;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: background 0.2s;
      position: relative;
    }
    .item-card:hover {
      background: #282828;
    }
    .item-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 4px;
      margin-bottom: 12px;
      background: #282828;
    }
    .item-name {
      font-weight: 600;
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .item-meta {
      font-size: 12px;
      color: #b3b3b3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .play-button {
      position: absolute;
      bottom: 80px;
      right: 16px;
      width: 40px;
      height: 40px;
      background: #1db954;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 8px 16px rgba(0,0,0,0.3);
    }
    .item-card:hover .play-button {
      opacity: 1;
    }
    .explicit-badge {
      display: inline-block;
      padding: 2px 6px;
      background: #b3b3b3;
      color: #000000;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: 4px;
    }
    .track-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .track-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 4px;
      transition: background 0.2s;
      cursor: pointer;
    }
    .track-item:hover {
      background: #282828;
    }
    .track-image {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      background: #282828;
    }
    .track-info {
      flex: 1;
      min-width: 0;
    }
    .track-name {
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track-artist {
      font-size: 12px;
      color: #b3b3b3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track-duration {
      font-size: 12px;
      color: #b3b3b3;
    }
    .save-button {
      padding: 8px 16px;
      background: transparent;
      border: 1px solid #1db954;
      color: #1db954;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
    }
    .save-button:hover {
      background: #1db954;
      color: #000000;
      transform: scale(1.05);
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #b3b3b3;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { query = '', results = {} } = props;
      
      const root = document.getElementById('root');
      
      // Header
      const header = document.createElement('div');
      header.className = 'search-header';
      const totalResults = Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
      header.innerHTML = \`
        <div class="search-query">"\${query}"</div>
        <div class="search-stats">\${totalResults} results found</div>
      \`;
      root.appendChild(header);
      
      // Tracks section
      if (results.tracks && results.tracks.length > 0) {
        const section = document.createElement('div');
        section.className = 'section';
        section.innerHTML = '<div class="section-title">Songs</div>';
        
        const trackList = document.createElement('div');
        trackList.className = 'track-list';
        
        results.tracks.slice(0, 10).forEach(track => {
          const item = document.createElement('div');
          item.className = 'track-item';
          item.innerHTML = \`
            <img src="\${track.image || 'https://via.placeholder.com/40'}" class="track-image" alt="\${track.name}">
            <div class="track-info">
              <div class="track-name">\${track.name}\${track.explicit ? '<span class="explicit-badge">E</span>' : ''}</div>
              <div class="track-artist">\${track.artists}</div>
            </div>
            <div class="track-duration">\${Math.floor(track.duration_ms / 60000)}:\${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}</div>
          \`;
          trackList.appendChild(item);
        });
        
        section.appendChild(trackList);
        root.appendChild(section);
      }
      
      // Artists section
      if (results.artists && results.artists.length > 0) {
        const section = document.createElement('div');
        section.className = 'section';
        section.innerHTML = '<div class="section-title">Artists</div>';
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        results.artists.forEach(artist => {
          const card = document.createElement('div');
          card.className = 'item-card';
          card.innerHTML = \`
            <img src="\${artist.image || 'https://via.placeholder.com/180'}" class="item-image" style="border-radius: 50%;" alt="\${artist.name}">
            <div class="item-name">\${artist.name}</div>
            <div class="item-meta">\${artist.followers.toLocaleString()} followers</div>
          \`;
          grid.appendChild(card);
        });
        
        section.appendChild(grid);
        root.appendChild(section);
      }
      
      // Albums section
      if (results.albums && results.albums.length > 0) {
        const section = document.createElement('div');
        section.className = 'section';
        section.innerHTML = '<div class="section-title">Albums</div>';
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        results.albums.forEach(album => {
          const card = document.createElement('div');
          card.className = 'item-card';
          card.innerHTML = \`
            <img src="\${album.image || 'https://via.placeholder.com/180'}" class="item-image" alt="\${album.name}">
            <div class="item-name">\${album.name}</div>
            <div class="item-meta">\${album.artists} • \${album.release_date.split('-')[0]}</div>
          \`;
          grid.appendChild(card);
        });
        
        section.appendChild(grid);
        root.appendChild(section);
      }
      
      // Playlists section
      if (results.playlists && results.playlists.length > 0) {
        const section = document.createElement('div');
        section.className = 'section';
        section.innerHTML = '<div class="section-title">Playlists</div>';
        
        const grid = document.createElement('div');
        grid.className = 'items-grid';
        
        results.playlists.forEach(playlist => {
          const card = document.createElement('div');
          card.className = 'item-card';
          card.innerHTML = \`
            <img src="\${playlist.image || 'https://via.placeholder.com/180'}" class="item-image" alt="\${playlist.name}">
            <div class="item-name">\${playlist.name}</div>
            <div class="item-meta">By \${playlist.owner}</div>
          \`;
          grid.appendChild(card);
        });
        
        section.appendChild(grid);
        root.appendChild(section);
      }
      
      // Empty state
      if (totalResults === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = \`
          <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No results found</div>
          <div>Try adjusting your search or check your spelling.</div>
        \`;
        root.appendChild(empty);
      }
    })();
  </script>
</body>
</html>`,
};

// OAuth helper functions
async function getValidAccessToken(env: Env, userId: string): Promise<string> {
  const tokenData = await env.SPOTIFY_TOKENS.get(userId, "json") as any;
  
  if (!tokenData) {
    throw new Error("Not authenticated. Please authenticate with Spotify first.");
  }

  // Check if token is expired
  if (Date.now() >= tokenData.expiresAt) {
    // Refresh the token
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenData.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const newTokenData = await response.json() as any;
    tokenData.accessToken = newTokenData.access_token;
    tokenData.expiresAt = Date.now() + newTokenData.expires_in * 1000;
    
    await env.SPOTIFY_TOKENS.put(userId, JSON.stringify(tokenData));
  }

  return tokenData.accessToken;
}

async function spotifyApiRequest(
  env: Env,
  userId: string,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const accessToken = await getValidAccessToken(env, userId);
  
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${error}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Cloudflare Worker handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type, authorization",
    };

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Handle RPC-style MCP requests
    if (url.pathname === "/mcp" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const method = body.method;
        const userId = body.userId || "default"; // Extract from auth header in production

        let response: any;

        switch (method) {
          case "tools/list":
            response = { tools };
            break;

          case "resources/list":
            response = {
              resources: Object.values(WIDGETS).map((widget) => ({
                uri: widget.templateUri,
                name: widget.title,
                description: `${widget.title} widget markup`,
                mimeType: "text/html+skybridge",
                _meta: widgetMeta(widget),
              })),
            };
            break;

          case "resources/read": {
            const uri = body.params?.uri;
            const htmlFile = uri?.replace("ui://widget/", "");
            const html = UI_COMPONENTS[htmlFile];

            if (!html) {
              return new Response(JSON.stringify({ error: "Resource not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            response = {
              contents: [{
                uri,
                mimeType: "text/html+skybridge",
                text: html,
              }],
            };
            break;
          }

          case "tools/call": {
            const toolName = body.params?.name;
            const args = body.params?.arguments || {};

            response = await handleToolCall(env, userId, toolName, args);
            break;
          }

          default:
            return new Response(JSON.stringify({ error: "Unknown method" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        console.error("Error handling request:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Default 404
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};

async function handleToolCall(env: Env, userId: string, toolName: string, args: any) {
  switch (toolName) {
    case "add_to_library": {
      const parsed = addToLibraryParser.parse(args);
      
      let endpoint = "";
      const ids = [parsed.itemId];
      
      switch (parsed.itemType) {
        case "track":
          endpoint = "/me/tracks";
          break;
        case "album":
          endpoint = "/me/albums";
          break;
        case "artist":
          endpoint = "/me/following?type=artist";
          break;
        case "show":
          endpoint = "/me/shows";
          break;
        case "episode":
          endpoint = "/me/episodes";
          break;
        default:
          throw new Error(`Unsupported item type: ${parsed.itemType}`);
      }

      await spotifyApiRequest(env, userId, endpoint, "PUT", { ids });

      return {
        content: [{ type: "text", text: `Successfully added ${parsed.itemType} to your library.` }],
      };
    }

    case "remove_from_library": {
      const parsed = removeFromLibraryParser.parse(args);
      
      let endpoint = "";
      const ids = [parsed.itemId];
      
      switch (parsed.itemType) {
        case "track":
          endpoint = "/me/tracks";
          break;
        case "album":
          endpoint = "/me/albums";
          break;
        case "artist":
          endpoint = "/me/following?type=artist";
          break;
        case "show":
          endpoint = "/me/shows";
          break;
        case "episode":
          endpoint = "/me/episodes";
          break;
        default:
          throw new Error(`Unsupported item type: ${parsed.itemType}`);
      }

      await spotifyApiRequest(env, userId, endpoint, "DELETE", { ids });

      return {
        content: [{ type: "text", text: `Successfully removed ${parsed.itemType} from your library.` }],
      };
    }

    case "fetch_tracks": {
      const parsed = fetchTracksParser.parse(args);
      
      const data = await spotifyApiRequest(
        env,
        userId,
        `/playlists/${parsed.playlistId}/tracks?offset=${parsed.offset || 0}&limit=${parsed.limit || 100}`
      );

      // Check which tracks are saved
      const trackIds = data.items.map((item: any) => item.track.id);
      const savedStatus = await spotifyApiRequest(
        env,
        userId,
        `/me/tracks/contains?ids=${trackIds.join(",")}`
      );

      const tracks = data.items.map((item: any, index: number) => ({
        id: item.track.id,
        name: item.track.name,
        artists: item.track.artists.map((a: any) => a.name).join(", "),
        album: item.track.album.name,
        duration_ms: item.track.duration_ms,
        explicit: item.track.explicit,
        is_saved: savedStatus[index],
        uri: item.track.uri,
        external_url: item.track.external_urls.spotify,
      }));

      return {
        content: [{ type: "text", text: `Loaded ${tracks.length} tracks from playlist.` }],
        structuredContent: { playlistId: parsed.playlistId, tracks: tracks, total: data.total },
      };
    }

    case "search": {
      const parsed = searchParser.parse(args);

      // Check for audiobook query
      if (parsed.query.toLowerCase().includes("audiobook")) {
        return {
          content: [{
            type: "text",
            text: "You can't search audiobooks on Spotify yet. Try the Spotify app, or search for something else.",
          }],
        };
      }

      const types = parsed.types || ["track", "album", "artist", "playlist"];
      const limit = parsed.limit || 20;
      const market = parsed.market || "US";

      const searchResults = await spotifyApiRequest(
        env,
        userId,
        `/search?q=${encodeURIComponent(parsed.query)}&type=${types.join(",")}&limit=${limit}&market=${market}`
      );

      const results: any = {};

      if (searchResults.tracks) {
        results.tracks = searchResults.tracks.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((a: any) => a.name).join(", "),
          album: track.album.name,
          duration_ms: track.duration_ms,
          explicit: track.explicit,
          uri: track.uri,
          external_url: track.external_urls.spotify,
          image: track.album.images[0]?.url,
        }));
      }

      if (searchResults.albums) {
        results.albums = searchResults.albums.items.map((album: any) => ({
          id: album.id,
          name: album.name,
          artists: album.artists.map((a: any) => a.name).join(", "),
          release_date: album.release_date,
          total_tracks: album.total_tracks,
          uri: album.uri,
          external_url: album.external_urls.spotify,
          image: album.images[0]?.url,
        }));
      }

      if (searchResults.artists) {
        results.artists = searchResults.artists.items.map((artist: any) => ({
          id: artist.id,
          name: artist.name,
          genres: artist.genres,
          followers: artist.followers.total,
          uri: artist.uri,
          external_url: artist.external_urls.spotify,
          image: artist.images[0]?.url,
        }));
      }

      if (searchResults.playlists) {
        results.playlists = searchResults.playlists.items.map((playlist: any) => ({
          id: playlist.id,
          name: playlist.name,
          owner: playlist.owner.display_name,
          tracks_total: playlist.tracks.total,
          uri: playlist.uri,
          external_url: playlist.external_urls.spotify,
          image: playlist.images[0]?.url,
        }));
      }

      return {
        content: [{ type: "text", text: `Found ${Object.values(results).flat().length} results for "${parsed.query}".` }],
        structuredContent: { query: parsed.query, results: results },
        _meta: widgetMeta(WIDGETS.search),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

