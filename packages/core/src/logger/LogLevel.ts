/**
 * Defines the available logging levels, ordered by severity.
 * Lower number means higher priority (Error is 0, Debug is 3).
 * Use `LogLevel.None` to disable all logging output.
 */
export enum LogLevel {
    /** For critical errors that might prevent the application from continuing. */
    Error = 0,
    /** For potential issues or non-critical problems that don't stop execution. */
    Warn = 1,
    /** For general informational messages about the application's progress or state. */
    Info = 2,
    /** For detailed diagnostic information useful during development and debugging. */
    Debug = 3,
    /** Special level to disable all logging output. */
    None = 99,
}