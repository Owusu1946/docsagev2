import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { getKeyFilesContent, getProjectStructure } from './file-system.js';
import { README_PROMPT, CONTRIBUTING_PROMPT, README_ADVANCED_PROMPT, README_UPDATE_PROMPT } from '../utils/prompts.js';
import type { CodebaseAnalysis } from './codebase-scanner.js';

interface UpdateOperation {
  op: 'insert' | 'replace';
  section: string;
  content: string;
}

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

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
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

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
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

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
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

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
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

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  }

  /**
   * Incrementally update README based on git diff
   */
  async updateReadme(
    projectName: string,
    currentReadme: string,
    diff: string,
    commitMessage: string,
    onProgress?: (msg: string) => void
  ): Promise<string> {
    if (onProgress) onProgress('Analyzing code changes for documentation updates...');

    const prompt = `
      ${README_UPDATE_PROMPT}

      INPUT DATA:
      - Project Name: ${projectName}
      - Commit Message: ${commitMessage}
      - Existing README Context (first 500 lines):
      ${currentReadme.slice(0, 15000)}

      - Code Changes (Git Diff):
      ${diff}
    `;

    return this.retryOperation(async () => {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up markdown block if present
      text = text.replace(/```json\n|\n```/g, '').trim();

      try {
        const operations: UpdateOperation[] = JSON.parse(text);
        if (operations.length === 0) return currentReadme;

        if (onProgress) onProgress(`Applying ${operations.length} documentation updates...`);

        let updatedReadme = currentReadme;

        for (const op of operations) {
          if (op.op === 'insert') {
            // Find section and append
            const sectionRegex = new RegExp(`(${op.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?\n)(.*?)(\n## |$)`, 'zs');
            if (sectionRegex.test(updatedReadme)) {
              updatedReadme = updatedReadme.replace(sectionRegex, `$1$2\n${op.content}\n$3`);
            } else {
              // If section not found, append to end
              updatedReadme += `\n\n${op.section}\n${op.content}`;
            }
          } else if (op.op === 'replace') {
            const sectionRegex = new RegExp(`${op.section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*?(?=\n## |$)`, 'zs');
            if (sectionRegex.test(updatedReadme)) {
              updatedReadme = updatedReadme.replace(sectionRegex, `${op.section}\n${op.content}`);
            }
          }
        }
        return updatedReadme;

      } catch (e) {
        console.error('Failed to parse update operations:', e);
        return currentReadme;
      }
    });
  }

  /**
   * Helper to retry operations with exponential backoff
   * Handles 503 (Overloaded) and 429 (Rate Limit) errors
   */
  private async retryOperation<T>(operation: () => Promise<T>, maxAttempts = 5, initialDelay = 2000): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check for retryable errors (503 Service Unavailable, 429 Too Many Requests)
        const isRetryable =
          error?.status === 503 ||
          error?.status === 429 ||
          error?.message?.includes('overloaded') ||
          error?.message?.includes('quota');

        if (isRetryable && attempt < maxAttempts) {
          // Exponential backoff with jitter: delay * 2^(attempt-1) + random status
          const delay = initialDelay * Math.pow(2, attempt - 1) + (Math.random() * 1000);
          console.warn(`    ⚠️  Gemini overloaded (503). Retrying in ${Math.round(delay / 1000)}s... (Attempt ${attempt}/${maxAttempts})`);

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }
    throw lastError;
  }
}
