/**
 * Advanced Codebase Scanner
 * Deep analysis of codebases using AST parsing, dependency graphs, and pattern detection.
 */
import { Project, SyntaxKind } from 'ts-morph';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
// ============ CONSTANTS ============
const IGNORED_DIRS = [
    'node_modules', 'dist', 'build', '.git', '.next', '.nuxt',
    'coverage', '.cache', '__pycache__', 'venv', '.venv'
];
const IGNORED_FILES = [
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.env', '.env.local', '.DS_Store'
];
const CODE_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.go', '.rs', '.java', '.kt', '.swift',
    '.vue', '.svelte', '.astro'
];
const CONFIG_FILES = [
    'package.json', 'tsconfig.json', 'vite.config.ts', 'next.config.js',
    'tailwind.config.js', 'webpack.config.js', '.eslintrc.js',
    'nest-cli.json', 'angular.json', 'nuxt.config.ts'
];
// ============ MAIN SCANNER CLASS ============
export class CodebaseScanner {
    cwd;
    project = null;
    limit = pLimit(10); // Concurrent file processing limit
    constructor(cwd) {
        this.cwd = cwd;
    }
    async analyze(onProgress) {
        const analysis = {
            structure: [],
            dependencies: { nodes: [], edges: [], entryPoints: [], coreModules: [] },
            patterns: [],
            apis: [],
            techStack: { languages: [], frameworks: [], databases: [], tools: [], packageManager: 'npm' },
            summary: '',
            stats: { totalFiles: 0, totalLines: 0, analyzedFiles: 0 }
        };
        // Phase 1: Discover files
        onProgress?.('Discovering files', 0, 1, 'Scanning project structure...');
        const files = await this.discoverFiles();
        analysis.stats.totalFiles = files.length;
        // Phase 2: Analyze tech stack from config files
        onProgress?.('Analyzing tech stack', 0, 1, 'Reading configuration files...');
        analysis.techStack = await this.analyzeTechStack();
        // Phase 3: Parse and analyze source files
        const sourceFiles = files.filter(f => CODE_EXTENSIONS.some(ext => f.endsWith(ext)));
        if (this.hasTypeScriptFiles(sourceFiles)) {
            this.initializeProject();
        }
        let analyzed = 0;
        const fileNodes = [];
        const analyzeFile = async (filePath) => {
            try {
                const relativePath = path.relative(this.cwd, filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                const lines = content.split('\n').length;
                analysis.stats.totalLines += lines;
                const node = {
                    path: filePath,
                    relativePath,
                    type: 'file',
                    language: this.getLanguage(filePath),
                    size: content.length,
                    exports: [],
                    imports: []
                };
                // Parse TypeScript/JavaScript files
                if (this.isTypeScriptOrJavaScript(filePath) && this.project) {
                    const sourceFile = this.project.addSourceFileAtPath(filePath);
                    node.imports = this.extractImports(sourceFile);
                    node.exports = this.extractExports(sourceFile);
                    // Detect API endpoints
                    const apis = this.detectAPIs(sourceFile, relativePath, analysis.techStack);
                    analysis.apis.push(...apis);
                }
                analyzed++;
                analysis.stats.analyzedFiles = analyzed;
                onProgress?.('Parsing source files', analyzed, sourceFiles.length, relativePath);
                return node;
            }
            catch (error) {
                return null;
            }
        };
        // Process files concurrently
        const results = await Promise.all(sourceFiles.map(file => this.limit(() => analyzeFile(file))));
        analysis.structure = results.filter((n) => n !== null);
        // Phase 4: Build dependency graph
        onProgress?.('Building dependency graph', 0, 1, 'Mapping file relationships...');
        analysis.dependencies = this.buildDependencyGraph(analysis.structure);
        // Phase 5: Detect patterns
        onProgress?.('Detecting patterns', 0, 1, 'Analyzing code architecture...');
        analysis.patterns = this.detectPatterns(analysis.structure, files);
        // Phase 6: Generate summary
        onProgress?.('Generating summary', 0, 1, 'Compressing context for AI...');
        analysis.summary = this.generateSummary(analysis);
        return analysis;
    }
    // ============ FILE DISCOVERY ============
    async discoverFiles() {
        const ignorePatterns = [
            ...IGNORED_DIRS.map(d => `**/${d}/**`),
            ...IGNORED_FILES
        ];
        const files = await glob('**/*', {
            cwd: this.cwd,
            ignore: ignorePatterns,
            nodir: true,
            absolute: true,
            dot: true
        });
        // Prioritize important files
        return this.prioritizeFiles(files);
    }
    prioritizeFiles(files) {
        const priority = {};
        files.forEach(file => {
            const basename = path.basename(file);
            const relativePath = path.relative(this.cwd, file);
            let score = 0;
            // Config files are high priority
            if (CONFIG_FILES.includes(basename))
                score += 100;
            // Entry points
            if (basename === 'index.ts' || basename === 'index.js')
                score += 80;
            if (basename === 'main.ts' || basename === 'main.js')
                score += 80;
            if (basename === 'app.ts' || basename === 'app.js')
                score += 80;
            // Source files
            if (relativePath.startsWith('src/') || relativePath.startsWith('src\\'))
                score += 50;
            if (relativePath.startsWith('lib/') || relativePath.startsWith('lib\\'))
                score += 40;
            if (relativePath.startsWith('app/') || relativePath.startsWith('app\\'))
                score += 40;
            // API routes
            if (relativePath.includes('api/') || relativePath.includes('routes/'))
                score += 60;
            // Tests are lower priority
            if (relativePath.includes('test') || relativePath.includes('spec'))
                score -= 20;
            priority[file] = score;
        });
        return files.sort((a, b) => (priority[b] || 0) - (priority[a] || 0));
    }
    // ============ TECH STACK ANALYSIS ============
    async analyzeTechStack() {
        const techStack = {
            languages: [],
            frameworks: [],
            databases: [],
            tools: [],
            packageManager: 'npm'
        };
        // Read package.json
        try {
            const pkgPath = path.join(this.cwd, 'package.json');
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            // Detect frameworks
            const frameworkMap = {
                'next': 'Next.js', 'react': 'React', 'vue': 'Vue.js',
                'angular': 'Angular', 'express': 'Express', 'fastify': 'Fastify',
                '@nestjs/core': 'NestJS', 'nuxt': 'Nuxt', 'svelte': 'Svelte',
                'astro': 'Astro', 'hono': 'Hono', 'koa': 'Koa'
            };
            Object.keys(frameworkMap).forEach(dep => {
                if (allDeps[dep])
                    techStack.frameworks.push(frameworkMap[dep]);
            });
            // Detect databases
            const dbMap = {
                'mongoose': 'MongoDB', 'mongodb': 'MongoDB',
                'pg': 'PostgreSQL', 'mysql': 'MySQL', 'mysql2': 'MySQL',
                'prisma': 'Prisma', '@prisma/client': 'Prisma',
                'typeorm': 'TypeORM', 'sequelize': 'Sequelize',
                'drizzle-orm': 'Drizzle', 'redis': 'Redis', 'ioredis': 'Redis'
            };
            Object.keys(dbMap).forEach(dep => {
                if (allDeps[dep] && !techStack.databases.includes(dbMap[dep])) {
                    techStack.databases.push(dbMap[dep]);
                }
            });
            // Detect tools
            const toolMap = {
                'typescript': 'TypeScript', 'tailwindcss': 'Tailwind CSS',
                'jest': 'Jest', 'vitest': 'Vitest', 'mocha': 'Mocha',
                'eslint': 'ESLint', 'prettier': 'Prettier',
                'webpack': 'Webpack', 'vite': 'Vite', 'esbuild': 'esbuild'
            };
            Object.keys(toolMap).forEach(dep => {
                if (allDeps[dep])
                    techStack.tools.push(toolMap[dep]);
            });
            // Detect package manager
            try {
                await fs.access(path.join(this.cwd, 'pnpm-lock.yaml'));
                techStack.packageManager = 'pnpm';
            }
            catch {
                try {
                    await fs.access(path.join(this.cwd, 'yarn.lock'));
                    techStack.packageManager = 'yarn';
                }
                catch {
                    techStack.packageManager = 'npm';
                }
            }
        }
        catch (error) {
            // No package.json
        }
        // Check for tsconfig.json
        try {
            await fs.access(path.join(this.cwd, 'tsconfig.json'));
            if (!techStack.languages.includes('TypeScript')) {
                techStack.languages.push('TypeScript');
            }
        }
        catch { }
        return techStack;
    }
    // ============ AST PARSING ============
    initializeProject() {
        try {
            const tsConfigPath = path.join(this.cwd, 'tsconfig.json');
            this.project = new Project({
                tsConfigFilePath: tsConfigPath,
                skipAddingFilesFromTsConfig: true
            });
        }
        catch {
            this.project = new Project({
                skipAddingFilesFromTsConfig: true
            });
        }
    }
    hasTypeScriptFiles(files) {
        return files.some(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));
    }
    isTypeScriptOrJavaScript(file) {
        return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);
    }
    extractImports(sourceFile) {
        const imports = [];
        // ES imports
        sourceFile.getImportDeclarations().forEach(imp => {
            imports.push(imp.getModuleSpecifierValue());
        });
        // require() calls
        sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
            if (call.getExpression().getText() === 'require') {
                const args = call.getArguments();
                if (args.length > 0) {
                    const text = args[0].getText().replace(/['"]/g, '');
                    imports.push(text);
                }
            }
        });
        return imports;
    }
    extractExports(sourceFile) {
        const exports = [];
        // Named exports
        sourceFile.getExportedDeclarations().forEach((decls, name) => {
            exports.push(name);
        });
        return exports;
    }
    detectAPIs(sourceFile, relativePath, techStack) {
        const apis = [];
        const text = sourceFile.getFullText();
        // Next.js App Router (route.ts)
        if (relativePath.includes('app/') && path.basename(relativePath).match(/route\.(ts|js)$/)) {
            const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            httpMethods.forEach(method => {
                if (text.includes(`export async function ${method}`) || text.includes(`export function ${method}`)) {
                    const routePath = this.extractNextRouteFromPath(relativePath);
                    apis.push({ method, path: routePath, file: relativePath, framework: 'Next.js App Router' });
                }
            });
        }
        // Next.js Pages API Routes
        if (relativePath.includes('pages/api/')) {
            const routePath = this.extractNextPagesApiRoute(relativePath);
            apis.push({ method: 'ALL', path: routePath, file: relativePath, framework: 'Next.js Pages' });
        }
        // Express/Fastify routes
        const routePatterns = [
            /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
            /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi
        ];
        routePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                apis.push({
                    method: match[1].toUpperCase(),
                    path: match[2],
                    file: relativePath,
                    framework: techStack.frameworks.includes('Express') ? 'Express' :
                        techStack.frameworks.includes('Fastify') ? 'Fastify' : 'HTTP'
                });
            }
        });
        // NestJS decorators
        const nestPatterns = [
            /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi
        ];
        nestPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                apis.push({
                    method: match[1].toUpperCase(),
                    path: match[2] || '/',
                    file: relativePath,
                    framework: 'NestJS'
                });
            }
        });
        return apis;
    }
    extractNextRouteFromPath(filePath) {
        // app/api/users/route.ts -> /api/users
        // app/api/users/[id]/route.ts -> /api/users/:id
        let route = filePath
            .replace(/\\/g, '/')
            .replace(/^.*app\//, '/')
            .replace(/\/route\.(ts|js)$/, '')
            .replace(/\[([^\]]+)\]/g, ':$1');
        return route || '/';
    }
    extractNextPagesApiRoute(filePath) {
        // pages/api/users.ts -> /api/users
        // pages/api/users/[id].ts -> /api/users/:id
        let route = filePath
            .replace(/\\/g, '/')
            .replace(/^.*pages\//, '/')
            .replace(/\.(ts|js)$/, '')
            .replace(/\[([^\]]+)\]/g, ':$1')
            .replace(/\/index$/, '');
        return route || '/';
    }
    // ============ DEPENDENCY GRAPH ============
    buildDependencyGraph(files) {
        const graph = {
            nodes: files.map(f => f.relativePath),
            edges: [],
            entryPoints: [],
            coreModules: []
        };
        const importCount = {};
        files.forEach(file => {
            file.imports.forEach(imp => {
                // Only track local imports
                if (imp.startsWith('.') || imp.startsWith('/')) {
                    const resolved = this.resolveImport(file.relativePath, imp);
                    const targetFile = files.find(f => f.relativePath === resolved ||
                        f.relativePath === resolved + '.ts' ||
                        f.relativePath === resolved + '.js' ||
                        f.relativePath === resolved + '/index.ts' ||
                        f.relativePath === resolved + '/index.js');
                    if (targetFile) {
                        graph.edges.push({
                            from: file.relativePath,
                            to: targetFile.relativePath,
                            type: 'import'
                        });
                        importCount[targetFile.relativePath] = (importCount[targetFile.relativePath] || 0) + 1;
                    }
                }
            });
        });
        // Find entry points (files not imported by others)
        const importedFiles = new Set(graph.edges.map(e => e.to));
        graph.entryPoints = files
            .filter(f => !importedFiles.has(f.relativePath))
            .map(f => f.relativePath)
            .slice(0, 5);
        // Find core modules (most imported)
        graph.coreModules = Object.entries(importCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file]) => file);
        return graph;
    }
    resolveImport(fromFile, importPath) {
        const fromDir = path.dirname(fromFile);
        return path.posix.normalize(path.posix.join(fromDir.replace(/\\/g, '/'), importPath));
    }
    // ============ PATTERN DETECTION ============
    detectPatterns(files, allPaths) {
        const patterns = [];
        const relativePaths = allPaths.map(p => path.relative(this.cwd, p).replace(/\\/g, '/'));
        // MVC Pattern
        const hasControllers = relativePaths.some(p => p.includes('controller') || p.includes('controllers/'));
        const hasModels = relativePaths.some(p => p.includes('model') || p.includes('models/'));
        const hasViews = relativePaths.some(p => p.includes('view') || p.includes('views/'));
        if (hasControllers && hasModels) {
            patterns.push({
                name: 'MVC Pattern',
                confidence: hasViews ? 0.9 : 0.7,
                files: relativePaths.filter(p => p.includes('controller') || p.includes('model') || p.includes('view')),
                description: 'Model-View-Controller architecture separating concerns'
            });
        }
        // React Hooks Pattern
        const hookFiles = relativePaths.filter(p => /use[A-Z][a-zA-Z]+\.(ts|tsx|js|jsx)$/.test(path.basename(p)));
        if (hookFiles.length > 0) {
            patterns.push({
                name: 'React Hooks',
                confidence: 0.95,
                files: hookFiles,
                description: 'Custom React hooks for reusable stateful logic'
            });
        }
        // Service Layer Pattern
        const serviceFiles = relativePaths.filter(p => p.includes('service') || p.includes('.service.'));
        if (serviceFiles.length > 0) {
            patterns.push({
                name: 'Service Layer',
                confidence: 0.85,
                files: serviceFiles,
                description: 'Business logic encapsulated in service classes/functions'
            });
        }
        // Repository Pattern
        const repoFiles = relativePaths.filter(p => p.includes('repository') || p.includes('.repo.'));
        if (repoFiles.length > 0) {
            patterns.push({
                name: 'Repository Pattern',
                confidence: 0.9,
                files: repoFiles,
                description: 'Data access abstraction for database operations'
            });
        }
        // Component-Based (React/Vue/Svelte)
        const componentDirs = relativePaths.filter(p => p.includes('components/'));
        if (componentDirs.length > 2) {
            patterns.push({
                name: 'Component-Based Architecture',
                confidence: 0.9,
                files: componentDirs.slice(0, 10),
                description: 'UI split into reusable, self-contained components'
            });
        }
        // Utils/Helpers
        const utilFiles = relativePaths.filter(p => p.includes('utils/') || p.includes('helpers/') || p.includes('lib/'));
        if (utilFiles.length > 0) {
            patterns.push({
                name: 'Utility Functions',
                confidence: 0.8,
                files: utilFiles.slice(0, 5),
                description: 'Shared utility/helper functions'
            });
        }
        return patterns;
    }
    // ============ SUMMARY GENERATION ============
    generateSummary(analysis) {
        const parts = [];
        // Project stats
        parts.push(`## Project Overview`);
        parts.push(`- Files: ${analysis.stats.totalFiles} (${analysis.stats.analyzedFiles} analyzed)`);
        parts.push(`- Lines of Code: ~${analysis.stats.totalLines.toLocaleString()}`);
        // Tech stack
        if (analysis.techStack.frameworks.length > 0) {
            parts.push(`\n## Tech Stack`);
            parts.push(`Frameworks: ${analysis.techStack.frameworks.join(', ')}`);
            if (analysis.techStack.databases.length > 0) {
                parts.push(`Databases: ${analysis.techStack.databases.join(', ')}`);
            }
            if (analysis.techStack.tools.length > 0) {
                parts.push(`Tools: ${analysis.techStack.tools.join(', ')}`);
            }
        }
        // Patterns
        if (analysis.patterns.length > 0) {
            parts.push(`\n## Detected Patterns`);
            analysis.patterns.forEach(p => {
                parts.push(`- ${p.name}: ${p.description}`);
            });
        }
        // APIs
        if (analysis.apis.length > 0) {
            parts.push(`\n## API Endpoints (${analysis.apis.length} found)`);
            analysis.apis.slice(0, 15).forEach(api => {
                parts.push(`- ${api.method} ${api.path} (${api.framework})`);
            });
            if (analysis.apis.length > 15) {
                parts.push(`- ... and ${analysis.apis.length - 15} more`);
            }
        }
        // Core modules
        if (analysis.dependencies.coreModules.length > 0) {
            parts.push(`\n## Core Modules (Most Used)`);
            analysis.dependencies.coreModules.slice(0, 5).forEach(m => {
                parts.push(`- ${m}`);
            });
        }
        // Entry points
        if (analysis.dependencies.entryPoints.length > 0) {
            parts.push(`\n## Entry Points`);
            analysis.dependencies.entryPoints.forEach(e => {
                parts.push(`- ${e}`);
            });
        }
        return parts.join('\n');
    }
    // ============ HELPERS ============
    getLanguage(file) {
        const ext = path.extname(file).toLowerCase();
        const langMap = {
            '.ts': 'TypeScript', '.tsx': 'TypeScript React',
            '.js': 'JavaScript', '.jsx': 'JavaScript React',
            '.py': 'Python', '.go': 'Go', '.rs': 'Rust',
            '.java': 'Java', '.kt': 'Kotlin', '.swift': 'Swift',
            '.vue': 'Vue', '.svelte': 'Svelte', '.astro': 'Astro'
        };
        return langMap[ext] || 'Unknown';
    }
}
// ============ UTILITY FUNCTIONS ============
export const scanCodebase = async (cwd, onProgress) => {
    const scanner = new CodebaseScanner(cwd);
    return scanner.analyze(onProgress);
};
