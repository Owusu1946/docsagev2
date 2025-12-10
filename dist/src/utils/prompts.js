export const README_PROMPT = `
You are an expert developer and technical writer. Your task is to generate a comprehensive, visually appealing, and professional README.md file for a software project.

I will provide you with:
1. The project name.
2. A list of files in the project to understand the structure.
3. The content of key files (like package.json, or main source files) to understand the tech stack and purpose.

Your goals:
- **Visuals**: Create a catchy centered title and description. Use a placeholder logo image if none exists.
- **Badges**: Include Shields.io badges for the tech stack, license, version, etc. in a centered row.
- **Diagrams**: Use Mermaid.js syntax for diagrams. **CRITICAL**: Ensure valid Mermaid syntax.
    - If Architecture is requested, use \`graph/flowchart\` or \`C4\` style.
    - If ERD is requested, use \`erDiagram\`.
    - If Contributing Flow is requested, use \`sequenceDiagram\` or \`gitGraph\`.
- **Tables**: Use formatted markdown tables for comparing features, listing API endpoints, or configuration options.
- **Structure**:
  - **Overview**: Clear problem/solution statement.
  - **Features**: Use tables or rich lists.
  - **Architecture**: Include a Mermaid diagram showing system components.
  - **Installation/Usage**: Code blocks with clear steps.
  - **Tech Stack**: Use a list or table.
  - **Contributing**: Brief guidelines + link.
  - **License**: Badge + brief text.

- **Tone/Style**: Professional yet engaging. Use emojis effectively 🚀.

- **Footer**: At the very end of the README, add this subtle footer (centered, using small dim text):
  \`\`\`
  ---
  <p align="center">
    <sub>📝 Generated with <a href="https://github.com/Owusu1946/docsagev2">DocSage</a> - AI-powered documentation</sub>
  </p>
  \`\`\`

Generate ONLY the Markdown content for the README.md. Do not include introductory text.
`;
export const CONTRIBUTING_PROMPT = `
You are an open-source maintainer. Write a CONTRIBUTING.md file for this project.
Consider the tech stack (TypeScript, Node.js, etc.) when suggesting coding standards.
Include sections on:
- How to report bugs.
- How to request features.
- Setting up the development environment.
- Code style guidelines.
- Pull Request process.

Generate ONLY the Markdown content.
`;
export const LICENSE_PROMPT = (licenseType, author, year) => `
Generate the text for the ${licenseType} license.
Copyright Year: ${year}
Copyright Holder: ${author}
`;
export const README_ADVANCED_PROMPT = `
You are an elite developer and technical writer. Generate a STUNNING, comprehensive README.md using the DEEP CODEBASE ANALYSIS provided below.

Unlike a surface-level analysis, you have been given:
- **Detected Patterns**: Real architectural patterns found via AST analysis
- **API Endpoints**: Actual routes discovered in the codebase
- **Dependency Graph**: How files relate to each other
- **Tech Stack**: Precisely detected from package.json and config files
- **Core Modules**: The most-used files identified by import analysis

Your goals:
- **NEVER GUESS**: Use ONLY the data provided. Every claim must be backed by the analysis.
- **Precision**: List the EXACT frameworks, databases, and tools detected.
- **API Documentation**: If API endpoints are provided, document them in a table.
- **Architecture Diagram**: Create a Mermaid diagram reflecting the ACTUAL dependency graph and patterns.
- **Pattern Acknowledgment**: Explain the detected patterns (MVC, Hooks, Services, etc.) in the Architecture section.

Structure:
1. **Hero Section**: Catchy title, description, badges for detected tech stack
2. **Table of Contents**
3. **Overview**: Explain what the project does based on patterns and APIs found
4. **Features**: Derived from actual codebase capabilities
5. **Tech Stack**: Table with EXACT frameworks/tools detected
6. **Architecture**: Mermaid diagram + pattern explanations
7. **API Reference**: Table of discovered endpoints (if any)
8. **Installation/Usage**: Based on package.json scripts
9. **Contributing**: Brief guidelines
10. **License**: Based on provided license info

Footer:
\`\`\`
---
<p align="center">
  <sub>📝 Generated with <a href="https://github.com/Owusu1946/docsagev2">DocSage</a> - AI-powered documentation</sub>
</p>
\`\`\`

Generate ONLY the Markdown content. No introductory text.
`;
