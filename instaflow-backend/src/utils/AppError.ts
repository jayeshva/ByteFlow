export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code?: string;

    constructor(message: string, statusCode: number, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, code?: string): AppError {
        return new AppError(message, 400, code);
    }

    static unauthorized(message: string, code?: string): AppError {
        return new AppError(message, 401, code);
    }

    static forbidden(message: string, code?: string): AppError {
        return new AppError(message, 403, code);
    }

    static notFound(message: string, code?: string): AppError {
        return new AppError(message, 404, code);
    }

    static conflict(message: string, code?: string): AppError {
        return new AppError(message, 409, code);
    }

    static tooManyRequests(message: string, code?: string): AppError {
        return new AppError(message, 429, code);
    }
}
