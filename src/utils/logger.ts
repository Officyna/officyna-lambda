export interface LogContext {
    requestId?: string;
    functionName?: string;
    [key: string]: unknown;
}

function writeLog(
    level: 'INFO' | 'WARN' | 'ERROR',
    event: string,
    context: LogContext = {}
): void {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        service: process.env.NEW_RELIC_APP_NAME || 'officyna-auth-lambda',
        environment: process.env.NODE_ENV || 'development',
        ...context
    };

    if (level === 'ERROR') {
        console.error(JSON.stringify(logEntry));
        return;
    }

    if (level === 'WARN') {
        console.warn(JSON.stringify(logEntry));
        return;
    }

    console.log(JSON.stringify(logEntry));
}

export function logInfo(
    event: string,
    context: LogContext = {}
): void {
    writeLog('INFO', event, context);
}

export function logWarn(
    event: string,
    context: LogContext = {}
): void {
    writeLog('WARN', event, context);
}

export function logError(
    event: string,
    error?: unknown,
    context: LogContext = {}
): void {
    const errorDetails =
        error instanceof Error
            ? {
                errorName: error.name,
                errorMessage: error.message,
                errorStack: error.stack
            }
            : {
                errorMessage: String(error)
            };

    writeLog('ERROR', event, {
        ...context,
        ...errorDetails
    });
}