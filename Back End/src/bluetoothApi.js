const express = require('express');
const { createBluetooth } = require('node-ble');
const cors = require('cors');

const app = express();
const PORT = 8889;

app.use(cors());
app.use(express.json());

// Définition des UUIDs des services
const MEDIA_SERVICE_UUID = '1111';
const CALL_SERVICE_UUID = '1112';

class BluetoothPeripheral {
    constructor() {
        this.isAdvertising = false;
        this.connectedDevice = null;
        this.bluetooth = null;
        this.adapter = null;
        this.initializeBluetooth();
    }

    async initializeBluetooth() {
        try {
            console.log('Initialisation du Bluetooth...');
            this.bluetooth = await createBluetooth();
            
            // Obtention de l'adaptateur
            this.adapter = await this.bluetooth.defaultAdapter();
            if (!this.adapter) {
                throw new Error('Pas d\'adaptateur Bluetooth trouvé');
            }

            // Activation de l'adaptateur s'il n'est pas déjà activé
            if (!await this.adapter.isDiscoverable()) {
                await this.adapter.setDiscoverable(true);
            }

            console.log('Bluetooth initialisé avec succès');
            this.startAdvertising();
        } catch (error) {
            console.error('Erreur d\'initialisation Bluetooth:', error);
        }
    }

    async startAdvertising() {
        try {
            if (!this.adapter) {
                throw new Error('Adaptateur Bluetooth non initialisé');
            }

            // Configuration des services
            const gattServer = await this.adapter.gattServer();
            
            // Service Média
            const mediaService = await gattServer.createService(MEDIA_SERVICE_UUID);
            const mediaCharacteristic = await mediaService.createCharacteristic(
                '1111',
                ['read', 'write', 'notify']
            );

            // Service Appel
            const callService = await gattServer.createService(CALL_SERVICE_UUID);
            const callCharacteristic = await callService.createCharacteristic(
                '1112',
                ['read', 'write', 'notify']
            );

            // Démarrage de l'advertising
            await this.adapter.startAdvertising({
                name: 'Car Dashboard',
                serviceUuids: [MEDIA_SERVICE_UUID, CALL_SERVICE_UUID]
            });

            this.isAdvertising = true;
            console.log('Advertising démarré');

            // Gestion des connexions
            this.adapter.on('device', async (device) => {
                console.log('Nouvel appareil détecté:', await device.getName());
                this.connectedDevice = {
                    name: await device.getName(),
                    address: await device.getAddress()
                };
            });

        } catch (error) {
            console.error('Erreur lors du démarrage de l\'advertising:', error);
            throw error;
        }
    }

    async stopAdvertising() {
        try {
            if (this.adapter) {
                await this.adapter.stopAdvertising();
                this.isAdvertising = false;
                console.log('Advertising arrêté');
            }
        } catch (error) {
            console.error('Erreur lors de l\'arrêt de l\'advertising:', error);
            throw error;
        }
    }

    getStatus() {
        return {
            isAdvertising: this.isAdvertising,
            connectedDevice: this.connectedDevice,
            adapterAvailable: !!this.adapter
        };
    }
}

// Création de l'instance du gestionnaire Bluetooth
const bluetoothManager = new BluetoothPeripheral();

// Routes API
app.get('/api/bluetooth/status', (req, res) => {
    res.json(bluetoothManager.getStatus());
});

app.post('/api/bluetooth/advertise/start', async (req, res) => {
    try {
        await bluetoothManager.startAdvertising();
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
        await bluetoothManager.stopAdvertising();
        res.json({ success: true, message: 'Advertising arrêté' });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            message: 'Erreur lors de l\'arrêt de l\'advertising'
        });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur Bluetooth démarré sur http://localhost:${PORT}`);
});