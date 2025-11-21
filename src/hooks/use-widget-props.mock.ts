import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  // Mock data for spotify widgets
  const mockData = {
    query: 'jazz piano',
    results: {
      tracks: [
        {
          id: '1',
          name: 'Take Five',
          artists: 'Dave Brubeck Quartet',
          album: 'Time Out',
          duration_ms: 324000,
          image: 'https://i.scdn.co/image/ab67616d0000b273e3d2a0c7e5e7e7e7e7e7e7e7',
          explicit: false,
          uri: 'spotify:track:1',
          external_url: 'https://open.spotify.com/track/1',
        },
        {
          id: '2',
          name: 'Autumn Leaves',
          artists: 'Bill Evans',
          album: 'Portrait in Jazz',
          duration_ms: 287000,
          image: 'https://i.scdn.co/image/ab67616d0000b273a1b2c3d4e5f6a7b8c9d0e1f2',
          explicit: false,
          uri: 'spotify:track:2',
          external_url: 'https://open.spotify.com/track/2',
        },
        {
          id: '3',
          name: 'So What',
          artists: 'Miles Davis',
          album: 'Kind of Blue',
          duration_ms: 562000,
          image: 'https://i.scdn.co/image/ab67616d0000b273f1e2d3c4b5a6978869706162',
          explicit: false,
          uri: 'spotify:track:3',
          external_url: 'https://open.spotify.com/track/3',
        },
        {
          id: '4',
          name: 'Round Midnight',
          artists: 'Thelonious Monk',
          album: 'Genius of Modern Music',
          duration_ms: 318000,
          image: 'https://i.scdn.co/image/ab67616d0000b273a2b3c4d5e6f7a8b9c0d1e2f3',
          explicit: false,
          uri: 'spotify:track:4',
          external_url: 'https://open.spotify.com/track/4',
        },
        {
          id: '5',
          name: 'Blue in Green',
          artists: 'Miles Davis, Bill Evans',
          album: 'Kind of Blue',
          duration_ms: 337000,
          image: 'https://i.scdn.co/image/ab67616d0000b273f1e2d3c4b5a6978869706162',
          explicit: false,
          uri: 'spotify:track:5',
          external_url: 'https://open.spotify.com/track/5',
        },
      ],
    },
  };

  return mockData as unknown as T;
}









