import chalk from "chalk";
import debug from "debug";

debug.enable('pixie,pixie:*');

debug.useColors = () => true;

export const baseLog = debug('pixie');

/**
 * Logger function
 * @param {string} string - The string to log
 * @param {string} style - The style of the log
 * @param {...any} args - The arguments to pass to the log
 * @returns {void}
 * @example
 * log('Hello, world!', 'info');
 * log('Hello, world!', 'error');
 * log('Hello, world!', 'warn');
 * log('Hello, world!', 'debug');
 * log('Hello, world!', 'success');
 */
export const log = (string, style, ...args) => {

    const styles = {
        info: { prefix: chalk.blue('[INFO]'), logFunction: console.log, debugFunction: baseLog.extend('info') },
        error: { prefix: chalk.red('[ERROR]'), logFunction: console.error, debugFunction: baseLog.extend('error') },
        warn: { prefix: chalk.yellow('[WARN]'), logFunction: console.warn, debugFunction: baseLog.extend('warn') },
        debug: { prefix: chalk.green('[DEBUG]'), logFunction: console.debug, debugFunction: baseLog.extend('debug') },
        success: { prefix: chalk.green('[SUCCESS]'), logFunction: console.log, debugFunction: baseLog.extend('success') },
        debug: { prefix: chalk.green('[DEBUG]'), logFunction: console.debug, debugFunction: baseLog.extend('debug') },
    }

    const selected = styles[style] || { logFunction: console.log, debugFunction: baseLog.extend('log') }

    if (selected.debugFunction.enabled) {
        selected.debugFunction(string, ...args);
    } else {
        selected.logFunction(`${selected.prefix || ''} ${string}`, ...args)
    }
}