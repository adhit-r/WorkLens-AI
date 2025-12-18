import { Context } from 'hono';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

export class CodeRedError extends AppError {
  constructor() {
    super(400, 'code red', 'OUT_OF_DOMAIN');
  }
}

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return c.json({
      error: err.code || 'ERROR',
      message: err.message,
    }, err.statusCode as any);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: (err as any).errors,
    }, 400);
  }

  // Generic server error
  return c.json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
  }, 500);
}

