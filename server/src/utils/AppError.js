class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errorCode = code;
    this.details = details;
  }
}
module.exports = AppError;
