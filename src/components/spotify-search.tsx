import React, { useState } from 'react';
import { useWidgetProps } from '../hooks';
import { useDisplayMode } from '../hooks/use-display-mode';
import '../styles/index.css';
import { cn } from '../lib/utils';

interface Track {
  id: string;
  name: string;
  artists: string;
  album: string;
  duration_ms: number;
  image: string;
  explicit: boolean;
  uri: string;
  external_url: string;
}

interface SpotifySearchProps extends Record<string, unknown> {
  query?: string;
  results?: {
    tracks?: Track[];
    [key: string]: any;
  };
}

const SpotifySearch: React.FC<SpotifySearchProps> = (defaultProps) => {
  const props = useWidgetProps<SpotifySearchProps>(defaultProps || {
    query: '',
    results: {},
  });

  const displayMode = useDisplayMode();
  const isDark = (displayMode as string) === 'dark' || 
    (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { results = {} } = props;
  const [addedTracks, setAddedTracks] = useState<Set<string>>(new Set());

  // Calculate total results
  const totalResults = Object.values(results).reduce((sum, arr) => {
    return sum + (Array.isArray(arr) ? arr.length : 0);
  }, 0);

  // Handle add button click
  const handleAddTrack = (track: Track) => {
    setAddedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(track.id)) {
        newSet.delete(track.id);
      } else {
        newSet.add(track.id);
      }
      return newSet;
    });

    // Send message to parent
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'spotify-track-add',
        data: {
          action: addedTracks.has(track.id) ? 'remove' : 'add',
          track: track,
        },
      }, '*');
    }
  };

  // Handle track play
  const handleTrackPlay = (track: Track) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'spotify-track-play',
        data: {
          type: 'track',
          id: track.id,
          uri: track.uri,
          url: track.external_url,
        },
      }, '*');
    }
  };

  const tracks = results.tracks || [];

  return (
    <div className={cn(
      "w-full",
      isDark ? "bg-transparent text-[#ececec]" : "bg-transparent text-[#2d2d2d]"
    )}>
      {/* Tracks Section */}
      {tracks.length > 0 && (
        <div className={cn(
          "rounded-3xl overflow-hidden border",
          isDark
            ? "bg-[#2a2a2a] border-[#3a3a3a]"
            : "bg-white border-gray-200"
        )}>
          {tracks.slice(0, 20).map((track, index) => {
            return (
              <div key={track.id}>
                <div
                  onClick={() => handleTrackPlay(track)}
                  className={cn(
                    "flex items-center gap-3 p-4 transition-colors duration-150",
                    "cursor-pointer relative",
                    isDark
                      ? "hover:bg-white/[0.05]"
                      : "hover:bg-black/[0.02]"
                  )}
                >
                  <img
                    src={track.image || 'https://via.placeholder.com/48'}
                    alt={track.name}
                    className="w-14 h-14 rounded-lg flex-shrink-0 object-cover"
                  />

                  <div className="flex-1 min-w-0 mr-3">
                    <div className={cn(
                      "text-[15px] font-medium overflow-hidden text-ellipsis whitespace-nowrap mb-1 leading-tight",
                      isDark ? "text-white" : "text-[#2d2d2d]"
                    )}>
                      {track.name}
                      {track.explicit && (
                        <span className="inline-block ml-1.5 px-1.5 py-0.5 bg-gray-400 text-white rounded text-[9px] font-bold uppercase align-middle">
                          E
                        </span>
                      )}
                    </div>
                    <div className={cn(
                      "text-[13px] overflow-hidden text-ellipsis whitespace-nowrap",
                      isDark ? "text-[#a0a0a0]" : "text-gray-600"
                    )}>
                      {track.artists} • {track.album}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTrack(track);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-opacity duration-150",
                      "flex-shrink-0 opacity-70 hover:opacity-100"
                    )}
                    aria-label="Add to library"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className={cn(
                        isDark ? "text-white" : "text-gray-900"
                      )}
                    >
                      <path d="M11.999 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-11 9c0-6.075 4.925-11 11-11s11 4.925 11 11-4.925 11-11 11-11-4.925-11-11"></path>
                      <path d="M17.999 12a1 1 0 0 1-1 1h-4v4a1 1 0 1 1-2 0v-4h-4a1 1 0 1 1 0-2h4V7a1 1 0 1 1 2 0v4h4a1 1 0 0 1 1 1"></path>
                    </svg>
                  </button>
                </div>
                {index < tracks.length - 1 && (
                  <div className={cn(
                    "h-px mx-4",
                    isDark ? "bg-[#3a3a3a]" : "bg-gray-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {totalResults === 0 && (
        <div className={cn(
          "text-center py-15 px-5 rounded-3xl border",
          isDark
            ? "text-[#808080] bg-[#2a2a2a] border-[#3a3a3a]"
            : "text-gray-500 bg-white border-gray-200"
        )}>
          <div className="text-6xl mb-5 opacity-50">🎵</div>
          <div className={cn(
            "text-xl font-semibold mb-2.5",
            isDark ? "text-[#ececec]" : "text-[#2d2d2d]"
          )}>
            No results found
          </div>
          <div className={cn(
            "text-sm",
            isDark ? "text-[#a0a0a0]" : "text-gray-600"
          )}>
            Try adjusting your search or check your spelling.
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifySearch;








