# Contributing to docsage2

🎉 We love pull requests and welcome contributions to `docsage2`! Thank you for taking the time to contribute.

Before you start, please read our [Code of Conduct](#code-of-conduct).

## Table of Contents

- [How to Report Bugs](#how-to-report-bugs)
- [How to Request Features](#how-to-request-features)
- [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code of Conduct](#code-of-conduct)

## How to Report Bugs

If you find a bug in `docsage2`, please help us by reporting it!

1.  **Search existing issues**: Before creating a new issue, please check if the bug has already been reported. Your bug might already be known or even fixed in a newer version.
2.  **Use the bug report template**: If you can't find an existing issue, open a new one and use the provided bug report template. This helps us gather all necessary information to reproduce and fix the bug quickly.

### Bug Report Template Example

```markdown
---
name: 🐛 Bug Report
about: Report a reproducible bug in docsage2
title: "[BUG] Brief description of the issue"
labels: bug, needs-triage
assignees: ''
---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 18.x, 20.x]
- npm/yarn version: [e.g. 9.x, 1.x]
- `docsage2` version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## How to Request Features

Have an idea for a new feature or improvement? We'd love to hear it!

1.  **Search existing issues**: Check if your feature request already exists or has been discussed.
2.  **Use the feature request template**: If not, open a new issue and use the feature request template. Clearly describe your idea, its use case, and why it would be valuable for `docsage2`.

### Feature Request Template Example

```markdown
---
name: ✨ Feature Request
about: Suggest an idea for docsage2
title: "[FEAT] Concise title for your feature"
labels: enhancement, needs-triage
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is. Ex. "I'm always frustrated when [...]"

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Setting Up the Development Environment

To get started with contributing to `docsage2`, follow these steps:

1.  **Prerequisites**:
    *   Node.js (LTS recommended, check `package.json` for compatible versions)
    *   npm (comes with Node.js) or Yarn

2.  **Fork the repository**:
    *   Go to the `docsage2` GitHub repository and click the "Fork" button.
    *   This creates a copy of the repository under your GitHub account.

3.  **Clone your forked repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/docsage2.git
    cd docsage2
    ```
    Replace `YOUR_USERNAME` with your GitHub username.

4.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

5.  **Build the project**:
    This project uses TypeScript, so you'll need to compile the TypeScript files into JavaScript.
    ```bash
    npm run build
    # or
    tsc
    ```
    The compiled output will be placed in the `dist/` directory.

6.  **Run the CLI tool locally**:
    You can test your changes by running the CLI tool directly from the `dist` folder:
    ```bash
    node ./dist/bin/cli.js <command>
    ```
    For example:
    ```bash
    node ./dist/bin/cli.js help
    ```

7.  **Run tests (if applicable)**:
    Currently, the `test` script in `package.json` is a placeholder. Please check `package.json` for any updates to testing commands. If tests are added, they will likely be run with:
    ```bash
    npm test
    ```

## Code Style Guidelines

Consistency in code style is crucial for readability and maintainability. `docsage2` adheres to strict TypeScript and Node.js best practices.

*   **TypeScript**:
    *   **Strict Mode**: Ensure your code compiles without errors under `tsconfig.json`'s strict settings.
    *   **Type Annotations**: Explicitly define types for variables, function parameters, and return values where clarity is improved.
    *   **Interfaces & Types**: Use interfaces for defining object shapes and types for more complex type aliases.
    *   **Naming Conventions**:
        *   `camelCase` for variables, functions, and properties.
        *   `PascalCase` for classes, interfaces, and types.
        *   `CONSTANT_CASE` for global constants.
    *   **ES Modules**: Use `import`/`export` syntax (`.js` extension for imports in compiled code is handled by `NodeNext` resolution).
    *   **JSDoc**: Add JSDoc comments for public APIs, complex functions, and class methods to explain their purpose, parameters, and return values.

*   **JavaScript/Node.js**:
    *   **Asynchronous Code**: Prefer `async/await` for handling promises over `.then().catch()`.
    *   **Error Handling**: Implement robust error handling.
    *   **Modern Syntax**: Utilize modern JavaScript features (e.g., destructuring, spread syntax, arrow functions).

*   **Formatting**:
    *   While not explicitly listed in `package.json`, we encourage using a formatter like **Prettier** to ensure consistent formatting. Most IDEs have Prettier integrations.
    *   **Line Length**: Aim for lines under 100-120 characters.
    *   **Indentation**: 4 spaces.

*   **Linting**:
    *   **ESLint** (or a similar linter) is highly recommended. Your code should pass all linting checks before submission. Check `package.json` for a `lint` script if available, or consider setting up ESLint in your editor.

## Pull Request Process

1.  **Create a branch**:
    *   Always create a new branch for your changes, named descriptively.
    *   Example: `git checkout -b feature/my-new-feature` or `git checkout -b bugfix/fix-that-bug`

2.  **Make your changes**:
    *   Implement your feature or bug fix.
    *   Ensure your code adheres to the [Code Style Guidelines](#code-style-guidelines).
    *   Run `npm run build` to ensure your TypeScript compiles without errors.

3.  **Commit your changes**:
    *   Write clear, concise commit messages that explain *what* and *why*.
    *   Example: `git commit -m "feat: Add support for custom output directory"`

4.  **Push to your fork**:
    ```bash
    git push origin feature/my-new-feature
    ```

5.  **Open a Pull Request (PR)**:
    *   Go to the original `docsage2` GitHub repository.
    *   GitHub will usually prompt you to open a PR from your recently pushed branch.
    *   **Fill out the PR template**: Provide a clear title and description for your PR. Link to any relevant issues (e.g., `Fixes #123`, `Closes #456`).

### Pull Request Template Example

```markdown
---
name: 🚀 Pull Request
about: Propose a change to docsage2
title: "[TYPE] Brief description of the change"
labels: ''
assignees: ''
---

**What does this PR do?**
A clear and concise description of the changes introduced by this PR.

**Why is this change necessary?**
Explain the problem this PR solves or the feature it introduces. Reference any related issues (e.g., `Closes #123`).

**How to test this change?**
Provide detailed steps on how to manually test the changes made in this PR.

**Screenshots (if applicable)**
Add any screenshots that help illustrate the changes or show the bug fix in action.

**Checklist:**
- [ ] My code follows the project's code style guidelines.
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have made corresponding changes to the documentation (if applicable).
- [ ] My changes generate no new warnings.
- [ ] I have added tests that prove my fix is effective or that my feature works (if applicable).
- [ ] New and existing unit tests pass locally with my changes (if applicable).
```

6.  **Review and iteration**:
    *   Maintainers will review your PR, provide feedback, and may request changes.
    *   Be responsive to comments and make any necessary adjustments.

Thank you for your contribution!

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project, you agree to abide by its terms. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) for more details.