import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { GeminiService } from '../../../src/services/gemini.js';
import { scanCodebase } from '../../../src/services/codebase-scanner.js';
import { GitService } from '../../../src/services/git-service.js';
import { logger } from '../../../src/utils/logger.js';

export const generateDocs = async (req: Request, res: Response) => {
    const { repoUrl, style = 'Professional', author, includeBadges = true } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!repoUrl) {
        return res.status(400).json({ error: 'Repo URL is required' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Gemini API Key missing' });
    }

    const gitService = new GitService();
    let tempPath = '';

    try {
        // 1. Validate
        if (!gitService.isValidUrl(repoUrl)) {
            return res.status(400).json({ error: 'Invalid GitHub URL' });
        }

        console.log(`Processing request for: ${repoUrl}`);

        // 2. Clone
        tempPath = await gitService.cloneRepository(repoUrl);

        // 3. Scan
        const analysis = await scanCodebase(tempPath);

        // 4. Generate
        const gemini = new GeminiService(apiKey);
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';

        const readme = await gemini.generateReadmeAdvanced(repoName, analysis, {
            style,
            includeBadges,
            author
        });

        // 5. Cleanup & Respond
        await gitService.cleanup(tempPath);
        tempPath = ''; // clear so finally block doesn't retry

        res.json({
            success: true,
            repoName,
            markdown: readme,
            stats: analysis.stats
        });

    } catch (error: any) {
        logger.error(`API Error: ${error.message}`);
        res.status(500).json({
            error: 'Documentation generation failed',
            details: error.message,
            stack: error.stack // Temporary for debugging
        });
    } finally {
        if (tempPath) {
            await gitService.cleanup(tempPath);
        }
    }
};
