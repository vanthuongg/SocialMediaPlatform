/**
 * Builds pagination metadata and query options from request params.
 * @param {{ page?: string|number, limit?: string|number }} query
 * @param {number} total - Total document count
 * @returns {{ skip: number, limit: number, meta: object }}
 */
export function paginate(query, total) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  return {
    skip,
    limit,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Cursor-based pagination for infinite scroll feeds.
 * @param {string|null} cursor - Last document _id from previous page
 * @param {number} limit
 */
export function cursorPaginate(cursor, limit = 20) {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
  const query = cursor ? { _id: { $lt: cursor } } : {};
  return { query, limit: safeLimit };
}
