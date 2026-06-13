// Base class for all application errors.
// All domain-specific error classes extend this.
export class AppError extends Error {
  constructor(
    public code:       string,
    message:           string,
    public statusCode: number = 500,
    public data?:      Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}