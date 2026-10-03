export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Same envelope as backend-mongo: { success, data, message? } */
export const sendResponse = (res, status, data, message) => {
  const body = { success: status >= 200 && status < 300, data };
  if (message) body.message = message;
  return res.status(status).json(body);
};

/**
 * Throws an AppError for a failed supabase-js call.
 * Postgres errcodes raised by our SQL functions: P0001 -> 400, P0002 -> 404, 23505 (unique) -> 409.
 */
export function unwrap({ data, error }, fallback = 'Database error') {
  if (!error) return data;
  const status = error.code === 'P0002' ? 404 : error.code === 'P0001' ? 400 : error.code === '23505' ? 409 : 500;
  const msg = status === 409 ? 'A record with the same unique value already exists' : status === 500 ? fallback : error.message;
  const err = new AppError(msg, status, status !== 500);
  if (status === 500) err.cause = error;
  throw err;
}
