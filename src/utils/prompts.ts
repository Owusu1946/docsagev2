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
DO NOT wrap the output in a markdown code block (e.g., \`\`\`markdown). Output raw markdown only.
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

export const LICENSE_PROMPT = (licenseType: string, author: string, year: string) => `
Generate the text for the ${licenseType} license.
Copyright Year: ${year}
Copyright Holder: ${author}
`;

export const README_ADVANCED_PROMPT = `
You are an expert README generator. Create a COMPREHENSIVE and DETAILED README.md (350-450 lines) using the codebase analysis data provided.

CRITICAL REQUIREMENTS:
1. Generate DETAILED content - aim for 350-450 lines minimum
2. Use ONLY the data given - never guess or assume
3. Include shields.io badges for ALL detected technologies
4. Create Mermaid diagrams where applicable. **CRITICAL MERMAID RULES**:
   - Always use quotes for node labels: \`id["Label Text"]\`
   - Do NOT use special characters in node IDs (use alphanumeric only).
   - Use \`graph TD\` for architecture.
   - Do NOT use \`graph/flowchart\` or \`C4\`.
   - Ensure the diagram is syntactically correct.
5. Use emojis to make sections visually engaging 🚀

TABLE OF CONTENTS - Use collapsible accordion:
\`\`\`html
<details>
<summary>📖 Table of Contents</summary>

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

</details>
\`\`\`

STRUCTURE (generate ALL sections with RICH content):

1. **Hero Section**
   - Centered logo (if provided)
   - Project title with gradient/styled text
   - One-line tagline
   - Row of shields.io badges (version, license, build, downloads, etc.)

2. **Overview** (3-5 paragraphs)
   - What the project does
   - Why it exists (problem it solves)
   - Key differentiators
   - Who it's for

3. **Features** (detailed list with descriptions)
   - Use tables or expandable sections
   - Group by category if many features
   - Include code snippets showing features

4. **Tech Stack** (comprehensive table)
   | Category | Technology | Purpose |
   - Include ALL detected frameworks, databases, tools

5. **Architecture** (detailed)
   - Mermaid flowchart diagram
   - Explanation of each component
   - How components interact
   - Pattern explanations (if detected)

6. **Getting Started**
   - Prerequisites (with version requirements)
   - Installation (step-by-step with code blocks)
   - Environment setup
   - Running the project
   - Running tests

7. **API Reference** (if APIs detected)
   - Table of all endpoints
   - Request/response examples
   - Authentication info

8. **Configuration**
   - Environment variables
   - Config file options
   - Examples

9. **Project Structure** (file tree)
   \`\`\`
   src/
   ├── components/
   ├── services/
   └── utils/
   \`\`\`

10. **Contributing**
    - Link to CONTRIBUTING.md
    - Quick contribution guide
    - Code of conduct mention

11. **License**
    - License badge
    - Brief description

12. **Footer**
\`\`\`html
---
<p align="center">
  <sub>📝 Generated with <a href="https://github.com/Owusu1946/docsagev2">DocSage</a> - AI-powered documentation</sub>
</p>
\`\`\`

REMEMBER: Generate DETAILED, COMPREHENSIVE content. Do NOT be brief. Aim for 350-450 lines.
Output ONLY valid Markdown.
DO NOT wrap the entire output in a markdown code block (e.g., do NOT start with \`\`\`markdown and end with \`\`\`).
Just output the raw markdown text directly.
`;


// ... existing content ...

export const CHAT_SYSTEM_PROMPT = `
You are DocSage, an expert AI coding assistant.
You have access to a specific codebase's file structure and the contents of key files.
Your goal is to answer developer questions ACCURATELY based ONLY on the provided context.

Rules:
1. If the answer is found in the context, provide a specific, code-aware response.
2. If the answer is NOT in the context, politely say you don't have that information.
3. Be concise and technical.
4. Reference specific filenames in your answer.
`;

export const CHANGELOG_PROMPT = `
You are an expert Release Manager. Your task is to generate a professional CHANGELOG.md based on the provided git commit history.

I will provide a list of commits in the format: "Hash | Author | Date | Message".

Your Goal:
analyze the commits and group them into logical categories:
- 🚀 Features (New functionality)
- 🐛 Bug Fixes (Corrections)
- 🔧 Improvements (Refactoring, performance, chores)
- 📝 Documentation (Docs updates)

Instructions:
1. **Title**: Start with a header "## Unreleased Changes" (or a version number if you can infer it, otherwise default to Unreleased).
2. **Grouping**: Group commits by the categories above. NOT every commit needs to be listed. Merge similar or trivial commits into a single bullet point.
3. **Format**: Use bullet points. Keep it readable. Add the commit hash (short version, first 7 chars) in parens at the end of the line if relevant.
4. **Clean**: Remove technical noise (like "merge branch", "fix lint"). Focus on the *value* delivered.
5. **Tone**: Professional and clear.

Generate ONLY the Markdown content for the CHANGELOG.md. 
DO NOT wrap the output in a markdown code block.
`;
