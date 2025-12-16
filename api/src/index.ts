import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateDocs } from './controllers/docs.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.send('DocSage v2 API is running 🚀');
});

// Generate Docs Endpoint
app.post('/api/generate-docs', generateDocs);

// Keep-alive mechanism for Render
const KEEP_ALIVE_URL = 'https://docsagev2.onrender.com';

const pingKeepAlive = async () => {
    try {
        console.log(`[Keep-Alive] Pinging ${KEEP_ALIVE_URL}...`);
        const response = await fetch(KEEP_ALIVE_URL);
        console.log(`[Keep-Alive] Status: ${response.status}`);
    } catch (error: any) {
        console.error(`[Keep-Alive] Failed: ${error.message}`);
    }
};

// Ping once on startup (after 10s) to verify connection
setTimeout(pingKeepAlive, 10000);

// Ping every 10 minutes
setInterval(pingKeepAlive, 10 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
