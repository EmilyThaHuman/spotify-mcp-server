import React from 'react';
import ReactDOM from 'react-dom/client';
import SpotifySearch from './spotify-search';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SpotifySearch />
    </React.StrictMode>
  );
}









