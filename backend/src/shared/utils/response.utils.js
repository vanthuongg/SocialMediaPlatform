/**
 * Sends a uniform success response.
 * @param {import('express').Response} res
 * @param {object} options
 */
export function sendSuccess(res, { data = null, message = 'Success', statusCode = 200, meta = null }) {
  const body = { success: true, message, data };
  if (meta) body.meta = { ...meta, timestamp: new Date().toISOString() };
  return res.status(statusCode).json(body);
}

/**
 * Sends a paginated list response.
 */
export function sendPaginated(res, data, meta) {
  return res.status(200).json({
    success: true,
    data,
    meta: { ...meta, timestamp: new Date().toISOString() },
  });
}
