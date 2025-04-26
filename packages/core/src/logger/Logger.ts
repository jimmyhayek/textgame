import { LogLevel } from './LogLevel';

/**
 * A simple logger class for consistent logging across the framework.
 * Allows setting a log level to filter messages based on severity.
 *
 * By default, only messages with level Warn or Error are logged unless
 * explicitly configured otherwise.
 */
export class Logger {
    private currentLevel: LogLevel;
    private readonly prefix: string;

    /**
     * Creates a new Logger instance.
     * @param initialLevel The minimum level of messages to log.
     *                     Defaults to `LogLevel.Warn` for safer production behavior.
     * @param prefix An optional prefix string added to the beginning of each log message.
     *               Defaults to '[Pabitel]'.
     */
    constructor(initialLevel: LogLevel = LogLevel.Warn, prefix: string = '[Pabitel]') {
        this.currentLevel = initialLevel;
        // Ensure prefix ends with a space if it's not empty
        this.prefix = prefix ? `${prefix} ` : '';
    }

    /**
     * Sets the minimum log level. Messages with severity lower than this level
     * (i.e., higher numeric value) will be ignored.
     * @param level The new minimum `LogLevel` to display.
     */
    public setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    /**
     * Gets the current minimum log level.
     * @returns The current `LogLevel`.
     */
    public getLevel(): LogLevel {
        return this.currentLevel;
    }

    /**
     * Logs a debug message if the current log level allows it (`Debug`).
     * Output is sent to `console.debug`.
     * Use for detailed diagnostic information during development.
     *
     * @param message The primary message or first argument to log.
     * @param optionalParams Additional arguments to log (similar to `console.debug`).
     */
    public debug(message?: any, ...optionalParams: any[]): void {
        if (this.currentLevel >= LogLevel.Debug) {
            // Using console.debug for semantic correctness, though often styled like log.
            console.debug(`${this.prefix}[DBG]`, message, ...optionalParams);
        }
    }

    /**
     * Logs an informational message if the current log level allows it (`Info` or higher).
     * Output is sent to `console.info`.
     * Use for general information about application flow or state.
     *
     * @param message The primary message or first argument to log.
     * @param optionalParams Additional arguments to log (similar to `console.info`).
     */
    public info(message?: any, ...optionalParams: any[]): void {
        if (this.currentLevel >= LogLevel.Info) {
            // Using console.info for semantic correctness, though often styled like log.
            console.info(`${this.prefix}[INF]`, message, ...optionalParams);
        }
    }

    /**
     * Logs a warning message if the current log level allows it (`Warn` or higher).
     * Output is sent to `console.warn`.
     * Use for indicating potential issues or non-ideal situations that don't halt execution.
     *
     * @param message The primary message or first argument to log.
     * @param optionalParams Additional arguments to log (similar to `console.warn`).
     */
    public warn(message?: any, ...optionalParams: any[]): void {
        if (this.currentLevel >= LogLevel.Warn) {
            console.warn(`${this.prefix}[WRN]`, message, ...optionalParams);
        }
    }

    /**
     * Logs an error message if the current log level allows it (`Error` or higher).
     * Output is sent to `console.error`.
     * Use for reporting errors, exceptions, or failures.
     *
     * @param message The primary message or first argument (often an Error object).
     * @param optionalParams Additional arguments to log (similar to `console.error`).
     */
    public error(message?: any, ...optionalParams: any[]): void {
        // Errors should generally always be logged unless level is explicitly None.
        if (this.currentLevel >= LogLevel.Error) {
            console.error(`${this.prefix}[ERR]`, message, ...optionalParams);
        }
    }
}