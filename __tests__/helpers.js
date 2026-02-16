/**
 * Shared test helpers for DashClaw unit tests.
 * Extracted from existing tests to avoid duplication.
 */

/**
 * Build a mock Next.js Request with nextUrl support.
 * @param {string} url - Full URL string
 * @param {Object} options
 * @param {Object} [options.headers] - Request headers
 * @param {*} [options.body] - JSON body (returned by .json())
 */
export function makeRequest(url, { headers = {}, body } = {}) {
  const parsed = new URL(url);
  return {
    url,
    headers: new Headers(headers),
    json: async () => body,
    nextUrl: parsed,
  };
}

/**
 * Build a mock SQL client that tracks tagged template and .query() calls.
 * @param {Object} options
 * @param {Array} [options.taggedResponses] - Ordered responses for tagged template calls
 * @param {Array} [options.queryResponses] - Ordered responses for .query() calls
 */
export function createSqlMock({ taggedResponses = [], queryResponses = [] } = {}) {
  const taggedCalls = [];
  const queryCalls = [];

  const sql = (strings, ...values) => {
    taggedCalls.push({
      text: String.raw({ raw: strings }, ...Array(values.length).fill('?')),
      values,
    });
    if (taggedResponses.length === 0) return Promise.resolve([]);
    return Promise.resolve(taggedResponses.shift());
  };

  sql.query = async (text, params = []) => {
    queryCalls.push({ text, params });
    if (queryResponses.length === 0) return [];
    return queryResponses.shift();
  };

  // Fire-and-forget support: tagged template calls return thenables with .catch()
  const originalSql = sql;
  const proxiedSql = (strings, ...values) => {
    const result = originalSql(strings, ...values);
    result.catch = (fn) => result.then(undefined, fn);
    return result;
  };
  Object.assign(proxiedSql, sql);
  proxiedSql.query = sql.query;
  proxiedSql.taggedCalls = taggedCalls;
  proxiedSql.queryCalls = queryCalls;

  return proxiedSql;
}
