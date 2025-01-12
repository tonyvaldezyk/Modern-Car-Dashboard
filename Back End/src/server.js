// Importation des packages nécessaires
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
let accessToken = null;
require('dotenv').config();

// Création de l'application Express
const app = express();

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

// Route de base pour tester la connexion au serveur
app.get('/', (req, res) => {
  res.send('Serveur en marche !');
});

// Route pour se connecter à Spotify
app.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read'
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
    const result = await spotifyApi.getMe();
    res.json(result.body);
  } catch (error) {
    res.status(401).json({
      message: 'Non autorisé',
      error: error.message
    });
  }
});

// Route pour obtenir les playlists de l'utilisateur
app.get('/playlists', checkToken, async (req, res) => {
  try {
    const result = await spotifyApi.getUserPlaylists();
    res.json(result.body);
  } catch (error) {
    res.status(401).json({
      message: 'Non autorisé',
      error: error.message
    });
  }
});

// Démarrage du serveur
const PORT = 8888;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});