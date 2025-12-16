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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
