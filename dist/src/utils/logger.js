import chalk from 'chalk';
export const logger = {
    info: (msg) => console.log(chalk.blue(msg)),
    success: (msg) => console.log(chalk.green('✔ ' + msg)),
    error: (msg) => console.error(chalk.red('✘ ' + msg)),
    warning: (msg) => console.log(chalk.yellow('⚠ ' + msg)),
    bold: (msg) => console.log(chalk.bold(msg)),
};
