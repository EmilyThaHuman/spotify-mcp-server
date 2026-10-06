import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';

// Import widget
import SpotifySearch from '../components/spotify-search';

// Mock data for preview mode
const mockSpotifySearch = {
  query: '',
  results: {
    tracks: [
      {
        id: '2FAZskT9yRjp2Oow9szJD8',
        uri: 'spotify:track:2FAZskT9yRjp2Oow9szJD8',
        name: 'The Days - NOTION Remix',
        album: 'The Days (NOTION Remix)',
        image: 'https://i.scdn.co/image/ab67616d0000b2739041b9965925059507fb44af',
        artists: 'Chrystal, NOTION',
        explicit: false,
        duration_ms: 233229,
        external_url: 'https://open.spotify.com/track/2FAZskT9yRjp2Oow9szJD8',
      },
      {
        id: '0nrRP2bk19rLc0orkWPQk2',
        uri: 'spotify:track:0nrRP2bk19rLc0orkWPQk2',
        name: 'Wake Me Up',
        album: 'True',
        image: 'https://i.scdn.co/image/ab67616d0000b273e14f11f796cef9f9a82691a7',
        artists: 'Avicii',
        explicit: false,
        duration_ms: 247426,
        external_url: 'https://open.spotify.com/track/0nrRP2bk19rLc0orkWPQk2',
      },
      {
        id: '6qn9YLKt13AGvpq9jfO8py',
        uri: 'spotify:track:6qn9YLKt13AGvpq9jfO8py',
        name: 'We Found Love',
        album: 'Talk That Talk',
        image: 'https://i.scdn.co/image/ab67616d0000b273bef074de9ca825bddaeb9f46',
        artists: 'Rihanna, Calvin Harris',
        explicit: false,
        duration_ms: 215226,
        external_url: 'https://open.spotify.com/track/6qn9YLKt13AGvpq9jfO8py',
      },
      {
        id: '3cZajhyr8LmtPfHZ9296tj',
        uri: 'spotify:track:3cZajhyr8LmtPfHZ9296tj',
        name: 'No Broke Boys',
        album: 'No Broke Boys',
        image: 'https://i.scdn.co/image/ab67616d0000b2735dcede7ece7b2cb72cee4eee',
        artists: 'Disco Lines, Tinashe',
        explicit: true,
        duration_ms: 163994,
        external_url: 'https://open.spotify.com/track/3cZajhyr8LmtPfHZ9296tj',
      },
      {
        id: '536L9C0N7vhYdibCJx3cI2',
        uri: 'spotify:track:536L9C0N7vhYdibCJx3cI2',
        name: 'The Wreck of the Edmund Fitzgerald',
        album: 'Summertime Dream',
        image: 'https://i.scdn.co/image/ab67616d0000b2737e12e3a6154eb79f0ee4b36c',
        artists: 'Gordon Lightfoot',
        explicit: false,
        duration_ms: 389280,
        external_url: 'https://open.spotify.com/track/536L9C0N7vhYdibCJx3cI2',
      },
      {
        id: '5QdDGGw9KsHjHbILaIFRqb',
        uri: 'spotify:track:5QdDGGw9KsHjHbILaIFRqb',
        name: 'The Wreck of the Edmund Fitzgerald',
        album: 'The Wreck of the Edmund Fitzgerald',
        image: 'https://i.scdn.co/image/ab67616d0000b2731324b6612d2041a5e9c2da8f',
        artists: 'Home Free',
        explicit: false,
        duration_ms: 366933,
        external_url: 'https://open.spotify.com/track/5QdDGGw9KsHjHbILaIFRqb',
      },
      {
        id: '2E7FWjLnz2oityrVVU04uM',
        uri: 'spotify:track:2E7FWjLnz2oityrVVU04uM',
        name: 'The Wreck of the Edmund Fitzgerald',
        album: 'Songbook',
        image: 'https://i.scdn.co/image/ab67616d0000b2730375c7c45bcd78168b30c714',
        artists: 'Gordon Lightfoot',
        explicit: false,
        duration_ms: 388800,
        external_url: 'https://open.spotify.com/track/2E7FWjLnz2oityrVVU04uM',
      },
      {
        id: '7kjQTlVdjlNr8o37OhDpIm',
        uri: 'spotify:track:7kjQTlVdjlNr8o37OhDpIm',
        name: 'The Wreck of the Edmund Fitzgerald',
        album: 'Caught in the Net',
        image: 'https://i.scdn.co/image/ab67616d0000b2734ddec75f1f92094716f3ba83',
        artists: 'The Longest Johns',
        explicit: false,
        duration_ms: 289000,
        external_url: 'https://open.spotify.com/track/7kjQTlVdjlNr8o37OhDpIm',
      },
      {
        id: '3WUVzOFltfSz7AU648MGq4',
        uri: 'spotify:track:3WUVzOFltfSz7AU648MGq4',
        name: 'Wreck of the Edmund Fitzgerald',
        album: 'Hell on Church Street',
        image: 'https://i.scdn.co/image/ab67616d0000b273e993ac49dc78a4e83313f797',
        artists: 'Punch Brothers',
        explicit: false,
        duration_ms: 285976,
        external_url: 'https://open.spotify.com/track/3WUVzOFltfSz7AU648MGq4',
      },
    ],
  },
};

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Inject mock data and mock OpenAI API into window
  useEffect(() => {
    (window as any).__WIDGET_PROPS__ = mockSpotifySearch;
    
    // Mock OpenAI API for preview mode
    if (!(window as any).openai) {
      (window as any).openai = {
        theme: isDark ? 'dark' : 'light',
        displayMode: 'inline',
        maxHeight: 600,
        toolInput: {},
        toolOutput: mockSpotifySearch,
        toolResponseMetadata: null,
        widgetState: null,
        setWidgetState: async (state: any) => {
          console.log('[Mock] setWidgetState called:', state);
          (window as any).openai.widgetState = state;
          // Trigger a custom event to notify the widget
          window.dispatchEvent(new CustomEvent('openai:set_globals', {
            detail: { globals: { widgetState: state } }
          }));
        },
        callTool: async (name: string, args: any) => {
          console.log('[Mock] callTool called:', name, args);
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          // Simulate success
          return { result: `Successfully called ${name}` };
        },
        sendFollowUpMessage: async (args: any) => {
          console.log('[Mock] sendFollowUpMessage called:', args);
        },
        openExternal: (payload: any) => {
          console.log('[Mock] openExternal called:', payload);
          window.open(payload.href, '_blank');
        },
        requestDisplayMode: async (args: any) => {
          console.log('[Mock] requestDisplayMode called:', args);
          return { mode: args.mode };
        },
      };
    }
    
    return () => {
      delete (window as any).__WIDGET_PROPS__;
    };
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Spotify Search Widget
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Preview with theme toggle
        </p>
      </div>

      <div className="w-[760px]">
        <SpotifySearch />
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}








