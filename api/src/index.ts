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
// Health check (Keep-alive target)
app.get('/', (req, res) => {
    res.send('DocSage v2 API is running 🚀');
});

// Detailed Diagnostic Health Check
app.get('/api/health', async (req, res) => {
    const diagnostics: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            nodeVersion: process.version,
            hasApiKey: !!process.env.GEMINI_API_KEY
        }
    };

    // Check Git
    try {
        const { spawnSync } = await import('child_process');
        const gitCheck = spawnSync('git', ['--version']);
        diagnostics.git = {
            available: gitCheck.error ? false : true,
            version: gitCheck.stdout?.toString().trim() || 'unknown'
        };
    } catch (e: any) {
        diagnostics.git = { available: false, error: e.message };
    }

    // Check Write Access
    try {
        const fs = await import('fs/promises');
        const os = await import('os');
        const path = await import('path');
        const testFile = path.join(os.tmpdir(), 'health-check.tmp');
        await fs.writeFile(testFile, 'ok');
        await fs.unlink(testFile);
        diagnostics.filesystem = { writable: true, tmpDir: os.tmpdir() };
    } catch (e: any) {
        diagnostics.filesystem = { writable: false, error: e.message };
        diagnostics.status = 'degraded';
    }

    if (!diagnostics.env.hasApiKey || !diagnostics.git.available) {
        diagnostics.status = 'error';
        return res.status(500).json(diagnostics);
    }

    res.json(diagnostics);
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

app.get('/api/generate-docs', (req, res) => {
    res.send(`
        <html>
            <body style="background:#09090b; color:#e4e4e7; font-family:sans-serif; height:100vh; display:flex; align-items:center; justify-content:center; text-align:center;">
                <div>
                    <h1>⚠️ Method Not Allowed</h1>
                    <p>You cannot visit this URL directly in the browser (GET request).</p>
                    <p>Please use the <a href="/test.html" style="color:#8b5cf6">Test Page</a> or send a POST request.</p>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
