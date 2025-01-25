const express = require('express');
const app = express();
const noble = require('@abandonware/noble');
const cors = require('cors');
const PORT = 8889;
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

class BluetoothApi {
    constructor() {
        this.isScanning = false;
        this.discoveredDevices = new Map();
        this.connectedDevice = null;
        this.isConnected = false;  
        
        // Configuration des événements Bluetooth
        noble.on('stateChange', (state) => {
            console.log('État Bluetooth:', state);
        });

        noble.on('discover', (peripheral) => {
            const device = {
                id: peripheral.id,
                name: peripheral.advertisement.localName || 'Inconnu'
            };
            this.discoveredDevices.set(peripheral.id, device);
            console.log('Appareil découvert:', device.name);
        });
    }

    async scanDevices() {
        if (this.isScanning) {
            throw new Error('Le scan est déjà en cours');
        }

        if (noble.state !== 'poweredOn') {
            throw new Error('Bluetooth non disponible. État actuel: ' + noble.state);
        }

        this.isScanning = true;
        this.discoveredDevices.clear();
        console.log('Démarrage du scan...');

        return new Promise((resolve, reject) => {
            try {
                noble.startScanning([], true);

                setTimeout(async () => {
                    await noble.stopScanningAsync();
                    this.isScanning = false;
                    console.log('Scan terminé');
                    resolve(Array.from(this.discoveredDevices.values()));
                }, 20000);
            } catch (error) {
                this.isScanning = false;
                reject(error);
            }
        });
    }

    // Device connection
    async connectToDevice(deviceId) {
        if (this.isConnected) {
            throw new Error('Déjà connecté à un appareil');
        }

        const peripheral = await noble.peripheralAsync(deviceId);
        if (!peripheral) {
            throw new Error('Appareil non trouvé');
        }

        console.log('Tentative de connexion...');
        await peripheral.connectAsync();
        console.log('Connecté à:', peripheral.advertisement.localName);

        // services discovery
        const services = await peripheral.discoverServicesAsync([]);
        console.log('Services découverts:', services.length);

        this.connectedDevice = peripheral;
        this.isConnected = true;

        return {
            id: peripheral.id,
            name: peripheral.advertisement.localName,
            services: services.map(service => ({
                uuid: service.uuid,
                type: this.getServiceType(service.uuid)
            }))
        };
    }

    getServiceType(uuid) {  
        // UUIDs standard Bluetooth pour différents services
        const serviceTypes = {
            '110a': 'Media',
            '1130': 'Phonebook',
            '111e': 'Handsfree',
            '111f': 'Audio Gateway'
        };
        
        return serviceTypes[uuid] || 'Unknown';
    }

}
// Instance creation
const bluetoothManager = new BluetoothApi();

// Route racine
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bienvenue sur l\'API Bluetooth',
        endpoints: {
            test: '/test',
            scan: '/scan'
        }
    });
});

// Route de test
app.get('/test', (req, res) => {
    res.json({ 
        message: 'API Bluetooth opérationnelle',
        bluetoothState: noble.state 
    });
});

// Scan route
app.get('/scan', async (req, res) => {
    try {
        const devices = await bluetoothManager.scanDevices();
        res.json({
            success: true,
            deviceCount: devices.length,
            devices: devices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            bluetoothState: noble.state
        });
    }
});

// Route de connexion
app.post('/connect/:deviceId', async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const connectionInfo = await bluetoothManager.connectToDevice(deviceId);
        res.json({
            success: true,
            message: 'Connecté avec succès',
            device: connectionInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`API Bluetooth en écoute sur http://localhost:${PORT}`);
    console.log(`État Bluetooth initial: ${noble.state}`);
});


