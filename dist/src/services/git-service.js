import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class GitService {
    /**
     * Get the git diff of staged changes.
     * If there are no staged changes, gets the diff of the last commit.
     */
    async getDiff(cwd) {
        try {
            // First try staged changes
            const { stdout: stagedDiff } = await execAsync('git diff --cached -- . ":!package-lock.json" ":!yarn.lock" ":!node_modules"', { cwd });
            if (stagedDiff.trim()) {
                return stagedDiff.slice(0, 10000); // Limit size for token limits
            }
            // Fallback to last commit if no staged changes
            const { stdout: lastCommitDiff } = await execAsync('git diff HEAD~1 HEAD -- . ":!package-lock.json" ":!yarn.lock" ":!node_modules"', { cwd });
            return lastCommitDiff.slice(0, 10000); // Limit size
        }
        catch (error) {
            console.warn('Failed to get git diff:', error);
            return '';
        }
    }
    /**
     * Check if the directory is a git repository
     */
    async isGitRepo(cwd) {
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the last commit message
     */
    async getLastCommitMessage(cwd) {
        try {
            const { stdout } = await execAsync('git log -1 --pretty=%B', { cwd });
            return stdout.trim();
        }
        catch {
            return '';
        }
    }
}
