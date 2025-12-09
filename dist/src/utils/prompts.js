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
