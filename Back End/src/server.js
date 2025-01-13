// Importation des packages nécessaires
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const bodyParser = require('body-parser');
let accessToken = null;
require('dotenv').config();

// Création de l'application Express
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration de Spotify
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Middleware pour vérifier l'authentification
const checkToken = (req, res, next) => {
  if (!accessToken) {
    return res.status(401).json({ 
      message: 'Non authentifié. Veuillez d\'abord vous connecter via /login' 
    });
  }
  next();
};

// Rafraîchissement automatique du token
async function refreshAccessToken() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    accessToken = data.body['access_token'];
    spotifyApi.setAccessToken(accessToken);
    return true;
  } catch (error) {
    console.error('Erreur refresh token:', error);
    return false;
  }
}

// Fonction pour gérer la gestion des routes Spotify
async function handleSpotifyAction(action) {
  try {
    const result = await action();
    return result.body;
  } catch (error) {
    if (error.statusCode === 401) {
      if (await refreshAccessToken()) {
        const result = await action();
        return result.body;
      }
      throw { status: 401, message: 'Token expiré' };
    }
    throw { status: error.statusCode || 500, message: error.message };
  }
}

// Route de base pour tester la connexion au serveur
app.get('/', (req, res) => {
  res.send('Serveur en marche !');
});

// Route pour se connecter à Spotify
app.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'user-library-modify',      
    'user-read-playback-state', 
    'user-modify-playback-state', 
    'playlist-read-private',    
    'playlist-read-collaborative', 
    'user-read-recently-played', 
    'user-top-read',           
    'user-follow-read',
    'streaming' 
  ];
  const url = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(url);
});

// Route pour gérer le callback Spotify
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];  // Sauvegarde du token
    const refreshToken = data.body['refresh_token'];
    
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);
    
    res.json({
      message: 'Connexion réussie !',
      accessToken: accessToken
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(401).json({
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Route pour obtenir les informations du profil utilisateur
app.get('/me', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMe());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Route pour obtenir les playlists de l'utilisateur
app.get('/playlists', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getUserPlaylists());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Récupérer les playlists récemment jouées
app.get('/home/recent', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMyRecentlyPlayedTracks());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Récupérer les mix personnalisés
app.get('/home/featured', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getFeaturedPlaylists());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Top artistes et titres
app.get('/home/top/:type', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => 
      spotifyApi.getMyTop(req.params.type)); // type peut être 'tracks' ou 'artists'
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Recherche
app.get('/search', checkToken, async (req, res) => {
  try {
    const { q, type = 'track,artist,album,playlist,show,episode', limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Terme de recherche requis' });
    }

    console.log('Recherche avec:', { q, type, limit });

    const data = await handleSpotifyAction(() => 
      spotifyApi.search(q, type.split(','), { limit: parseInt(limit) })
    );

    console.log('Réponse Spotify brute:', data);

    // Vérification plus précise de la réponse
    if (!data || typeof data !== 'object') {
      return res.status(500).json({ message: 'Réponse Spotify invalide' });
    }

    // Transformation des clés de recherche
    const searchTypes = type.split(',').map(t => t + 's');
    const response = {};

    // Parcours des types de recherche demandés
    searchTypes.forEach(searchType => {
      const items = data[searchType]?.items;
      if (items && Array.isArray(items)) {
        response[searchType] = items.filter(item => item !== null).map(item => ({
          id: item.id,
          name: item.name,
          uri: item.uri,
          ...(searchType === 'tracks' && {
            artist: item.artists?.[0]?.name,
            duration: item.duration_ms
          }),
          ...(searchType === 'shows' && {
            publisher: item.publisher
          }),
          ...(searchType === 'episodes' && {
            show: item.show?.name,
            duration: item.duration_ms
          })
        }));
      }
    });

    // Calcul du total uniquement si nous avons des résultats
    response.total = Object.values(response).reduce((sum, array) => 
      sum + (Array.isArray(array) ? array.length : 0), 0
    );

    console.log('Réponse finale:', response);

    res.json(response);
  } catch (error) {
    console.error('Erreur de recherche:', error);
    res.status(500).json({ message: error.message });
  }
});

// Obtenir les titres likés
app.get('/library/tracks', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMySavedTracks());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Ajouter/Retirer des favoris
app.post('/library/tracks', checkToken, async (req, res) => {
  try {
    const { trackId, action } = req.body;
    const data = await handleSpotifyAction(() => 
      action === 'add' 
        ? spotifyApi.addToMySavedTracks([trackId])
        : spotifyApi.removeFromMySavedTracks([trackId])
    );
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

////GESTION DE LA LECTURE////

// Lecture aléatoire
app.put('/player/shuffle', checkToken, async (req, res) => {
  try {
    const { state } = req.body; // true ou false
    const data = await handleSpotifyAction(() => spotifyApi.setShuffle(state));
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// État de lecture actuel (incluant shuffle)
app.get('/player/state', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMyCurrentPlaybackState());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

////CONTRÔLES DE LECTURE////

// Play/Pause
app.put('/player/play', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.play());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.put('/player/pause', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.pause());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Navigation
app.post('/player/next', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.skipToNext());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.post('/player/previous', checkToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.skipToPrevious());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Position et Volume
app.put('/player/seek', checkToken, async (req, res) => {
  try {
    const { position_ms } = req.body;
    const data = await handleSpotifyAction(() => spotifyApi.seek(position_ms));
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.put('/player/volume', checkToken, async (req, res) => {
  try {
    const { volume_percent } = req.body;
    const data = await handleSpotifyAction(() => spotifyApi.setVolume(volume_percent));
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});



// Démarrage du serveur
const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});