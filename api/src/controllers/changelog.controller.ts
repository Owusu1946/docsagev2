import { Request, Response } from 'express';
import { GitService } from '../../../src/services/git-service.js';
import { GeminiService } from '../../../src/services/gemini.js';
import { logger } from '../../../src/utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const gitService = new GitService();
const geminiService = new GeminiService(process.env.GEMINI_API_KEY || '');

export const generateChangelog = async (req: Request, res: Response) => {
    const { repoUrl, limit } = req.body;
    let tempPath = '';

    if (!repoUrl) {
        return res.status(400).json({ error: 'Missing repoUrl' });
    }

    try {
        const fetchLimit = limit || 100;
        logger.info(`Generating Changelog for ${repoUrl} (limit: ${fetchLimit})`);

        // 1. Clone
        tempPath = await gitService.cloneRepository(repoUrl);

        // 2. Extract History
        const commits = await gitService.getCommitLog(tempPath, fetchLimit);
        logger.info(`Extracted ${commits.length} commits`);

        // 3. Generate Changelog
        const changelog = await geminiService.generateChangelog(commits);

        res.json({ success: true, changelog });

    } catch (error: any) {
        logger.error(`Changelog Error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: 'Changelog generation failed',
            details: error.message
        });
    } finally {
        if (tempPath) {
            await gitService.cleanup(tempPath);
        }
    }
};
