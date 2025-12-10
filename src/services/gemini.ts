import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getKeyFilesContent, getProjectStructure } from './file-system.js';
import { README_PROMPT, CONTRIBUTING_PROMPT, README_ADVANCED_PROMPT } from '../utils/prompts.js';
import type { CodebaseAnalysis } from './codebase-scanner.js';

dotenv.config();

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async generateReadme(
    cwd: string,
    projectName: string,
    options: {
      style: string;
      includeBadges: boolean;
      sections?: string[];
      includeArchitectureDiagram?: boolean;
      includeERD?: boolean;
      includeContributingDiagram?: boolean;
      mergeDocs?: boolean;
      licenseType?: string;
      author?: string;
    } = { style: 'Professional', includeBadges: true },
    onProgress?: (msg: string) => void
  ): Promise<string> {
    const structure = await getProjectStructure(cwd);
    const keyFiles = await getKeyFilesContent(cwd, onProgress);

    if (onProgress) onProgress('Analyzing project relationships and context...');

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

    if (onProgress) onProgress('Generating README content with Gemini...');
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateContributing(
    cwd: string,
    options: { codeOfConduct: string; includeTemplates: boolean } = { codeOfConduct: 'Contributor Covenant', includeTemplates: false },
    onProgress?: (msg: string) => void
  ): Promise<string> {
    const keyFiles = await getKeyFilesContent(cwd, onProgress);

    if (onProgress) onProgress('Analyzing project context for contribution guidelines...');

    const prompt = `
      ${CONTRIBUTING_PROMPT}

      Configuration:
      - Code of Conduct: ${options.codeOfConduct} (Include this code of conduct, or omit if "None")
      - Include Issue/PR Templates: ${options.includeTemplates} (If true, add example templates in markdown code blocks)

      Project Context (Key Files):
      ${keyFiles}
    `;

    if (onProgress) onProgress('Generating CONTRIBUTING.md...');
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateLicense(
    cwd: string,
    options: { licenseType: string; author: string } = { licenseType: 'MIT', author: 'The Maintainers' },
    onProgress?: (msg: string) => void
  ): Promise<string> {
    if (onProgress) onProgress(`Generating ${options.licenseType} license...`);

    const prompt = `
      You are an expert in open source licensing.
      Generate the COMPLETE and EXACT text for the ${options.licenseType} license.
      
      Copyright Holder: ${options.author}
      Year: ${new Date().getFullYear()}

      Output ONLY the license text, nothing else. No markdown formatting, no explanations.
    `;

    if (onProgress) onProgress('Generating LICENSE text...');
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async generateCodeOfConduct(
    options: { conductType: string; contactEmail: string } = { conductType: 'Contributor Covenant', contactEmail: '' },
    onProgress?: (msg: string) => void
  ): Promise<string> {
    if (onProgress) onProgress(`Generating ${options.conductType} Code of Conduct...`);

    const prompt = `
      You are an expert in open source community standards.
      Generate the COMPLETE and EXACT text for the ${options.conductType} Code of Conduct (version 2.1 if Contributor Covenant).
      
      Contact Email for reporting: ${options.contactEmail}

      The output MUST be valid Markdown with proper headings and formatting.
      Include:
      - Our Pledge
      - Our Standards (expected and unacceptable behavior)
      - Enforcement Responsibilities
      - Scope
      - Enforcement
      - Enforcement Guidelines (with Impact levels)
      - Attribution

      Output ONLY the Code of Conduct markdown, nothing else. No extra explanations.
    `;

    if (onProgress) onProgress('Generating CODE_OF_CONDUCT.md...');
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Generate README using advanced codebase analysis with AST parsing,
   * dependency graphs, pattern detection, and API discovery.
   */
  async generateReadmeAdvanced(
    projectName: string,
    analysis: CodebaseAnalysis,
    options: {
      style?: string;
      includeBadges?: boolean;
      sections?: string[];
      licenseType?: string;
      author?: string;
    } = {},
    onProgress?: (msg: string) => void
  ): Promise<string> {
    if (onProgress) onProgress('Preparing context for Gemini...');

    // Build structured context from analysis
    const contextParts: string[] = [];

    // Project stats
    contextParts.push(`## Project Statistics`);
    contextParts.push(`- Total Files: ${analysis.stats.totalFiles}`);
    contextParts.push(`- Analyzed Source Files: ${analysis.stats.analyzedFiles}`);
    contextParts.push(`- Lines of Code: ~${analysis.stats.totalLines.toLocaleString()}`);

    // Tech stack (VERIFIED from package.json)
    contextParts.push(`\n## Verified Tech Stack`);
    if (analysis.techStack.frameworks.length > 0) {
      contextParts.push(`Frameworks: ${analysis.techStack.frameworks.join(', ')}`);
    }
    if (analysis.techStack.databases.length > 0) {
      contextParts.push(`Databases: ${analysis.techStack.databases.join(', ')}`);
    }
    if (analysis.techStack.tools.length > 0) {
      contextParts.push(`Tools: ${analysis.techStack.tools.join(', ')}`);
    }
    contextParts.push(`Package Manager: ${analysis.techStack.packageManager}`);

    // Detected patterns (from AST analysis)
    if (analysis.patterns.length > 0) {
      contextParts.push(`\n## Detected Architectural Patterns`);
      analysis.patterns.forEach(p => {
        contextParts.push(`- **${p.name}** (${Math.round(p.confidence * 100)}% confidence): ${p.description}`);
        contextParts.push(`  Files: ${p.files.slice(0, 3).join(', ')}${p.files.length > 3 ? '...' : ''}`);
      });
    }

    // API endpoints (from code analysis)
    if (analysis.apis.length > 0) {
      contextParts.push(`\n## Discovered API Endpoints`);
      contextParts.push(`| Method | Path | Framework | File |`);
      contextParts.push(`|--------|------|-----------|------|`);
      analysis.apis.slice(0, 20).forEach(api => {
        contextParts.push(`| ${api.method} | ${api.path} | ${api.framework} | ${api.file} |`);
      });
      if (analysis.apis.length > 20) {
        contextParts.push(`\n_...and ${analysis.apis.length - 20} more endpoints_`);
      }
    }

    // Dependency graph insights
    if (analysis.dependencies.coreModules.length > 0) {
      contextParts.push(`\n## Core Modules (Most Imported)`);
      analysis.dependencies.coreModules.forEach(m => {
        contextParts.push(`- ${m}`);
      });
    }

    if (analysis.dependencies.entryPoints.length > 0) {
      contextParts.push(`\n## Entry Points`);
      analysis.dependencies.entryPoints.forEach(e => {
        contextParts.push(`- ${e}`);
      });
    }

    // File structure summary
    contextParts.push(`\n## Key Files`);
    analysis.structure.slice(0, 20).forEach(f => {
      const exportsStr = f.exports.length > 0 ? ` (exports: ${f.exports.slice(0, 3).join(', ')})` : '';
      contextParts.push(`- ${f.relativePath}${exportsStr}`);
    });

    const sectionsText = options.sections?.join(', ') || 'All standard sections';

    const prompt = `
      ${README_ADVANCED_PROMPT}

      Configuration:
      - Style/Tone: ${options.style || 'Professional'}
      - Include Badges: ${options.includeBadges ?? true}
      - Sections: ${sectionsText}
      - License: ${options.licenseType || 'MIT'}
      - Author: ${options.author || 'The Maintainers'}

      Project Name: ${projectName}
      
      === DEEP CODEBASE ANALYSIS ===
      ${contextParts.join('\n')}
      
      === AI-GENERATED SUMMARY ===
      ${analysis.summary}
    `;

    if (onProgress) onProgress('Generating README with Gemini 2.5 Flash...');
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}
