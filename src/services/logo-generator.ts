import fs from 'fs/promises';
import path from 'path';

export const hasExistingLogo = async (cwd: string): Promise<boolean> => {
    try {
        const files = await fs.readdir(cwd);
        // Look for common logo filenames
        const logoFiles = files.filter(f => /^logo\.(svg|png|jpg|jpeg|webp)$/i.test(f));
        // Also check assets/ folder if it exists
        try {
            const assetsFiles = await fs.readdir(path.join(cwd, 'assets'));
            const assetsLogos = assetsFiles.filter(f => /^logo\.(svg|png|jpg|jpeg|webp)$/i.test(f));
            return logoFiles.length > 0 || assetsLogos.length > 0;
        } catch {
            return logoFiles.length > 0;
        }
    } catch {
        return false;
    }
};

interface LogoOptions {
    projectName: string;
    style: string;
    size: number;
    outputDir: string;
}

export const generateLogo = async (options: LogoOptions): Promise<{ markdown: string }> => {
    const { projectName, size, outputDir } = options;
    const assetsDir = path.join(outputDir, 'assets');

    // Ensure assets directory exists
    await fs.mkdir(assetsDir, { recursive: true });

    // Generate a simple SVG based on the project name
    // Using a gradient background and the first letter
    const initial = projectName.charAt(0).toUpperCase();

    // Generate random colors for the gradient
    const hue1 = Math.floor(Math.random() * 360);
    const hue2 = (hue1 + 40) % 360;
    const color1 = `hsl(${hue1}, 70%, 60%)`;
    const color2 = `hsl(${hue2}, 70%, 60%)`;

    const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="${size / 4}" fill="url(#grad)" />
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white" text-anchor="middle" dy="0.35em">${initial}</text>
</svg>`;

    const logoPath = path.join(assetsDir, 'logo.svg');
    await fs.writeFile(logoPath, svgContent, 'utf-8');

    return {
        markdown: `<p align="center">\n  <img src="assets/logo.svg" alt="${projectName} Logo" width="${size}">\n</p>`
    };
};
