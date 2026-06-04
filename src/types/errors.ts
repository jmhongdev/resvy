// Custom error class for expected application errors.
// Throw this instead of a generic Error to get a specific HTTP status code.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message:    string
  ) {
    super(message);
    this.name = 'AppError';
  }
}