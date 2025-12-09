#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import figlet from 'figlet';
import gradient from 'gradient-string';
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
const getApiKey = async () => {
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
const writeToFile = async (filename, content) => {
    const cwd = process.cwd();
    const filePath = path.join(cwd, filename);
    // Check existence
    try {
        await fs.access(filePath);
        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `${filename} already exists. Overwrite?`,
                default: false,
            },
        ]);
        if (!overwrite) {
            logger.warning(`Skipped creating ${filename}`);
            return;
        }
    }
    catch (e) {
        // File doesn't exist, proceed
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
    let readmeOptions = { style: 'Professional', includeBadges: true };
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
    }
    const cwd = process.cwd();
    const packageJsonPath = path.join(cwd, 'package.json');
    let projectName = path.basename(cwd);
    try {
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        if (pkg.name)
            projectName = pkg.name;
    }
    catch (e) {
        // package.json might not exist
    }
    if (docTypes.includes('README.md')) {
        const spinner = ora('Generating README.md...').start();
        try {
            const readme = await gemini.generateReadme(cwd, projectName, readmeOptions, (msg) => {
                spinner.text = msg;
            });
            spinner.succeed('README.md generated!');
            await writeToFile('README.md', readme);
        }
        catch (error) {
            spinner.fail('Failed to generate README.md');
            console.error(error);
        }
    }
    if (docTypes.includes('CONTRIBUTING.md')) {
        const spinner = ora('Generating CONTRIBUTING.md...').start();
        try {
            const contributing = await gemini.generateContributing(cwd, (msg) => {
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
    if (docTypes.includes('LICENSE')) {
        const spinner = ora('Generating LICENSE...').start();
        try {
            // Try to get author from package.json
            let author = 'The Maintainers';
            const packageJsonPath = path.join(cwd, 'package.json');
            try {
                const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
                if (pkg.author) {
                    if (typeof pkg.author === 'string')
                        author = pkg.author;
                    else if (pkg.author.name)
                        author = pkg.author.name;
                }
            }
            catch (e) { }
            const license = await gemini.generateLicense(cwd, author, (msg) => {
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
};
main().catch((err) => {
    logger.error(err);
    process.exit(1);
});
