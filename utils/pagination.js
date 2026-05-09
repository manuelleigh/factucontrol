function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePagination(query = {}, defaults = {}) {
  const pageSizeLimit = defaults.maxPageSize || 50;
  const defaultPageSize = Math.min(defaults.pageSize || 10, pageSizeLimit);
  const page = toPositiveInteger(query.page, defaults.page || 1);
  const pageSize = Math.min(toPositiveInteger(query.pageSize, defaultPageSize), pageSizeLimit);

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

function buildPaginationMeta(page, pageSize, totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

module.exports = { buildPaginationMeta, normalizePagination };
