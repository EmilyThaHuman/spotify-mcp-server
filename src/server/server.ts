import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "http://0.0.0.0:8000/auth/callback";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

type SpotifyWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

// Store OAuth state and tokens in memory (use database in production)
const authSessions = new Map<string, { accessToken: string; refreshToken: string; expiresAt: number }>();
const pendingAuthStates = new Map<string, { sessionId: string; createdAt: number }>();

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "npm run build" before starting the server.`
    );
  }

  // Try direct path first
  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    // Check for versioned files like "component-hash.html"
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    } else {
      // Check in src/components subdirectory as fallback
      const nestedPath = path.join(ASSETS_DIR, "src", "components", `${componentName}.html`);
      if (fs.existsSync(nestedPath)) {
        htmlContents = fs.readFileSync(nestedPath, "utf8");
      }
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "npm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetMeta(widget: SpotifyWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: SpotifyWidget[] = [
  {
    id: "search",
    title: "Spotify Search",
    templateUri: "ui://widget/spotify-search.html",
    invoking: "Asking Spotify",
    invoked: "Asked Spotify",
    html: readWidgetHtml("spotify-search"),
    responseText: "Found Spotify content",
  },
];

const widgetsById = new Map<string, SpotifyWidget>();
const widgetsByUri = new Map<string, SpotifyWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

// Tool input schemas
const addToLibrarySchema = {
  type: "object" as const,
  properties: {
    itemType: {
      type: "string" as const,
      description: "Type of content to add",
      enum: ["track", "album", "artist", "playlist", "show", "episode"] as const,
    },
    itemId: {
      type: "string" as const,
      description: "Spotify ID of the item to add",
    },
  },
  required: ["itemType", "itemId"],
  additionalProperties: false,
};

const removeFromLibrarySchema = {
  type: "object" as const,
  properties: {
    itemType: {
      type: "string" as const,
      description: "Type of content to remove",
      enum: ["track", "album", "artist", "playlist", "show", "episode"] as const,
    },
    itemId: {
      type: "string" as const,
      description: "Spotify ID of the item to remove",
    },
  },
  required: ["itemType", "itemId"],
  additionalProperties: false,
};

const fetchTracksSchema = {
  type: "object" as const,
  properties: {
    playlistId: {
      type: "string" as const,
      description: "Spotify playlist ID",
    },
    offset: {
      type: "number" as const,
      description: "The index of the first item to return",
    },
    limit: {
      type: "number" as const,
      description: "Maximum number of items to return (max 100)",
    },
  },
  required: ["playlistId"],
  additionalProperties: false,
};

const searchSchema = {
  type: "object" as const,
  properties: {
    query: {
      type: "string" as const,
      description: "Search query string",
    },
    types: {
      type: "array" as const,
      items: {
        type: "string" as const,
        enum: ["track", "album", "artist", "playlist", "show", "episode"] as const,
      },
      description: "Types of content to search for",
    },
    limit: {
      type: "number" as const,
      description: "Maximum number of results per type (max 50)",
    },
    market: {
      type: "string" as const,
      description: "ISO 3166-1 alpha-2 country code",
    },
  },
  required: ["query"],
  additionalProperties: false,
};

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

const tools: Tool[] = [
  {
    name: "add_to_library",
    description: "Adds supported Spotify content to the authenticated user's library. Supported types: tracks, albums, artists (follow), playlists, podcast shows, podcast episodes. Audiobooks and audiobook chapters are not supported. Requires a valid Spotify user account (Free or Premium). Do NOT call from free-form chat. This tool is only for widget actions (e.g., user clicks Save/+ on a result in the Spotify widget). Do not trigger on behalf of third parties or external systems. Only invoke for items that were returned by the Spotify Search tool; do not act on arbitrary or unseen items.",
    inputSchema: addToLibrarySchema,
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Adding to your Spotify library",
      "openai/toolInvocation/invoked": "Added to your Spotify library",
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: false,
    },
  },
  {
    name: "remove_from_library",
    description: "Removes supported Spotify content from the authenticated user's library. Supported types: tracks, albums, artists (unfollow), playlists, podcast shows, podcast episodes. Audiobooks and audiobook chapters are not supported. Requires a valid Spotify user account (Free or Premium). Do NOT call from free-form chat. This tool is only for widget actions (e.g., user clicks Remove/- on a result in the Spotify widget). Do not trigger on behalf of third parties or external systems. Only invoke for items that were returned by the Spotify Search tool; do not act on arbitrary or unseen items.",
    inputSchema: removeFromLibrarySchema,
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Removing from your Spotify library",
      "openai/toolInvocation/invoked": "Removed from your Spotify library",
    },
    annotations: {
      destructiveHint: true,
      openWorldHint: false,
      readOnlyHint: false,
    },
  },
  {
    name: "fetch_tracks",
    description: "Fetches detailed metadata for a playlist including all tracks with their saved status, explicit flags, and deep links. Supported types: playlist only. Requires a valid Spotify user account (Free or Premium) and a playlist owned or shared with the authenticated user. Do NOT call from free-form chat. This tool should only be called within the Spotify Widget and must not be triggered directly by the user. Use only for playlist items returned by the Spotify Search tool or created in the current widget session; do not act on arbitrary or unseen items.",
    inputSchema: fetchTracksSchema,
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Loading playlist tracks",
      "openai/toolInvocation/invoked": "Loaded playlist tracks",
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
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
    inputSchema: searchSchema,
    _meta: widgetMeta(widgetsById.get("search")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
];

const resources: Resource[] = Array.from(widgetsById.values()).map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = Array.from(widgetsById.values()).map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

// OAuth helper functions
function generateAuthUrl(state: string): string {
  const scopes = [
    "user-library-read",
    "user-library-modify",
    "user-follow-read",
    "user-follow-modify",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-read-recently-played",
  ];

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    scope: scopes.join(" "),
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }

  return response.json();
}

async function getValidAccessToken(sessionId: string): Promise<string> {
  const session = authSessions.get(sessionId);
  
  if (!session) {
    throw new Error("Not authenticated. Please authenticate with Spotify first.");
  }

  // Check if token is expired
  if (Date.now() >= session.expiresAt) {
    // Refresh the token
    const tokenData = await refreshAccessToken(session.refreshToken);
    session.accessToken = tokenData.access_token;
    session.expiresAt = Date.now() + tokenData.expires_in * 1000;
    authSessions.set(sessionId, session);
  }

  return session.accessToken;
}

async function spotifyApiRequest(
  sessionId: string,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const accessToken = await getValidAccessToken(sessionId);
  
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

function createSpotifyServer(sessionId: string): Server {
  const server = new Server(
    {
      name: "spotify-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;

      // Check authentication for all tools
      if (!authSessions.has(sessionId)) {
        // Generate auth URL
        const state = crypto.randomBytes(16).toString("hex");
        pendingAuthStates.set(state, { sessionId, createdAt: Date.now() });
        const authUrl = generateAuthUrl(state);

        return {
          content: [
            {
              type: "text",
              text: `Please authenticate with Spotify to use this feature. Visit: ${authUrl}`,
            },
          ],
        };
      }

      switch (toolName) {
        case "add_to_library": {
          const args = addToLibraryParser.parse(request.params.arguments ?? {});
          
          let endpoint = "";
          let ids = [args.itemId];
          
          switch (args.itemType) {
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
              throw new Error(`Unsupported item type: ${args.itemType}`);
          }

          await spotifyApiRequest(sessionId, endpoint, "PUT", { ids });

          return {
            content: [
              {
                type: "text",
                text: `Successfully added ${args.itemType} to your library.`,
              },
            ],
          };
        }

        case "remove_from_library": {
          const args = removeFromLibraryParser.parse(request.params.arguments ?? {});
          
          let endpoint = "";
          let ids = [args.itemId];
          
          switch (args.itemType) {
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
              throw new Error(`Unsupported item type: ${args.itemType}`);
          }

          await spotifyApiRequest(sessionId, endpoint, "DELETE", { ids });

          return {
            content: [
              {
                type: "text",
                text: `Successfully removed ${args.itemType} from your library.`,
              },
            ],
          };
        }

        case "fetch_tracks": {
          const args = fetchTracksParser.parse(request.params.arguments ?? {});
          
          const data = await spotifyApiRequest(
            sessionId,
            `/playlists/${args.playlistId}/tracks?offset=${args.offset || 0}&limit=${args.limit || 100}`
          );

          // Check which tracks are saved
          const trackIds = data.items.map((item: any) => item.track.id);
          const savedStatus = await spotifyApiRequest(
            sessionId,
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
            content: [
              {
                type: "text",
                text: `Loaded ${tracks.length} tracks from playlist.`,
              },
            ],
            structuredContent: {
              playlistId: args.playlistId,
              tracks: tracks,
              total: data.total,
            },
          };
        }

        case "search": {
          const args = searchParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get("search")!;

          // Check for audiobook query
          if (args.query.toLowerCase().includes("audiobook")) {
            return {
              content: [
                {
                  type: "text",
                  text: "You can't search audiobooks on Spotify yet. Try the Spotify app, or search for something else.",
                },
              ],
            };
          }

          const types = args.types || ["track", "album", "artist", "playlist"];
          const limit = args.limit || 20;
          const market = args.market || "US";

          const searchResults = await spotifyApiRequest(
            sessionId,
            `/search?q=${encodeURIComponent(args.query)}&type=${types.join(",")}&limit=${limit}&market=${market}`
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
            content: [
              {
                type: "text",
                text: `Found ${Object.values(results).flat().length} results for "${args.query}".`,
              },
            ],
            structuredContent: {
              query: args.query,
              results: results,
            },
            _meta: widgetMeta(widget),
          };
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";
const authCallbackPath = "/auth/callback";

async function handleSseRequest(res: ServerResponse, sessionId?: string) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const actualSessionId = sessionId || crypto.randomBytes(16).toString("hex");
  const server = createSpotifyServer(actualSessionId);
  const transport = new SSEServerTransport(postPath, res);

  sessions.set(transport.sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(transport.sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(transport.sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

async function handleAuthCallback(_req: IncomingMessage, res: ServerResponse, url: URL) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" }).end(`
      <html>
        <body>
          <h1>Authentication Failed</h1>
          <p>Error: ${error}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `);
    return;
  }

  if (!code || !state) {
    res.writeHead(400).end("Missing code or state parameter");
    return;
  }

  const pendingAuth = pendingAuthStates.get(state);
  
  if (!pendingAuth) {
    res.writeHead(400).end("Invalid or expired state parameter");
    return;
  }

  // Clean up old states (older than 10 minutes)
  const now = Date.now();
  for (const [key, value] of pendingAuthStates.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      pendingAuthStates.delete(key);
    }
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    
    authSessions.set(pendingAuth.sessionId, {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
    });

    pendingAuthStates.delete(state);

    res.writeHead(200, { "Content-Type": "text/html" }).end(`
      <html>
        <body>
          <h1>Successfully Connected to Spotify!</h1>
          <p>You can now close this window and return to your chat.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Failed to exchange code for token", error);
    res.writeHead(500, { "Content-Type": "text/html" }).end(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>${error.message}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `);
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === authCallbackPath) {
      await handleAuthCallback(req, res, url);
      return;
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Spotify MCP server listening on http://0.0.0.0:${port}`);
  console.log(`  SSE stream: GET http://0.0.0.0:${port}${ssePath}`);
  console.log(`  Message post endpoint: POST http://0.0.0.0:${port}${postPath}?sessionId=...`);
  console.log(`  OAuth callback: GET http://0.0.0.0:${port}${authCallbackPath}`);
  console.log(`\nMake sure to set your environment variables:`);
  console.log(`  SPOTIFY_CLIENT_ID=<your_client_id>`);
  console.log(`  SPOTIFY_CLIENT_SECRET=<your_client_secret>`);
  console.log(`  SPOTIFY_REDIRECT_URI=${SPOTIFY_REDIRECT_URI}`);
});

