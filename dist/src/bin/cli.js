#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { spawn } from 'child_process';
import { GeminiService } from '../services/gemini.js';
import { scanCodebase } from '../services/codebase-scanner.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
dotenv.config();
const program = new Command();
// Config file path in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.docsage');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const loadConfig = async () => {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (e) {
        return {};
    }
};
const saveConfig = async (config) => {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
};
const displayTitle = () => {
    const title = figlet.textSync('DocSage v2', { font: 'Slant' });
    console.log(gradient.pastel.multiline(title));
    console.log(chalk.green('  AI-Powered Documentation Generator\n'));
};
const getApiKey = async () => {
    // Priority: 1. Environment variable, 2. Stored config, 3. Prompt user
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    const config = await loadConfig();
    if (config.apiKey) {
        console.log(chalk.dim('Using saved API key. Run "docsage config --reset" to change it.\n'));
        return config.apiKey;
    }
    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Google Gemini API Key:',
            validate: (input) => input.length > 0 || 'API Key is required',
        },
    ]);
    // Ask if user wants to save the key
    const { saveKey } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'saveKey',
            message: 'Save API key locally for future use?',
            default: true,
        },
    ]);
    if (saveKey) {
        await saveConfig({ ...config, apiKey });
        console.log(chalk.green('✓ API key saved to ~/.docsage/config.json\n'));
    }
    return apiKey;
};
const resetApiKey = async () => {
    const config = await loadConfig();
    delete config.apiKey;
    await saveConfig(config);
    console.log(chalk.green('✓ API key removed. You will be prompted for a new key next time.\n'));
};
const openDiffInEditor = (originalPath, newPath) => {
    try {
        // Resolve to absolute paths to ensure they work from any context
        const absOriginal = path.resolve(originalPath);
        const absNew = path.resolve(newPath);
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            // On Windows, use shell: true with properly quoted paths
            // This ensures paths with spaces are handled correctly
            const command = `code --diff "${absOriginal}" "${absNew}"`;
            const child = spawn(command, [], {
                detached: true,
                stdio: 'ignore',
                shell: true,
                windowsHide: true
            });
            child.unref();
        }
        else {
            // On Unix-like systems, spawn directly without shell
            // Arguments are passed as array, so spaces are handled correctly
            const child = spawn('code', ['--diff', absOriginal, absNew], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();
        }
        console.log(chalk.cyan('\n📝 Diff opened in VS Code editor. Review the changes there.\n'));
    }
    catch (error) {
        console.log(chalk.yellow('\n⚠️ Could not open VS Code. Make sure "code" is in your PATH.\n'));
    }
};
const writeToFile = async (filename, content) => {
    const cwd = process.cwd();
    const filePath = path.join(cwd, filename);
    // Check if file exists
    try {
        await fs.access(filePath);
        // Create a temp file with new content for diff
        const tempDir = path.join(cwd, '.docsage-temp');
        await fs.mkdir(tempDir, { recursive: true });
        const tempFilePath = path.join(tempDir, `${filename}.new`);
        await fs.writeFile(tempFilePath, content, 'utf-8');
        // Open diff in editor
        openDiffInEditor(filePath, tempFilePath);
        // Small delay to let terminal stabilize after spawning VS Code
        await new Promise(resolve => setTimeout(resolve, 500));
        const { action } = await inquirer.prompt([
            {
                type: 'rawlist',
                name: 'action',
                message: `${filename} already exists. Review the diff in VS Code, then choose:`,
                choices: [
                    { name: 'Accept changes (overwrite with new content)', value: 'accept' },
                    { name: 'Reject changes (keep original)', value: 'reject' },
                ],
            },
        ]);
        // Clean up temp file
        try {
            await fs.unlink(tempFilePath);
            await fs.rmdir(tempDir);
        }
        catch (e) {
            // Ignore cleanup errors
        }
        if (action === 'reject') {
            logger.warning(`Kept original ${filename}`);
            return;
        }
    }
    catch (e) {
        // File doesn't exist, proceed with creation
    }
    await fs.writeFile(filePath, content, 'utf-8');
    logger.success(`Generated ${filename}`);
};
const main = async () => {
    displayTitle();
    const apiKey = await getApiKey();
    const gemini = new GeminiService(apiKey);
    const answers = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'docTypes',
            message: 'What documents do you want to generate?',
            choices: [
                { name: 'README.md' },
                { name: 'CONTRIBUTING.md' },
                { name: 'LICENSE' },
                { name: 'CODE_OF_CONDUCT.md' },
            ],
            validate: (val) => val.length > 0 || 'Please select at least one file',
        },
    ]);
    const { docTypes } = answers;
    // Detect Unified Mode: All 3 selected
    const isUnifiedMode = docTypes.includes('README.md') &&
        docTypes.includes('CONTRIBUTING.md') &&
        docTypes.includes('LICENSE');
    let readmeOptions = { style: 'Professional', includeBadges: true, mergeDocs: false };
    let contributingOptions = { codeOfConduct: 'Contributor Covenant', includeTemplates: false };
    let licenseOptions = { licenseType: 'MIT', author: 'The Maintainers' };
    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, 'package.json');
    let projectName = path.basename(cwd);
    try {
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (pkg.name)
            projectName = pkg.name;
        if (pkg.author) {
            if (typeof pkg.author === 'string')
                licenseOptions.author = pkg.author;
            else if (pkg.author.name)
                licenseOptions.author = pkg.author.name;
        }
    }
    catch (e) {
        // package.json might not exist
    }
    if (isUnifiedMode) {
        // ===== UNIFIED MODE =====
        console.log(chalk.cyan('\n📦 Unified Mode: All documentation will be merged into README.md\n'));
        const opts = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'sections',
                message: 'Select sections to include:',
                choices: [
                    { name: 'Project Header (Logo, Title, Badges)', checked: true },
                    { name: 'Table of Contents', checked: true },
                    { name: 'Overview', checked: true },
                    { name: 'Features', checked: true },
                    { name: 'Architecture', checked: true },
                    { name: 'Prerequisites', checked: true },
                    { name: 'Installation', checked: true },
                    { name: 'Usage', checked: true },
                    { name: 'Configuration', checked: true },
                    { name: 'Database Schema' },
                    { name: 'API Reference' },
                    { name: 'Tech Stack', checked: true },
                    { name: 'Contributing (Full)', checked: true },
                    { name: 'License (Full Text)', checked: true },
                    { name: 'Roadmap' },
                    { name: 'Acknowledgements' },
                ]
            },
            {
                type: 'confirm',
                name: 'includeBadges',
                message: 'Include Shields.io badges?',
                default: true
            },
            {
                type: 'confirm',
                name: 'includeArchitectureDiagram',
                message: 'Include Mermaid Architecture Diagram?',
                default: true,
                when: (answers) => answers.sections && answers.sections.includes('Architecture')
            },
            {
                type: 'list',
                name: 'licenseType',
                message: 'Select License Type for the unified document:',
                choices: ['MIT', 'Apache 2.0', 'ISC', 'GPL-3.0', 'BSD-3-Clause', 'MPL-2.0'],
                default: 'MIT'
            }
        ]);
        readmeOptions = { ...opts, style: 'Professional', mergeDocs: true };
        licenseOptions.licenseType = opts.licenseType;
        const spinner = ora('Generating Unified README.md...').start();
        try {
            const readme = await gemini.generateReadme(cwd, projectName, { ...readmeOptions, licenseType: licenseOptions.licenseType, author: licenseOptions.author }, (msg) => {
                spinner.text = msg;
            });
            spinner.succeed('Unified README.md generated!');
            await writeToFile('README.md', readme);
        }
        catch (error) {
            spinner.fail('Failed to generate Unified README.md');
            console.error(error);
        }
    }
    else {
        // ===== STANDALONE MODE =====
        // README.md
        if (docTypes.includes('README.md')) {
            const opts = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'sections',
                    message: 'Select sections to include:',
                    choices: [
                        { name: 'Project Header (Logo, Title, Badges)', checked: true },
                        { name: 'Table of Contents', checked: true },
                        { name: 'Overview', checked: true },
                        { name: 'Features', checked: true },
                        { name: 'Architecture', checked: true },
                        { name: 'Prerequisites', checked: true },
                        { name: 'Installation', checked: true },
                        { name: 'Usage', checked: true },
                        { name: 'Configuration', checked: true },
                        { name: 'Database Schema' },
                        { name: 'API Reference' },
                        { name: 'Tech Stack', checked: true },
                        { name: 'Contributing', checked: true },
                        { name: 'License', checked: true },
                        { name: 'Roadmap' },
                        { name: 'Acknowledgements' },
                    ]
                },
                {
                    type: 'confirm',
                    name: 'includeBadges',
                    message: 'Include Shields.io badges?',
                    default: true
                },
                {
                    type: 'confirm',
                    name: 'includeArchitectureDiagram',
                    message: 'Include Mermaid Architecture Diagram?',
                    default: true,
                    when: (answers) => answers.sections && answers.sections.includes('Architecture')
                },
                {
                    type: 'confirm',
                    name: 'includeERD',
                    message: 'Include Mermaid Entity Relationship Diagram (ERD)?',
                    default: false,
                    when: (answers) => answers.sections && answers.sections.includes('Database Schema')
                },
                {
                    type: 'confirm',
                    name: 'includeContributingDiagram',
                    message: 'Include Contributing Flow Diagram?',
                    default: false,
                    when: (answers) => answers.sections && answers.sections.includes('Contributing')
                }
            ]);
            readmeOptions = { ...opts, style: 'Professional' };
            console.log(chalk.cyan('\n🔬 Deep Codebase Analysis\n'));
            // Phase 1: Scan codebase with progress
            let lastPhase = '';
            const scanSpinner = ora('Initializing scanner...').start();
            try {
                const analysis = await scanCodebase(cwd, (phase, current, total, detail) => {
                    if (phase !== lastPhase) {
                        lastPhase = phase;
                        scanSpinner.text = chalk.bold(phase);
                    }
                    if (detail) {
                        scanSpinner.text = `${chalk.bold(phase)} ${chalk.dim(`(${current}/${total})`)} ${chalk.cyan(detail)}`;
                    }
                    else if (total > 0) {
                        scanSpinner.text = `${chalk.bold(phase)} ${chalk.dim(`(${current}/${total})`)}`;
                    }
                });
                scanSpinner.succeed(`Analyzed ${analysis.stats.analyzedFiles} files, ${analysis.stats.totalLines.toLocaleString()} lines`);
                // Show discovered info
                if (analysis.techStack.frameworks.length > 0) {
                    console.log(chalk.dim(`  ├── Frameworks: ${analysis.techStack.frameworks.join(', ')}`));
                }
                if (analysis.patterns.length > 0) {
                    console.log(chalk.dim(`  ├── Patterns: ${analysis.patterns.map(p => p.name).join(', ')}`));
                }
                if (analysis.apis.length > 0) {
                    console.log(chalk.dim(`  └── API Endpoints: ${analysis.apis.length} found`));
                }
                // Phase 2: Generate README with Gemini
                const genSpinner = ora('Generating README with AI...').start();
                const readme = await gemini.generateReadmeAdvanced(projectName, analysis, readmeOptions, (msg) => {
                    genSpinner.text = msg;
                });
                genSpinner.succeed('README.md generated!');
                await writeToFile('README.md', readme);
            }
            catch (error) {
                scanSpinner.fail('Failed to generate README.md');
                console.error(error);
            }
        }
        // CONTRIBUTING.md (Standalone Enhanced)
        if (docTypes.includes('CONTRIBUTING.md')) {
            console.log(chalk.cyan('\n📝 Configuring CONTRIBUTING.md...\n'));
            const contribOpts = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'codeOfConduct',
                    message: 'Select Code of Conduct:',
                    choices: ['Contributor Covenant', 'Citizen Code of Conduct', 'None'],
                    default: 'Contributor Covenant'
                },
                {
                    type: 'confirm',
                    name: 'includeTemplates',
                    message: 'Include Issue/PR Template examples?',
                    default: true
                }
            ]);
            contributingOptions = contribOpts;
            const spinner = ora('Generating CONTRIBUTING.md...').start();
            try {
                const contributing = await gemini.generateContributing(cwd, contributingOptions, (msg) => {
                    spinner.text = msg;
                });
                spinner.succeed('CONTRIBUTING.md generated!');
                await writeToFile('CONTRIBUTING.md', contributing);
            }
            catch (error) {
                spinner.fail('Failed to generate CONTRIBUTING.md');
                console.error(error);
            }
        }
        // LICENSE (Standalone Enhanced)
        if (docTypes.includes('LICENSE')) {
            console.log(chalk.cyan('\n⚖️ Configuring LICENSE...\n'));
            const licOpts = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'licenseType',
                    message: 'Select License Type:',
                    choices: ['MIT', 'Apache 2.0', 'ISC', 'GPL-3.0', 'BSD-3-Clause', 'MPL-2.0', 'Unlicense'],
                    default: 'MIT'
                },
                {
                    type: 'input',
                    name: 'author',
                    message: 'Copyright Holder:',
                    default: licenseOptions.author
                }
            ]);
            licenseOptions = licOpts;
            const spinner = ora('Generating LICENSE...').start();
            try {
                const license = await gemini.generateLicense(cwd, licenseOptions, (msg) => {
                    spinner.text = msg;
                });
                spinner.succeed('LICENSE generated!');
                await writeToFile('LICENSE', license);
            }
            catch (error) {
                spinner.fail('Failed to generate LICENSE');
                console.error(error);
            }
        }
        // CODE_OF_CONDUCT.md (Standalone)
        if (docTypes.includes('CODE_OF_CONDUCT.md')) {
            console.log(chalk.cyan('\n📜 Configuring CODE_OF_CONDUCT.md...\n'));
            const cocOpts = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'conductType',
                    message: 'Select Code of Conduct:',
                    choices: ['Contributor Covenant', 'Citizen Code of Conduct'],
                    default: 'Contributor Covenant'
                },
                {
                    type: 'input',
                    name: 'contactEmail',
                    message: 'Contact email for reporting violations:',
                    validate: (input) => input.length > 0 || 'Email is required for Code of Conduct'
                }
            ]);
            const spinner = ora('Generating CODE_OF_CONDUCT.md...').start();
            try {
                const codeOfConduct = await gemini.generateCodeOfConduct(cocOpts, (msg) => {
                    spinner.text = msg;
                });
                spinner.succeed('CODE_OF_CONDUCT.md generated!');
                await writeToFile('CODE_OF_CONDUCT.md', codeOfConduct);
            }
            catch (error) {
                spinner.fail('Failed to generate CODE_OF_CONDUCT.md');
                console.error(error);
            }
        }
    }
};
// Check for config command first
const args = process.argv.slice(2);
if (args[0] === 'config') {
    if (args.includes('--reset') || args.includes('-r')) {
        displayTitle();
        resetApiKey().then(() => process.exit(0));
    }
    else if (args.includes('--show') || args.includes('-s')) {
        displayTitle();
        loadConfig().then(config => {
            if (config.apiKey) {
                const masked = config.apiKey.slice(0, 6) + '...' + config.apiKey.slice(-4);
                console.log(chalk.cyan(`Saved API Key: ${masked}`));
                console.log(chalk.dim(`Config location: ${CONFIG_FILE}`));
            }
            else {
                console.log(chalk.yellow('No API key saved. Run docsage to set one.'));
            }
            process.exit(0);
        });
    }
    else {
        displayTitle();
        console.log(chalk.bold('DocSage Configuration\n'));
        console.log('  docsage config --show    Show saved API key (masked)');
        console.log('  docsage config --reset   Remove saved API key');
        console.log(`\nConfig file: ${CONFIG_FILE}`);
        process.exit(0);
    }
}
else {
    main().catch((err) => {
        logger.error(err);
        process.exit(1);
    });
}
