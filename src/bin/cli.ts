#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { spawn } from 'child_process';
import { GeminiService } from '../services/gemini.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

const displayTitle = () => {
    const title = figlet.textSync('DocSage', { font: 'Slant' });
    console.log(gradient.pastel.multiline(title));
    console.log(chalk.dim('  AI-Powered Documentation Generator\n'));
};

const getApiKey = async (): Promise<string> => {
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Google Gemini API Key:',
            validate: (input) => input.length > 0 || 'API Key is required/or set GEMINI_API_KEY in .env',
        },
    ]);
    return apiKey;
};

const openDiffInEditor = (originalPath: string, newPath: string): void => {
    try {
        // Use spawn with detached to prevent blocking terminal stdin
        const child = spawn('code', ['--diff', originalPath, newPath], {
            detached: true,
            stdio: 'ignore',
            shell: true
        });
        child.unref();
        console.log(chalk.cyan('\n📝 Diff opened in VS Code editor. Review the changes there.\n'));
    } catch (error) {
        console.log(chalk.yellow('\n⚠️ Could not open VS Code. Make sure "code" is in your PATH.\n'));
    }
};

const writeToFile = async (filename: string, content: string) => {
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
        } catch (e) {
            // Ignore cleanup errors
        }

        if (action === 'reject') {
            logger.warning(`Kept original ${filename}`);
            return;
        }
    } catch (e) {
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
                { name: 'README.md', checked: true },
                { name: 'CONTRIBUTING.md' },
                { name: 'LICENSE' },
            ],
            validate: (val) => val.length > 0 || 'Please select at least one file',
        },
    ]);
    const { docTypes } = answers;

    // Detect Unified Mode: All 3 selected
    const isUnifiedMode = docTypes.includes('README.md') &&
        docTypes.includes('CONTRIBUTING.md') &&
        docTypes.includes('LICENSE');

    let readmeOptions: any = { style: 'Professional', includeBadges: true, mergeDocs: false };
    let contributingOptions: any = { codeOfConduct: 'Contributor Covenant', includeTemplates: false };
    let licenseOptions: any = { licenseType: 'MIT', author: 'The Maintainers' };

    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, 'package.json');
    let projectName = path.basename(cwd);

    try {
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (pkg.name) projectName = pkg.name;
        if (pkg.author) {
            if (typeof pkg.author === 'string') licenseOptions.author = pkg.author;
            else if (pkg.author.name) licenseOptions.author = pkg.author.name;
        }
    } catch (e) {
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
        } catch (error) {
            spinner.fail('Failed to generate Unified README.md');
            console.error(error);
        }

    } else {
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

            const spinner = ora('Generating README.md...').start();
            try {
                const readme = await gemini.generateReadme(cwd, projectName, readmeOptions, (msg) => {
                    spinner.text = msg;
                });
                spinner.succeed('README.md generated!');
                await writeToFile('README.md', readme);
            } catch (error) {
                spinner.fail('Failed to generate README.md');
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
            } catch (error) {
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
            } catch (error) {
                spinner.fail('Failed to generate LICENSE');
                console.error(error);
            }
        }
    }
};

main().catch((err) => {
    logger.error(err);
    process.exit(1);
});

