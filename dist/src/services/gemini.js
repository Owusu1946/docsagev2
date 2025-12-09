import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getKeyFilesContent, getProjectStructure } from './file-system.js';
import { README_PROMPT, CONTRIBUTING_PROMPT } from '../utils/prompts.js';
dotenv.config();
export class GeminiService {
    genAI;
    model;
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    async generateReadme(cwd, projectName, options = { style: 'Professional', includeBadges: true }, onProgress) {
        const structure = await getProjectStructure(cwd);
        const keyFiles = await getKeyFilesContent(cwd, onProgress);
        if (onProgress)
            onProgress('Analyzing project relationships and context...');
        const sectionsText = options.sections ? options.sections.join(', ') : 'All standard sections';
        let unifiedInstructions = '';
        if (options.mergeDocs) {
            unifiedInstructions = `
      UNIFIED MODE ENABLED:
      - The "Contributing (Full)" section should contain COMPLETE contribution guidelines including:
        * How to report bugs
        * How to request features
        * Development setup instructions
        * Code style guidelines
        * Pull Request process
        * Use a Mermaid gitGraph or sequenceDiagram for the PR workflow
      - The "License (Full Text)" section should contain the COMPLETE ${options.licenseType || 'MIT'} license text.
        * Copyright Year: ${new Date().getFullYear()}
        * Copyright Holder: ${options.author || 'The Maintainers'}
      `;
        }
        const prompt = `
      ${README_PROMPT}

      Configuration:
      - Style/Tone: ${options.style} (Adopt this tone for the writing)
      - Include Badges: ${options.includeBadges} (If true, add relevant shields.io badges at the top)
      - Sections to Include: ${sectionsText} (ONLY include these sections + Title/Description)
      - Include Mermaid Architecture Diagram: ${options.includeArchitectureDiagram ?? false}
      - Include Mermaid ERD: ${options.includeERD ?? false}
      - Include Mermaid Contributing Flow: ${options.includeContributingDiagram ?? false}
      ${unifiedInstructions}

      Project Name: ${projectName}
      
      Project Structure:
      ${structure}

      Key Files Content:
      ${keyFiles}
    `;
        if (onProgress)
            onProgress('Generating README content with Gemini...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    async generateContributing(cwd, options = { codeOfConduct: 'Contributor Covenant', includeTemplates: false }, onProgress) {
        const keyFiles = await getKeyFilesContent(cwd, onProgress);
        if (onProgress)
            onProgress('Analyzing project context for contribution guidelines...');
        const prompt = `
      ${CONTRIBUTING_PROMPT}

      Configuration:
      - Code of Conduct: ${options.codeOfConduct} (Include this code of conduct, or omit if "None")
      - Include Issue/PR Templates: ${options.includeTemplates} (If true, add example templates in markdown code blocks)

      Project Context (Key Files):
      ${keyFiles}
    `;
        if (onProgress)
            onProgress('Generating CONTRIBUTING.md...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    async generateLicense(cwd, options = { licenseType: 'MIT', author: 'The Maintainers' }, onProgress) {
        if (onProgress)
            onProgress(`Generating ${options.licenseType} license...`);
        const prompt = `
      You are an expert in open source licensing.
      Generate the COMPLETE and EXACT text for the ${options.licenseType} license.
      
      Copyright Holder: ${options.author}
      Year: ${new Date().getFullYear()}

      Output ONLY the license text, nothing else. No markdown formatting, no explanations.
    `;
        if (onProgress)
            onProgress('Generating LICENSE text...');
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
}
