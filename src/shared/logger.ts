/**
 * Logging Module
 * Uses electron-log for unified logging across Main and Renderer processes
 */
import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

/**
 * Logger configuration
 */
class Logger {
    private static instance: Logger;

    private constructor() {
        this.configure();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Configure electron-log settings
     */
    private configure(): void {
        // Set log level (error, warn, info, verbose, debug, silly)
        log.transports.file.level = 'info';
        log.transports.console.level = 'debug';

        // Set log file location
        if (app) {
            const userDataPath = app.getPath('userData');
            log.transports.file.resolvePathFn = () => path.join(userDataPath, 'logs', 'mpubg.log');
        }

        // Set log format
        log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
        log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

        // Set max file size (10MB)
        log.transports.file.maxSize = 10 * 1024 * 1024;
    }

    /**
     * Log error message
     */
    public error(message: string, ...args: any[]): void {
        log.error(message, ...args);
    }

    /**
     * Log warning message
     */
    public warn(message: string, ...args: any[]): void {
        log.warn(message, ...args);
    }

    /**
     * Log info message
     */
    public info(message: string, ...args: any[]): void {
        log.info(message, ...args);
    }

    /**
     * Log debug message
     */
    public debug(message: string, ...args: any[]): void {
        log.debug(message, ...args);
    }

    /**
     * Log verbose message
     */
    public verbose(message: string, ...args: any[]): void {
        log.verbose(message, ...args);
    }
}

// Export singleton instance
export const logger = Logger.getInstance();

