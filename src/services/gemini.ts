import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getKeyFilesContent, getProjectStructure } from './file-system.js';
import { README_PROMPT, CONTRIBUTING_PROMPT } from '../utils/prompts.js';

dotenv.config();

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async generateReadme(cwd: string, projectName: string, options: { style: string; includeBadges: boolean; sections?: string[]; includeArchitectureDiagram?: boolean; includeERD?: boolean; includeContributingDiagram?: boolean } = { style: 'Professional', includeBadges: true }, onProgress?: (msg: string) => void): Promise<string> {
        const structure = await getProjectStructure(cwd);
        const keyFiles = await getKeyFilesContent(cwd, onProgress);

        if (onProgress) onProgress('Analyzing project relationships and context based on 2.5-flash model...');

        const sectionsText = options.sections ? options.sections.join(', ') : 'All standard sections';

        const prompt = `
      ${README_PROMPT}

      Configuration:
      - Style/Tone: ${options.style} (Adopt this tone for the writing)
      - Include Badges: ${options.includeBadges} (If true, add relevant shields.io badges at the top)
      - Sections to Include: ${sectionsText} (ONLY include these sections + Title/Description)
      - Include Mermaid Architecture Diagram: ${options.includeArchitectureDiagram ?? false}
      - Include Mermaid ERD: ${options.includeERD ?? false}
      - Include Mermaid Contributing Flow: ${options.includeContributingDiagram ?? false}

      Project Name: ${projectName}
      
      Project Structure:
      ${structure}

      Key Files Content:
      ${keyFiles}
    `;

        if (onProgress) onProgress('Generating README content with Gemini 2.5-flash...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async generateContributing(cwd: string, onProgress?: (msg: string) => void): Promise<string> {
        const keyFiles = await getKeyFilesContent(cwd, onProgress);

        if (onProgress) onProgress('Analyzing project context for contribution guidelines...');

        const prompt = `
      ${CONTRIBUTING_PROMPT}

      Project Context (Key Files):
      ${keyFiles}
    `;

        if (onProgress) onProgress('Generating CONTRIBUTING.md...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    async generateLicense(cwd: string, author: string = 'The Maintainers', onProgress?: (msg: string) => void): Promise<string> {
        if (onProgress) onProgress('Analyzing package.json for license info...');
        const prompt = `
      You are an expert in open source licensing.
      Generate a LICENSE file for this project.
      
      If a license is specified in package.json, use that.
      If not, default to MIT License.
      
      Copyright Holder: ${author}
      Year: ${new Date().getFullYear()}

      Output ONLY the license text.
    `;

        if (onProgress) onProgress('Generating LICENSE text...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}
