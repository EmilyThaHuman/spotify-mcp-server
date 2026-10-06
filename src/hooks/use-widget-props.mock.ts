export function useWidgetProps<T extends Record<string, unknown>>(
  _defaultState?: T | (() => T)
): T {
  // Mock data for spotify widgets
  const mockData = {
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

  return mockData as unknown as T;
}










