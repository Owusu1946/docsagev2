/**
 * Logo Generator Service
 * 
 * Generates project logos using:
 * 1. DiceBear API - Free, deterministic SVG avatars
 * 2. Shields.io - Badge-style logos
 * 3. Custom SVG - Text-based gradient logos
 * 
 * No external dependencies required - uses fetch API.
 */

import fs from 'fs/promises';
import path from 'path';

export interface LogoOptions {
    projectName: string;
    style?: 'identicon' | 'initials' | 'shapes' | 'icons' | 'bottts' | 'pixel-art';
    size?: number;
    backgroundColor?: string;
    outputDir?: string;
}

export interface GeneratedLogo {
    svgPath: string;
    pngPath?: string;
    url: string;
    markdown: string;
}

// DiceBear styles that work well for project logos
const DICEBEAR_STYLES = {
    'identicon': 'identicon',      // GitHub-style geometric
    'initials': 'initials',        // Letter-based
    'shapes': 'shapes',            // Abstract shapes
    'icons': 'icons',              // Simple icons
    'bottts': 'bottts',            // Robot avatars
    'pixel-art': 'pixel-art'       // Pixel art style
};

/**
 * Generate a project logo using DiceBear API
 */
export async function generateLogo(options: LogoOptions): Promise<GeneratedLogo> {
    const {
        projectName,
        style = 'identicon',
        size = 128,
        backgroundColor = 'transparent',
        outputDir = process.cwd()
    } = options;

    const dicebearStyle = DICEBEAR_STYLES[style] || 'identicon';

    // Create deterministic seed from project name
    const seed = encodeURIComponent(projectName.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Build DiceBear URL
    const bgParam = backgroundColor === 'transparent' ? '' : `&backgroundColor=${backgroundColor.replace('#', '')}`;
    const url = `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${seed}&size=${size}${bgParam}`;

    try {
        // Fetch the SVG
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch logo: ${response.status}`);
        }

        const svgContent = await response.text();

        // Ensure assets directory exists
        const assetsDir = path.join(outputDir, 'assets');
        await fs.mkdir(assetsDir, { recursive: true });

        // Save SVG file
        const svgFilename = `logo.svg`;
        const svgPath = path.join(assetsDir, svgFilename);
        await fs.writeFile(svgPath, svgContent, 'utf-8');

        // Generate markdown for README
        const markdown = `<p align="center">
  <img src="./assets/${svgFilename}" alt="${projectName} logo" width="${size}" height="${size}">
</p>`;

        return {
            svgPath,
            url,
            markdown
        };
    } catch (error) {
        // Fallback to custom SVG if DiceBear fails
        return generateFallbackLogo(options);
    }
}

/**
 * Generate a simple gradient text logo as fallback
 */
async function generateFallbackLogo(options: LogoOptions): Promise<GeneratedLogo> {
    const { projectName, size = 128, outputDir = process.cwd() } = options;

    // Extract initials (up to 2 characters)
    const words = projectName.split(/[\s-_]+/);
    const initials = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : projectName.substring(0, 2).toUpperCase();

    // Generate a color based on project name
    const hash = projectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    const color1 = `hsl(${hue}, 70%, 50%)`;
    const color2 = `hsl(${(hue + 40) % 360}, 70%, 60%)`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;

    // Ensure assets directory exists
    const assetsDir = path.join(outputDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    // Save SVG
    const svgFilename = 'logo.svg';
    const svgPath = path.join(assetsDir, svgFilename);
    await fs.writeFile(svgPath, svg, 'utf-8');

    const markdown = `<p align="center">
  <img src="./assets/${svgFilename}" alt="${projectName} logo" width="${size}" height="${size}">
</p>`;

    return {
        svgPath,
        url: '',
        markdown
    };
}

/**
 * Generate logo with multiple style options for user to choose
 */
export async function generateLogoOptions(projectName: string): Promise<{ style: string; url: string }[]> {
    const styles = Object.keys(DICEBEAR_STYLES);
    const seed = encodeURIComponent(projectName.toLowerCase().replace(/[^a-z0-9]/g, ''));

    return styles.map(style => ({
        style,
        url: `https://api.dicebear.com/7.x/${DICEBEAR_STYLES[style as keyof typeof DICEBEAR_STYLES]}/svg?seed=${seed}&size=64`
    }));
}

/**
 * Check if project already has a logo
 */
export async function hasExistingLogo(projectDir: string): Promise<boolean> {
    const possiblePaths = [
        path.join(projectDir, 'assets', 'logo.svg'),
        path.join(projectDir, 'assets', 'logo.png'),
        path.join(projectDir, 'logo.svg'),
        path.join(projectDir, 'logo.png'),
        path.join(projectDir, '.github', 'logo.svg'),
        path.join(projectDir, '.github', 'logo.png')
    ];

    for (const logoPath of possiblePaths) {
        try {
            await fs.access(logoPath);
            return true;
        } catch {
            // File doesn't exist, continue checking
        }
    }

    return false;
}
