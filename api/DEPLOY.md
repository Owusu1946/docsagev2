# Deploying DocSage API to Render

This repository uses an npm workspace structure. The root directory contains the CLI tool, and the `api/` directory contains the Express API which reuses the core logic.

## Deployment Steps

1.  **Create a New Web Service** on Render.
2.  **Connect your GitHub repository**.
3.  **Configuration**:

    | Setting | Value |
    | :--- | :--- |
    | **Root Directory** | `.` (Leave default / empty) |
    | **Build Command** | `npm install && npm run build:api` |
    | **Start Command** | `npm run start:api` |

4.  **Environment Variables**:
    You MUST set the generic environment variables for the service:

    -   `GEMINI_API_KEY`: Your Google Gemini API Key.
    -   `NODE_VERSION`: Recommended `20.11.0` or higher.

## How it works

-   The **Build Command** installs dependencies for both the root (CLI) and the `api` workspace, then triggers the API build script (`tsc` inside `api/`).
-   The **Start Command** runs the compiled API server located at `api/dist/api/src/index.js`.
-   The API utilizes shared code from `src/` (like `CodebaseScanner`, `GeminiService`, `GitService`) which is compiled into the distribution.

## Troubleshooting

-   **Memory**: Since the API performs codebase analysis (cloning and AST parsing), closely monitor memory usage. If analyzing large repos, you may need a higher tier plan.
-   **Disk**: The service clones repos to a temporary directory. Render's ephemeral disk is usually sufficient, as we cleanup immediately.
