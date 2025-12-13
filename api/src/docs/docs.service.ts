import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GitService } from '../lib/services/git-service.js';
import { GeminiService } from '../lib/services/gemini.js';
import { scanCodebase } from '../lib/services/codebase-scanner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Service to handle documentation generation via API
 * Replicates the logic from CLI remote repo mode
 */
@Injectable()
export class DocsService {
    private readonly logger = new Logger(DocsService.name);

    async generateDocs(repoUrl: string): Promise<{ readme: string }> {
        const gitService = new GitService();

        // We need the API key from environment
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new InternalServerErrorException('GEMINI_API_KEY not configured in API');
        }

        const gemini = new GeminiService(apiKey);

        if (!gitService.isValidUrl(repoUrl)) {
            throw new BadRequestException('Invalid repository URL');
        }

        let tempPath = '';

        try {
            this.logger.log(`Downloading ${repoUrl}...`);
            tempPath = await gitService.downloadRepository(repoUrl);

            this.logger.log(`Scanning codebase at ${tempPath}...`);
            const analysis = await scanCodebase(tempPath);

            this.logger.log(`Generating README with AI...
            Analysis Stats:
            - Files: ${analysis.stats.analyzedFiles} scanned / ${analysis.stats.totalFiles} total
            - Codebase Size: ${analysis.stats.totalLines.toLocaleString()} lines
            - Dependencies: ${analysis.dependencies.nodes.length} packages detected
            `);
            const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repository';

            // Use the advanced generation
            const readme = await gemini.generateReadmeAdvanced(repoName, analysis, {
                style: 'Professional',
                includeBadges: true
            });

            return { readme };

        } catch (error: any) {
            this.logger.error(`Failed to generate docs: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Documentation generation failed: ${error.message}`);
        } finally {
            if (tempPath) {
                await gitService.cleanup(tempPath);
            }
        }
    }
}

// Needed for BadRequestException in the service import
import { BadRequestException } from '@nestjs/common';
