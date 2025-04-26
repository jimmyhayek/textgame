/**
 * Base class for all framework-specific errors.
 * Allows adding optional context data and helps distinguish framework errors
 * from generic JavaScript errors.
 */
export class EngineError extends Error {
    /** Optional additional data related to the error context. */
    public readonly context?: any;
    /** Timestamp (in milliseconds) when the error was created. */
    public readonly timestamp: number;

    /**
     * Creates an instance of EngineError.
     * @param message The primary error message.
     * @param context Optional additional data providing context about the error.
     * @param options Optional standard Error options, including 'cause' for error chaining.
     */
    constructor(message: string, context?: any, options?: ErrorOptions) {
        // Pass message and options (like 'cause') to the parent Error constructor
        super(message, options);

        // Set the error name to the actual class name for better identification
        this.name = this.constructor.name;

        this.context = context;
        this.timestamp = Date.now();

        // Improve stack trace readability in V8 environments (Node.js, Chrome)
        // This removes the constructor call from the stack trace.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}