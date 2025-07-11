const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import Bluetooth functionality
const { createBluetooth } = require('node-ble');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Spotify configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/callback'
});

let accessToken = null;

// Middleware to check Spotify authentication
const checkSpotifyToken = (req, res, next) => {
  if (!accessToken) {
    return res.status(401).json({ 
      message: 'Non authentifié. Veuillez d\'abord vous connecter via /login' 
    });
  }
  next();
};

// Refresh Spotify access token
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

// Handle Spotify API calls with automatic token refresh
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Spotify authentication routes
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

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];
    const refreshToken = data.body['refresh_token'];
    
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);
    
    // Redirect back to the dashboard
    res.redirect('/');
  } catch (error) {
    console.error('Erreur:', error);
    res.status(401).json({
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// Spotify API routes
app.get('/me', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMe());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.get('/playlists', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getUserPlaylists());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.get('/home/recent', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMyRecentlyPlayedTracks());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.get('/home/featured', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getFeaturedPlaylists());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.get('/home/top/:type', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => 
      spotifyApi.getMyTop(req.params.type));
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.get('/search', checkSpotifyToken, async (req, res) => {
  try {
    const { q, type = 'track,artist,album,playlist,show,episode', limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Terme de recherche requis' });
    }

    const data = await handleSpotifyAction(() => 
      spotifyApi.search(q, type.split(','), { limit: parseInt(limit) })
    );

    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Playback control routes
app.get('/playback/state', checkSpotifyToken, async (req, res) => {
  try {
    const data = await handleSpotifyAction(() => spotifyApi.getMyCurrentPlaybackState());
    res.json(data);
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.put('/playback/play', checkSpotifyToken, async (req, res) => {
  try {
    const { uris, context_uri } = req.body;
    await handleSpotifyAction(() => spotifyApi.play({ uris, context_uri }));
    res.json({ success: true, message: 'Lecture démarrée' });
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.put('/playback/pause', checkSpotifyToken, async (req, res) => {
  try {
    await handleSpotifyAction(() => spotifyApi.pause());
    res.json({ success: true, message: 'Lecture en pause' });
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.post('/playback/next', checkSpotifyToken, async (req, res) => {
  try {
    await handleSpotifyAction(() => spotifyApi.skipToNext());
    res.json({ success: true, message: 'Titre suivant' });
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.post('/playback/previous', checkSpotifyToken, async (req, res) => {
  try {
    await handleSpotifyAction(() => spotifyApi.skipToPrevious());
    res.json({ success: true, message: 'Titre précédent' });
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

app.put('/playback/volume', checkSpotifyToken, async (req, res) => {
  try {
    const { volume_percent } = req.body;
    await handleSpotifyAction(() => spotifyApi.setVolume(volume_percent));
    res.json({ success: true, message: 'Volume modifié' });
  } catch (error) {
    res.status(error.status).json({ message: error.message });
  }
});

// Bluetooth routes
let bluetoothManager = null;

async function initializeBluetooth() {
  try {
    const bluetooth = await createBluetooth();
    const adapter = await bluetooth.defaultAdapter();
    
    if (!adapter) {
      console.log('Aucun adaptateur Bluetooth trouvé');
      return;
    }

    bluetoothManager = {
      adapter,
      isAdvertising: false,
      connectedDevice: null
    };

    console.log('Bluetooth initialisé avec succès');
  } catch (error) {
    console.error('Erreur d\'initialisation Bluetooth:', error);
  }
}

app.get('/api/bluetooth/status', (req, res) => {
  if (!bluetoothManager) {
    return res.json({
      isAdvertising: false,
      connectedDevice: null,
      adapterAvailable: false
    });
  }

  res.json({
    isAdvertising: bluetoothManager.isAdvertising,
    connectedDevice: bluetoothManager.connectedDevice,
    adapterAvailable: !!bluetoothManager.adapter
  });
});

app.post('/api/bluetooth/advertise/start', async (req, res) => {
  try {
    if (!bluetoothManager) {
      return res.status(500).json({ 
        success: false, 
        error: 'Bluetooth non initialisé'
      });
    }

    const gattServer = await bluetoothManager.adapter.gattServer();
    
    // Service Média
    const mediaService = await gattServer.createService('1111');
    await mediaService.createCharacteristic('1111', ['read', 'write', 'notify']);

    // Service Appel
    const callService = await gattServer.createService('1112');
    await callService.createCharacteristic('1112', ['read', 'write', 'notify']);

    await bluetoothManager.adapter.startAdvertising({
      name: 'Car Dashboard',
      serviceUuids: ['1111', '1112']
    });

    bluetoothManager.isAdvertising = true;
    res.json({ success: true, message: 'Advertising démarré' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Erreur lors du démarrage de l\'advertising'
    });
  }
});

app.post('/api/bluetooth/advertise/stop', async (req, res) => {
  try {
    if (!bluetoothManager) {
      return res.status(500).json({ 
        success: false, 
        error: 'Bluetooth non initialisé'
      });
    }

    await bluetoothManager.adapter.stopAdvertising();
    bluetoothManager.isAdvertising = false;
    res.json({ success: true, message: 'Advertising arrêté' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Erreur lors de l\'arrêt de l\'advertising'
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log('Initialisation du Bluetooth...');
  await initializeBluetooth();
});