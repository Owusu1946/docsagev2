import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

export const getProjectStructure = async (cwd: string): Promise<string> => {
    const options = {
        cwd,
        ignore: ['node_modules/**', 'dist/**', '.git/**', '.env', 'package-lock.json', 'yarn.lock', '.gitignore'],
        dot: true,
    };

    const files = await glob('**/*', options);
    return files.join('\n');
};

export const readFileContent = async (filePath: string): Promise<string> => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content;
    } catch (error) {
        return '';
    }
};

export const getKeyFilesContent = async (cwd: string, onProgress?: (msg: string) => void): Promise<string> => {
    // prioritized files to read
    const priorityFiles = ['package.json', 'tsconfig.json'];

    if (onProgress) onProgress('Scanning project structure...');
    // Find source files (try to grab main entry points if possible, or just a few src files)
    const structure = await getProjectStructure(cwd);
    const allFiles = structure.split('\n');

    const srcFiles = allFiles.filter(f => f.startsWith('src/') || f.endsWith('.ts') || f.endsWith('.js')).slice(0, 3);

    const filesToRead = [...priorityFiles, ...srcFiles];

    if (onProgress) onProgress(`Identified ${filesToRead.length} key files to analyze...`);

    const fileContents = await Promise.all(
        filesToRead.map(async (file) => {
            if (onProgress) onProgress(`Reading ${file}...`);
            const fullPath = path.join(cwd, file);
            const content = await readFileContent(fullPath);
            if (content) {
                return `File: ${file}\n\`\`\`\n${content}\n\`\`\`\n`;
            }
            return '';
        })
    );

    return fileContents.join('\n');
};
