// src/utils/spotify.js
// Integración con Spotify Web API (OAuth 2.0 PKCE y OEmbed público)
// Permite mostrar qué está escuchando cada estudiante o docente en tiempo real sin requerir backend.

const SPOTIFY_AUTH_STORAGE_KEY = 'englishTech_spotify_auth';
const SPOTIFY_CLIENT_ID_STORAGE_KEY = 'englishTech_spotify_client_id';

// Client ID por defecto (puede sobreescribirse con VITE_SPOTIFY_CLIENT_ID o configurarse en la UI)
export const DEFAULT_SPOTIFY_CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPOTIFY_CLIENT_ID) || 'b2a0c4f6918d45f3964d4bca07e8efd1';

export const getStoredSpotifyClientId = () => {
  try {
    return localStorage.getItem(SPOTIFY_CLIENT_ID_STORAGE_KEY) || DEFAULT_SPOTIFY_CLIENT_ID;
  } catch {
    return DEFAULT_SPOTIFY_CLIENT_ID;
  }
};

export const setStoredSpotifyClientId = (clientId) => {
  try {
    if (clientId) {
      localStorage.setItem(SPOTIFY_CLIENT_ID_STORAGE_KEY, clientId.trim());
    } else {
      localStorage.removeItem(SPOTIFY_CLIENT_ID_STORAGE_KEY);
    }
  } catch {}
};

export const getSpotifyRedirectUri = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
};

// Generador de verifier PKCE seguro (RFC 7636)
export const generateCodeVerifier = (length = 64) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  const randomValues = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      text += possible.charAt(randomValues[i] % possible.length);
    }
  } else {
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
  }
  return text;
};

// Generador de challenge SHA-256 en formato base64url
export const generateCodeChallenge = async (codeVerifier) => {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return codeVerifier;
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Iniciar flujo OAuth PKCE con Spotify
export const initiateSpotifyOAuth = async (customClientId) => {
  const clientId = (customClientId || getStoredSpotifyClientId()).trim();
  if (!clientId) {
    throw new Error('Se requiere un Client ID de Spotify válido.');
  }

  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getSpotifyRedirectUri();

  try {
    sessionStorage.setItem('spotify_code_verifier', verifier);
    sessionStorage.setItem('spotify_auth_state', Date.now().toString());
  } catch {}

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing user-read-playback-state',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true'
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Canjear authorization code por tokens de acceso
export const exchangeSpotifyCode = async (code, customClientId) => {
  const clientId = (customClientId || getStoredSpotifyClientId()).trim();
  let verifier = '';
  try {
    verifier = sessionStorage.getItem('spotify_code_verifier') || '';
    sessionStorage.removeItem('spotify_code_verifier');
  } catch {}

  const redirectUri = getSpotifyRedirectUri();

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error_description || 'Error al autenticar con Spotify');
  }

  const data = await response.json();
  const authData = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    connectedAt: Date.now()
  };

  setStoredSpotifyAuth(authData);
  return authData;
};

// Refrescar access token cuando expire
export const refreshSpotifyToken = async (refreshToken, customClientId) => {
  if (!refreshToken) return null;
  const clientId = (customClientId || getStoredSpotifyClientId()).trim();

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!response.ok) return null;
    const data = await response.json();
    const current = getStoredSpotifyAuth() || {};
    const updated = {
      ...current,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000
    };
    setStoredSpotifyAuth(updated);
    return updated;
  } catch {
    return null;
  }
};

// Obtener sesión de Spotify guardada
export const getStoredSpotifyAuth = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SPOTIFY_AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredSpotifyAuth = (data) => {
  if (typeof window === 'undefined') return;
  try {
    if (data) {
      localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(SPOTIFY_AUTH_STORAGE_KEY);
    }
  } catch {}
};

export const clearStoredSpotifyAuth = () => {
  setStoredSpotifyAuth(null);
};

// Consultar qué se está reproduciendo en tiempo real
export const fetchCurrentlyPlaying = async () => {
  let auth = getStoredSpotifyAuth();
  if (!auth?.accessToken) return null;

  // Si el token está por expirar (dentro de los próximos 60s), refrescarlo
  if (auth.expiresAt && Date.now() > auth.expiresAt - 60000 && auth.refreshToken) {
    const refreshed = await refreshSpotifyToken(auth.refreshToken);
    if (refreshed) {
      auth = refreshed;
    } else {
      return null;
    }
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`
      }
    });

    if (response.status === 204 || response.status === 200) {
      if (response.status === 204) {
        return { isPlaying: false };
      }
      const data = await response.json();
      if (!data || !data.item) {
        return { isPlaying: false };
      }

      const item = data.item;
      const artistNames = (item.artists || []).map(a => a.name).join(', ') || 'Artista desconocido';
      const albumArt = item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '';
      const trackUrl = item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`;

      return {
        isPlaying: Boolean(data.is_playing),
        track: item.name || 'Canción',
        artist: artistNames,
        album: item.album?.name || '',
        albumArt,
        trackUrl,
        progressMs: data.progress_ms || 0,
        durationMs: item.duration_ms || 0,
        updatedAt: Date.now()
      };
    }

    if (response.status === 401 && auth.refreshToken) {
      const refreshed = await refreshSpotifyToken(auth.refreshToken);
      if (refreshed) {
        return fetchCurrentlyPlaying();
      }
    }
  } catch (err) {
    console.warn('Error al consultar Spotify currently playing:', err);
  }

  return null;
};

// Extraer metadatos públicos de un enlace de Spotify vía OEmbed (no requiere API key ni token)
export const fetchSpotifyTrackOembed = async (url) => {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  if (!cleanUrl.includes('spotify.com')) return null;

  try {
    const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();

    // Data.title típicamente es "Nombre de la Canción" o "Artista - Canción"
    let trackName = data.title || 'Canción de Spotify';
    let artistName = '';
    if (trackName.includes(' - ')) {
      const parts = trackName.split(' - ');
      artistName = parts[0].trim();
      trackName = parts.slice(1).join(' - ').trim();
    }

    return {
      isPlaying: true,
      track: trackName,
      artist: artistName || 'Spotify',
      albumArt: data.thumbnail_url || '',
      trackUrl: cleanUrl,
      iframeUrl: data.iframe_url || '',
      provider: 'spotify',
      updatedAt: Date.now(),
      isManual: true
    };
  } catch (err) {
    console.warn('Error al consultar Spotify oembed:', err);
    return null;
  }
};
