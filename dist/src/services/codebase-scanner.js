/**
 * Advanced Codebase Scanner - OPTIMIZED FOR SPEED
 *
 * Performance optimizations:
 * - Smart file filtering (skip tests, mocks, generated files)
 * - File count limits (max 100 files for AST parsing)
 * - File size limits (skip files > 50KB)
 * - Regex-first detection (only use AST when needed)
 * - Higher concurrency (20 parallel operations)
 * - Skip ts-morph dependency resolution
 * - Early termination when sufficient data collected
 */
import { Project } from 'ts-morph';
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
// ============ PERFORMANCE CONSTANTS ============
const MAX_FILES_TO_ANALYZE = 100; // Cap AST parsing at 100 files
const MAX_FILE_SIZE_BYTES = 50000; // Skip files larger than 50KB
const CONCURRENCY_LIMIT = 20; // Process 20 files in parallel
// Files/dirs to completely ignore
const IGNORED_PATTERNS = [
    '**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**',
    '**/.next/**', '**/.nuxt/**', '**/coverage/**', '**/.cache/**',
    '**/__pycache__/**', '**/venv/**', '**/.venv/**', '**/.turbo/**',
    '**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml',
    '**/.env*', '**/.DS_Store', '**/*.map', '**/*.d.ts',
    // Skip test/mock files for speed
    '**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/__mocks__/**',
    '**/test/**', '**/tests/**', '**/*.stories.*', '**/*.snap'
];
const CODE_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.vue', '.svelte', '.astro'
]);
const CONFIG_FILES = new Set([
    'package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js',
    'next.config.js', 'next.config.mjs', 'tailwind.config.js',
    'nest-cli.json', 'angular.json', 'nuxt.config.ts'
]);
// ============ OPTIMIZED SCANNER ============
export class CodebaseScanner {
    cwd;
    project = null;
    limit = pLimit(CONCURRENCY_LIMIT);
    constructor(cwd) {
        this.cwd = cwd;
    }
    async analyze(onProgress) {
        const startTime = Date.now();
        const analysis = {
            structure: [],
            dependencies: { nodes: [], edges: [], entryPoints: [], coreModules: [] },
            patterns: [],
            apis: [],
            techStack: { languages: [], frameworks: [], databases: [], tools: [], packageManager: 'npm' },
            summary: '',
            stats: { totalFiles: 0, totalLines: 0, analyzedFiles: 0 }
        };
        // Phase 1: Fast file discovery with glob
        onProgress?.('Discovering files', 0, 1, 'Scanning...');
        const allFiles = await this.discoverFiles();
        analysis.stats.totalFiles = allFiles.length;
        // Phase 2: Quick tech stack from package.json (fast, no AST)
        onProgress?.('Analyzing tech stack', 0, 1, 'Reading package.json...');
        analysis.techStack = await this.analyzeTechStack();
        // Phase 3: Filter and prioritize files for analysis
        const filesToAnalyze = this.selectFilesForAnalysis(allFiles);
        const fileCount = filesToAnalyze.length;
        // Phase 4: Initialize ts-morph ONLY if needed (lazy)
        const hasJsTs = filesToAnalyze.some(f => CODE_EXTENSIONS.has(path.extname(f)));
        if (hasJsTs) {
            this.initializeProject();
        }
        // Phase 5: Concurrent file analysis with batching
        let analyzed = 0;
        const fileNodes = [];
        const allApis = [];
        const analyzeFile = async (filePath) => {
            try {
                const stat = await fs.stat(filePath);
                // Skip large files for speed
                if (stat.size > MAX_FILE_SIZE_BYTES) {
                    analyzed++;
                    return null;
                }
                const relativePath = path.relative(this.cwd, filePath).replace(/\\/g, '/');
                const content = await fs.readFile(filePath, 'utf-8');
                const lineCount = (content.match(/\n/g) || []).length + 1;
                const node = {
                    path: filePath,
                    relativePath,
                    type: 'file',
                    language: this.getLanguage(filePath),
                    size: stat.size,
                    exports: [],
                    imports: []
                };
                const ext = path.extname(filePath);
                // Use regex-first for imports (faster than AST)
                if (CODE_EXTENSIONS.has(ext)) {
                    node.imports = this.extractImportsRegex(content);
                    node.exports = this.extractExportsRegex(content);
                    // Detect APIs with regex (much faster than AST)
                    const apis = this.detectAPIsRegex(content, relativePath, analysis.techStack);
                    if (apis.length > 0) {
                        allApis.push(...apis);
                    }
                }
                analyzed++;
                onProgress?.('Parsing files', analyzed, fileCount, relativePath);
                return { ...node, lineCount };
            }
            catch {
                analyzed++;
                return null;
            }
        };
        // Process in parallel with p-limit
        const results = await Promise.all(filesToAnalyze.map(file => this.limit(() => analyzeFile(file))));
        // Aggregate results
        let totalLines = 0;
        for (const result of results) {
            if (result) {
                fileNodes.push(result);
                totalLines += result.lineCount || 0;
            }
        }
        analysis.structure = fileNodes;
        analysis.apis = allApis;
        analysis.stats.analyzedFiles = fileNodes.length;
        analysis.stats.totalLines = totalLines;
        // Phase 6: Build dependency graph (in-memory, fast)
        onProgress?.('Building graph', 0, 1, 'Mapping dependencies...');
        analysis.dependencies = this.buildDependencyGraph(fileNodes);
        // Phase 7: Pattern detection (regex-based, fast)
        onProgress?.('Detecting patterns', 0, 1, 'Analyzing architecture...');
        analysis.patterns = this.detectPatterns(fileNodes, allFiles);
        // Phase 8: Generate compact summary
        analysis.summary = this.generateSummary(analysis);
        const elapsed = Date.now() - startTime;
        onProgress?.('Complete', 1, 1, `${elapsed}ms`);
        return analysis;
    }
    // ============ FAST FILE DISCOVERY ============
    async discoverFiles() {
        return glob('**/*', {
            cwd: this.cwd,
            ignore: IGNORED_PATTERNS,
            nodir: true,
            absolute: true
        });
    }
    selectFilesForAnalysis(files) {
        // Score and sort files by importance
        const scored = files.map(file => ({
            file,
            score: this.scoreFile(file)
        }));
        scored.sort((a, b) => b.score - a.score);
        // Take top N files
        return scored.slice(0, MAX_FILES_TO_ANALYZE).map(s => s.file);
    }
    scoreFile(file) {
        const basename = path.basename(file);
        const relativePath = path.relative(this.cwd, file).replace(/\\/g, '/');
        const ext = path.extname(file);
        let score = 0;
        // Config files are highest priority
        if (CONFIG_FILES.has(basename))
            return 1000;
        // Only score code files
        if (!CODE_EXTENSIONS.has(ext))
            return -100;
        // Entry points
        if (/^(index|main|app)\.(ts|js|tsx|jsx)$/.test(basename))
            score += 100;
        // API routes (critical for documentation)
        if (relativePath.includes('api/') || relativePath.includes('routes/'))
            score += 90;
        if (/route\.(ts|js)$/.test(basename))
            score += 95;
        // Source directories
        if (relativePath.startsWith('src/'))
            score += 50;
        if (relativePath.startsWith('app/'))
            score += 50;
        if (relativePath.startsWith('lib/'))
            score += 40;
        if (relativePath.startsWith('pages/'))
            score += 45;
        // Services, controllers, components (architectural)
        if (relativePath.includes('service'))
            score += 30;
        if (relativePath.includes('controller'))
            score += 30;
        if (relativePath.includes('component'))
            score += 20;
        // Hooks (React)
        if (/^use[A-Z]/.test(basename))
            score += 25;
        // Deeply nested = less important
        const depth = relativePath.split('/').length;
        score -= depth * 2;
        return score;
    }
    // ============ FAST TECH STACK (no AST) ============
    async analyzeTechStack() {
        const techStack = {
            languages: [],
            frameworks: [],
            databases: [],
            tools: [],
            packageManager: 'npm'
        };
        try {
            const pkgPath = path.join(this.cwd, 'package.json');
            const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            // Framework detection (single pass)
            const frameworkMap = {
                'next': 'Next.js', 'react': 'React', 'vue': 'Vue.js',
                '@angular/core': 'Angular', 'express': 'Express', 'fastify': 'Fastify',
                '@nestjs/core': 'NestJS', 'nuxt': 'Nuxt', 'svelte': 'Svelte',
                'astro': 'Astro', 'hono': 'Hono', 'koa': 'Koa', 'hapi': 'Hapi'
            };
            // Database detection
            const dbMap = {
                'mongoose': 'MongoDB', 'mongodb': 'MongoDB', 'pg': 'PostgreSQL',
                'mysql': 'MySQL', 'mysql2': 'MySQL', '@prisma/client': 'Prisma',
                'prisma': 'Prisma', 'typeorm': 'TypeORM', 'drizzle-orm': 'Drizzle',
                'sequelize': 'Sequelize', 'redis': 'Redis', 'ioredis': 'Redis'
            };
            // Tool detection
            const toolMap = {
                'typescript': 'TypeScript', 'tailwindcss': 'Tailwind CSS',
                'jest': 'Jest', 'vitest': 'Vitest', 'eslint': 'ESLint',
                'prettier': 'Prettier', 'vite': 'Vite', 'webpack': 'Webpack'
            };
            // Single pass through deps
            for (const dep of Object.keys(deps)) {
                if (frameworkMap[dep])
                    techStack.frameworks.push(frameworkMap[dep]);
                if (dbMap[dep] && !techStack.databases.includes(dbMap[dep])) {
                    techStack.databases.push(dbMap[dep]);
                }
                if (toolMap[dep])
                    techStack.tools.push(toolMap[dep]);
            }
            // Package manager detection (parallel checks)
            const [hasPnpm, hasYarn] = await Promise.all([
                fs.access(path.join(this.cwd, 'pnpm-lock.yaml')).then(() => true).catch(() => false),
                fs.access(path.join(this.cwd, 'yarn.lock')).then(() => true).catch(() => false)
            ]);
            if (hasPnpm)
                techStack.packageManager = 'pnpm';
            else if (hasYarn)
                techStack.packageManager = 'yarn';
        }
        catch { /* No package.json */ }
        // TypeScript detection
        try {
            await fs.access(path.join(this.cwd, 'tsconfig.json'));
            techStack.languages.push('TypeScript');
        }
        catch { }
        return techStack;
    }
    // ============ LAZY PROJECT INIT ============
    initializeProject() {
        try {
            this.project = new Project({
                tsConfigFilePath: path.join(this.cwd, 'tsconfig.json'),
                skipAddingFilesFromTsConfig: true,
                skipFileDependencyResolution: true // KEY OPTIMIZATION
            });
        }
        catch {
            this.project = new Project({
                skipAddingFilesFromTsConfig: true,
                skipFileDependencyResolution: true
            });
        }
    }
    // ============ REGEX-BASED EXTRACTION (FAST) ============
    extractImportsRegex(content) {
        const imports = [];
        // ES imports: import ... from 'module'
        const esImportRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;
        while ((match = esImportRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        // require() calls
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        return imports;
    }
    extractExportsRegex(content) {
        const exports = [];
        // export const/function/class name
        const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
        let match;
        while ((match = namedExportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }
        // export { name }
        const bracedExportRegex = /export\s*\{([^}]+)\}/g;
        while ((match = bracedExportRegex.exec(content)) !== null) {
            const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
            exports.push(...names.filter(n => n));
        }
        // export default
        if (/export\s+default/.test(content)) {
            exports.push('default');
        }
        return exports;
    }
    detectAPIsRegex(content, relativePath, techStack) {
        const apis = [];
        // Next.js App Router (route.ts)
        if (/route\.(ts|js)$/.test(relativePath)) {
            const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            for (const method of methods) {
                if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(content)) {
                    apis.push({
                        method,
                        path: this.extractNextRoute(relativePath),
                        file: relativePath,
                        framework: 'Next.js'
                    });
                }
            }
        }
        // Next.js Pages API
        if (relativePath.includes('pages/api/')) {
            apis.push({
                method: 'ALL',
                path: this.extractPagesApiRoute(relativePath),
                file: relativePath,
                framework: 'Next.js Pages'
            });
        }
        // Express/Fastify/Hono routes
        const routeRegex = /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
        let match;
        while ((match = routeRegex.exec(content)) !== null) {
            apis.push({
                method: match[1].toUpperCase(),
                path: match[2],
                file: relativePath,
                framework: techStack.frameworks.find(f => ['Express', 'Fastify', 'Hono', 'Koa'].includes(f)) || 'HTTP'
            });
        }
        // NestJS decorators
        const nestRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]?([^'"`\)]*)?['"`]?\s*\)/gi;
        while ((match = nestRegex.exec(content)) !== null) {
            apis.push({
                method: match[1].toUpperCase(),
                path: match[2] || '/',
                file: relativePath,
                framework: 'NestJS'
            });
        }
        return apis;
    }
    extractNextRoute(filePath) {
        return filePath
            .replace(/^.*app\//, '/')
            .replace(/\/route\.(ts|js)$/, '')
            .replace(/\[([^\]]+)\]/g, ':$1') || '/';
    }
    extractPagesApiRoute(filePath) {
        return filePath
            .replace(/^.*pages\//, '/')
            .replace(/\.(ts|js)$/, '')
            .replace(/\[([^\]]+)\]/g, ':$1')
            .replace(/\/index$/, '') || '/';
    }
    // ============ FAST DEPENDENCY GRAPH ============
    buildDependencyGraph(files) {
        const graph = {
            nodes: files.map(f => f.relativePath),
            edges: [],
            entryPoints: [],
            coreModules: []
        };
        const nodeSet = new Set(graph.nodes);
        const importCount = new Map();
        for (const file of files) {
            for (const imp of file.imports) {
                if (!imp.startsWith('.'))
                    continue; // Skip external imports
                const resolved = this.resolveImport(file.relativePath, imp);
                // Try common extensions
                const variants = [
                    resolved,
                    resolved + '.ts', resolved + '.tsx',
                    resolved + '.js', resolved + '.jsx',
                    resolved + '/index.ts', resolved + '/index.js'
                ];
                for (const variant of variants) {
                    if (nodeSet.has(variant)) {
                        graph.edges.push({ from: file.relativePath, to: variant, type: 'import' });
                        importCount.set(variant, (importCount.get(variant) || 0) + 1);
                        break;
                    }
                }
            }
        }
        // Entry points (not imported by others)
        const imported = new Set(graph.edges.map(e => e.to));
        graph.entryPoints = files
            .filter(f => !imported.has(f.relativePath))
            .slice(0, 5)
            .map(f => f.relativePath);
        // Core modules (most imported)
        graph.coreModules = [...importCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file]) => file);
        return graph;
    }
    resolveImport(fromFile, importPath) {
        const fromDir = path.dirname(fromFile);
        return path.posix.normalize(path.posix.join(fromDir, importPath));
    }
    // ============ FAST PATTERN DETECTION ============
    detectPatterns(files, allPaths) {
        const patterns = [];
        const paths = allPaths.map(p => path.relative(this.cwd, p).replace(/\\/g, '/'));
        // Pre-compute path checks
        const hasControllers = paths.some(p => /controller/i.test(p));
        const hasModels = paths.some(p => /model/i.test(p));
        const hasServices = paths.some(p => /service/i.test(p));
        const hasComponents = paths.filter(p => p.includes('components/')).length;
        const hookFiles = paths.filter(p => /use[A-Z]\w+\.(ts|tsx|js|jsx)$/.test(path.basename(p)));
        if (hasControllers && hasModels) {
            patterns.push({
                name: 'MVC',
                confidence: 0.85,
                files: paths.filter(p => /controller|model/i.test(p)).slice(0, 5),
                description: 'Model-View-Controller pattern'
            });
        }
        if (hookFiles.length > 0) {
            patterns.push({
                name: 'React Hooks',
                confidence: 0.95,
                files: hookFiles.slice(0, 5),
                description: 'Custom React hooks'
            });
        }
        if (hasServices) {
            patterns.push({
                name: 'Service Layer',
                confidence: 0.85,
                files: paths.filter(p => /service/i.test(p)).slice(0, 5),
                description: 'Business logic in services'
            });
        }
        if (hasComponents > 2) {
            patterns.push({
                name: 'Component-Based',
                confidence: 0.9,
                files: paths.filter(p => p.includes('components/')).slice(0, 5),
                description: 'Reusable UI components'
            });
        }
        return patterns;
    }
    // ============ COMPACT SUMMARY ============
    generateSummary(analysis) {
        const lines = [];
        lines.push(`Files: ${analysis.stats.totalFiles} total, ${analysis.stats.analyzedFiles} analyzed`);
        lines.push(`Lines: ~${analysis.stats.totalLines.toLocaleString()}`);
        if (analysis.techStack.frameworks.length) {
            lines.push(`Stack: ${analysis.techStack.frameworks.join(', ')}`);
        }
        if (analysis.techStack.databases.length) {
            lines.push(`DB: ${analysis.techStack.databases.join(', ')}`);
        }
        if (analysis.patterns.length) {
            lines.push(`Patterns: ${analysis.patterns.map(p => p.name).join(', ')}`);
        }
        if (analysis.apis.length) {
            lines.push(`APIs: ${analysis.apis.length} endpoints`);
        }
        return lines.join('\n');
    }
    getLanguage(file) {
        const ext = path.extname(file).toLowerCase();
        const map = {
            '.ts': 'TypeScript', '.tsx': 'TypeScript',
            '.js': 'JavaScript', '.jsx': 'JavaScript',
            '.vue': 'Vue', '.svelte': 'Svelte', '.astro': 'Astro'
        };
        return map[ext] || 'Unknown';
    }
}
// ============ EXPORT ============
export const scanCodebase = async (cwd, onProgress) => {
    const scanner = new CodebaseScanner(cwd);
    return scanner.analyze(onProgress);
};
