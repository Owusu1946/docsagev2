import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

export class GitService {
    /**
     * Clones a repository to a temporary directory
     * Uses shallow clone (depth 1) for speed
     */
    async cloneRepository(repoUrl: string): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docsage-'));
        const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
        const targetDir = path.join(tempDir, repoName);

        logger.info(`Cloning ${repoUrl} to temporary directory...`);

        return new Promise((resolve, reject) => {
            const git = spawn('git', ['clone', '--depth', '1', repoUrl, targetDir]);

            git.on('close', (code) => {
                if (code === 0) {
                    resolve(targetDir);
                } else {
                    reject(new Error(`Git clone failed with code ${code}`));
                }
            });

            git.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Cleans up the temporary directory
     */
    async cleanup(dirPath: string): Promise<void> {
        try {
            // Traverse up to the temp parent created by mkdtemp (which is one level up from the repo dir)
            // The structure is: /tmp/docsage-XXXXXX/repo-name
            // We want to remove /tmp/docsage-XXXXXX
            const parentDir = path.dirname(dirPath);
            await fs.rm(parentDir, { recursive: true, force: true });
            logger.info('Cleaned up temporary files');
        } catch (error) {
            logger.warning(`Failed to cleanup temporary directory ${dirPath}: ${error}`);
        }
    }

    /**
     * Validates if a string is a valid GitHub URL
     */
    isValidUrl(url: string): boolean {
        return url.startsWith('https://github.com/') || url.startsWith('git@github.com:');
    }
}
