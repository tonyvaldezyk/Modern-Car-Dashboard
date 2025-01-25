const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());

const PORT = 8889;

//Route test
app.get('/test', (req, res) => {
    res.send('bluetoothApi en marche !');
});

app.listen(PORT, () => {
    console.log(`bluetoothApi en marche sur http://localhost:${PORT}`);
});