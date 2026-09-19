// §13.4 Error catalogue 🔒 — every response carries X-Request-Id; every error body includes it.

export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  RESOURCE_CONFLICT: 409,
  ILLEGAL_TRANSITION: 409,
  PLAN_EXPIRED: 410,
  UNPROCESSABLE: 422,
  LOCKED: 423,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class AppError extends Error {
  constructor(code, message, details = undefined) {
    super(message || code);
    this.code = code;
    this.status = ERROR_STATUS[code] || 500;
    this.details = details;
  }
}

export function notFound(entity, id) {
  return new AppError('NOT_FOUND', `${entity} ${id} not found`);
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId;
  if (err instanceof AppError) {
    if (err.status >= 500) req.log?.error({ err, requestId }, err.message);
    else req.log?.warn({ code: err.code, requestId }, err.message);
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, request_id: requestId },
    });
  }

  if (err?.name === 'ZodError') {
    const fields = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { fields }, request_id: requestId },
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: 'A conflicting record already exists',
        details: { keyPattern: err.keyPattern },
        request_id: requestId,
      },
    });
  }

  req.log?.error({ err, requestId }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error', request_id: requestId },
  });
}
