import { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import { GitService } from '../../../src/services/git-service.js';
import { GeminiService } from '../../../src/services/gemini.js';
import { getProjectStructure, getKeyFilesContent } from '../../../src/services/file-system.js';
import { logger } from '../../../src/utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();


const gitService = new GitService();
const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '');

// Simple in-memory cache
// Key: repoUrl, Value: { structure, keyFiles, timestamp }
interface CacheEntry {
    structure: string;
    keyFiles: string;
    timestamp: number;
}
const contextCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export const chatWithRepo = async (req: Request, res: Response) => {
    const { repoUrl, message, history } = req.body;
    let tempPath = '';

    if (!repoUrl || !message) {
        return res.status(400).json({ error: 'Missing repoUrl or message' });
    }

    try {
        let structure = '';
        let keyFiles = '';

        // 1. Check Cache
        const cached = contextCache[repoUrl];
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            logger.info(`Using cached context for ${repoUrl}`);
            structure = cached.structure;
            keyFiles = cached.keyFiles;
        } else {
            logger.info(`Cache miss or expired. Cloning ${repoUrl}...`);

            // 2. Clone & Scan
            tempPath = await gitService.cloneRepository(repoUrl);
            structure = await getProjectStructure(tempPath);
            keyFiles = await getKeyFilesContent(tempPath);

            // 3. Update Cache
            contextCache[repoUrl] = {
                structure,
                keyFiles,
                timestamp: Date.now()
            };
        }

        logger.info(`Processing Chat: ${message}`);

        // 4. Ask AI
        const reply = await geminiService.chatTheCodebase(message, {
            structure,
            keyFiles,
            history
        });

        res.json({ success: true, reply });

    } catch (error: any) {
        logger.error(`Chat Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Chat failed',
            details: error.message,
            stack: error.stack
        });
    } finally {
        if (tempPath) {
            await gitService.cleanup(tempPath);
        }
    }
};

