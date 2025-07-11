# 🚗 Car Dashboard - Bluetooth & Spotify Integration

Un tableau de bord moderne pour voiture avec intégration Bluetooth et Spotify, offrant un contrôle complet de la musique et des appels.

## ✨ Fonctionnalités

### 🎵 Lecteur de Musique Spotify
- **Authentification Spotify** - Connexion sécurisée à votre compte
- **Contrôle de lecture** - Play/Pause, Précédent/Suivant
- **Gestion des playlists** - Affichage et lecture de vos playlists
- **Recherche en temps réel** - Recherche de titres, artistes, albums
- **Contrôle du volume** - Ajustement du volume Spotify
- **Mise à jour en temps réel** - État de lecture et progression automatique
- **Artwork des albums** - Affichage des pochettes d'albums

### 📱 Connexion Bluetooth
- **Web Bluetooth API** - Connexion directe aux appareils Bluetooth
- **Services média et appel** - Gestion des notifications Bluetooth
- **Connexion stable** - Reconnexion automatique
- **Interface intuitive** - État de connexion en temps réel

### 🎨 Interface Moderne
- **Design responsive** - Compatible mobile et desktop
- **Animations fluides** - Transitions et effets visuels
- **Notifications toast** - Retour utilisateur en temps réel
- **Thème sombre/clair** - Interface adaptative
- **Icônes Font Awesome** - Interface professionnelle

## 🚀 Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn
- Compte Spotify Developer
- Navigateur supportant Web Bluetooth API (Chrome, Edge)

### 1. Cloner le projet
```bash
git clone <repository-url>
cd Back\ End
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Spotify
1. Créez une application sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Notez votre `CLIENT_ID` et `CLIENT_SECRET`
3. Ajoutez `http://localhost:3000/callback` dans les Redirect URIs

### 4. Configuration des variables d'environnement
```bash
cp .env.example .env
```

Éditez le fichier `.env` :
```env
CLIENT_ID=votre_spotify_client_id
CLIENT_SECRET=votre_spotify_client_secret
REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

### 5. Démarrer le serveur
```bash
# Mode développement (avec auto-reload)
npm run dev

# Mode production
npm start
```

Le dashboard sera accessible sur `http://localhost:3000`

## 📖 Utilisation

### Connexion Spotify
1. Cliquez sur "Se connecter à Spotify"
2. Autorisez l'application dans Spotify
3. Vous serez redirigé vers le dashboard

### Contrôle de la musique
- **Play/Pause** : Bouton central
- **Précédent/Suivant** : Boutons latéraux
- **Volume** : Curseur de volume
- **Recherche** : Barre de recherche en haut
- **Playlists** : Cliquez sur une playlist pour la lire

### Connexion Bluetooth
1. Cliquez sur "Connecter"
2. Sélectionnez votre appareil dans la liste
3. L'état de connexion s'affichera en temps réel

## 🔧 Configuration Avancée

### Ports personnalisés
Modifiez le port dans `.env` :
```env
PORT=8080
```

### URL de redirection personnalisée
Pour le déploiement en production :
```env
REDIRECT_URI=https://votre-domaine.com/callback
```

### Services Bluetooth personnalisés
Modifiez les UUIDs dans `src/server.js` :
```javascript
const MEDIA_SERVICE_UUID = 'votre_uuid_media';
const CALL_SERVICE_UUID = 'votre_uuid_appel';
```

## 🛠️ Structure du Projet

```
Back End/
├── src/
│   ├── public/
│   │   └── index.html          # Interface utilisateur
│   ├── server.js               # Serveur principal
│   ├── Spotify_api.js          # API Spotify (legacy)
│   └── bluetoothApi.js         # API Bluetooth (legacy)
├── package.json
├── .env.example
└── README.md
```

## 🔌 API Endpoints

### Spotify
- `GET /me` - Informations utilisateur
- `GET /playlists` - Playlists de l'utilisateur
- `GET /search` - Recherche de contenu
- `GET /playback/state` - État de lecture actuel
- `PUT /playback/play` - Démarrer la lecture
- `PUT /playback/pause` - Mettre en pause
- `POST /playback/next` - Titre suivant
- `POST /playback/previous` - Titre précédent
- `PUT /playback/volume` - Contrôler le volume

### Bluetooth
- `GET /api/bluetooth/status` - État Bluetooth
- `POST /api/bluetooth/advertise/start` - Démarrer l'advertising
- `POST /api/bluetooth/advertise/stop` - Arrêter l'advertising

## 🐛 Dépannage

### Problèmes de connexion Spotify
- Vérifiez vos `CLIENT_ID` et `CLIENT_SECRET`
- Assurez-vous que l'URL de redirection est correcte
- Vérifiez que votre application Spotify est active

### Problèmes Bluetooth
- Assurez-vous que votre navigateur supporte Web Bluetooth
- Vérifiez que Bluetooth est activé sur votre appareil
- Autorisez l'accès Bluetooth dans votre navigateur

### Problèmes de serveur
- Vérifiez que le port 3000 n'est pas utilisé
- Assurez-vous que toutes les dépendances sont installées
- Consultez les logs du serveur pour plus de détails

## 🤝 Contribution

1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence ISC.

## 🙏 Remerciements

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Web Bluetooth API](https://web.dev/bluetooth/)
- [Font Awesome](https://fontawesome.com/)
- [Inter Font](https://rsms.me/inter/)