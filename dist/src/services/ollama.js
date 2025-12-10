import { getKeyFilesContent, getProjectStructure } from './file-system.js';
import { README_PROMPT, CONTRIBUTING_PROMPT, README_ADVANCED_PROMPT } from '../utils/prompts.js';
export class OllamaService {
    model;
    baseUrl;
    constructor(model = 'llama3', baseUrl = 'http://localhost:11434') {
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async generateContent(prompt) {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                stream: false
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.response;
    }
    async retryOperation(operation, maxAttempts = 3, initialDelay = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Retry on connection refused or server errors
                const isRetryable = error?.message?.includes('fetch failed') || error?.cause?.code === 'ECONNREFUSED';
                if (isRetryable && attempt < maxAttempts) {
                    const delay = initialDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
        throw lastError;
    }
    async generateReadme(cwd, projectName, options = { style: 'Professional', includeBadges: true }, onProgress) {
        const structure = await getProjectStructure(cwd);
        const keyFiles = await getKeyFilesContent(cwd, onProgress);
        const sectionsText = options.sections ? options.sections.join(', ') : 'All standard sections';
        let unifiedInstructions = '';
        if (options.mergeDocs) {
            unifiedInstructions = `
        UNIFIED MODE ENABLED:
        - The "Contributing (Full)" section should contain COMPLETE contribution guidelines.
        - The "License (Full Text)" section should contain the COMPLETE ${options.licenseType} license text.
        `;
        }
        const prompt = `
      ${README_PROMPT}

      Configuration:
      - Style/Tone: ${options.style}
      - Include Badges: ${options.includeBadges}
      - Sections: ${sectionsText}
      - Include Diagrams: ${options.includeArchitectureDiagram}
      ${unifiedInstructions}

      Project Name: ${projectName}
      
      Project Structure:
      ${structure}

      Key Files Content:
      ${keyFiles}
    `;
        if (onProgress)
            onProgress(`Generating README with Ollama (${this.model})...`);
        return this.retryOperation(() => this.generateContent(prompt));
    }
    async generateContributing(cwd, options, onProgress) {
        const keyFiles = await getKeyFilesContent(cwd, onProgress);
        const prompt = `
      ${CONTRIBUTING_PROMPT}

      Configuration:
      - Code of Conduct: ${options.codeOfConduct}
      - Include Templates: ${options.includeTemplates}

      Context:
      ${keyFiles}
    `;
        if (onProgress)
            onProgress(`Generating CONTRIBUTING.md with Ollama (${this.model})...`);
        return this.retryOperation(() => this.generateContent(prompt));
    }
    async generateLicense(cwd, options, onProgress) {
        const prompt = `
      Generate the ${options.licenseType} license text for author: ${options.author}, year: ${new Date().getFullYear()}.
      Output ONLY the license text.
    `;
        if (onProgress)
            onProgress(`Generating LICENSE with Ollama (${this.model})...`);
        return this.retryOperation(() => this.generateContent(prompt));
    }
    async generateCodeOfConduct(options, onProgress) {
        const prompt = `
      Generate the ${options.conductType} Code of Conduct.
      Contact Email: ${options.contactEmail}
      Output ONLY valid Markdown.
    `;
        if (onProgress)
            onProgress(`Generating CODE_OF_CONDUCT.md with Ollama (${this.model})...`);
        return this.retryOperation(() => this.generateContent(prompt));
    }
    async generateReadmeAdvanced(projectName, analysis, options = {}, onProgress) {
        // Reuse logic from GeminiService for context building but localized
        // For brevity, using the analysis summary and structure directly
        const sectionsText = options.sections?.join(', ') || 'All standard sections';
        const prompt = `
      ${README_ADVANCED_PROMPT}

      Configuration:
      - Style: ${options.style || 'Professional'}
      - Sections: ${sectionsText}
      - Project: ${projectName}
      
      CODEBASE SUMMARY:
      ${analysis.summary}
      
      TECH STACK:
      ${JSON.stringify(analysis.techStack, null, 2)}
      
      DETECTED PATTERNS:
      ${analysis.patterns.map(p => p.name).join(', ')}
      `;
        if (onProgress)
            onProgress(`Generating Advanced README with Ollama (${this.model})...`);
        return this.retryOperation(() => this.generateContent(prompt));
    }
}
