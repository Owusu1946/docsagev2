import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';

export class GitService {
    /**
     * Downloads a repository as a ZIP and extracts it
     * Works without git binary (perfect for Vercel/Serverless)
     */
    async downloadRepository(repoUrl: string): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsage-'));
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        const zipPath = path.join(tempDir, 'repo.zip');
        const extractPath = path.join(tempDir, repoName);

        // GitHub ZIP URL (defaults to HEAD of default branch)
        // Format: https://github.com/user/repo/archive/HEAD.zip
        const zipUrl = `${repoUrl.replace(/\.git$/, '')}/archive/HEAD.zip`;

        logger.info(`Downloading ${zipUrl}...`);

        try {
            const response = await fetch(zipUrl);

            if (!response.ok) {
                throw new Error(`Failed to download repo: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            // Stream download to file
            const fileStream = createWriteStream(zipPath);
            // @ts-ignore - ReadableStream to Readable compatibility
            await pipeline(Readable.fromWeb(response.body), fileStream);

            logger.info('Extracting repository...');

            const zip = new AdmZip(zipPath);
            zip.extractAllTo(tempDir, true);

            // GitHub zips usually extract to a folder like 'repo-main', find it
            const files = await fs.readdir(tempDir);
            const extractedDir = files.find(f => f !== 'repo.zip' && !f.startsWith('.')) || repoName;

            return path.join(tempDir, extractedDir);

        } catch (error: any) {
            // Cleanup on failure
            await this.cleanup(tempDir);
            throw new Error(`Failed to download repository: ${error.message}`);
        } finally {
            // Try to remove the zip file to save space
            try { await fs.unlink(zipPath); } catch { }
        }
    }

    /**
     * Cleans up the temporary directory
     */
    async cleanup(dirPath: string): Promise<void> {
        // Wait a bit for file locks to release (common on Windows)
        await new Promise(resolve => setTimeout(resolve, 500));

        let targetDir = dirPath;
        // If we are deep inside (e.g. docsage-xyz/repo-main), go up to docsage-xyz
        if (!path.basename(path.dirname(dirPath)).startsWith('docsage-')) {
            targetDir = path.dirname(dirPath);
        }

        let retries = 3;
        while (retries > 0) {
            try {
                // Ensure recursive force removal
                await fs.rm(targetDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
                logger.info('Cleaned up temporary files');
                return; // Success
            } catch (error: any) {
                retries--;
                if (retries === 0) {
                    logger.warning(`Failed to cleanup temporary directory ${targetDir}: ${error.message || error}`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    }

    /**
     * Validates if a string is a valid GitHub URL
     */
    isValidUrl(url: string): boolean {
        return url.startsWith('https://github.com/') || url.startsWith('git@github.com:');
    }
}
