'use strict';
/*
 * Adapter: Netlify Functions (current format: export default async (req, context) => Response)
 * → the Studio handlers, which take a Lambda-style event and return { statusCode, headers, body }.
 *
 * The current format is required because it gives Netlify Blobs the "uncached" connection that
 * strong-consistency reads need (the allowance counter depends on them).
 */
function toV2(lambdaHandler) {
  return async function (req, context) {
    const url = new URL(req.url);
    const headers = {};
    req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
    if (!headers['x-nf-client-connection-ip'] && context && context.ip) headers['x-nf-client-connection-ip'] = context.ip;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const event = {
      httpMethod: req.method,
      headers,
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
      body: hasBody ? await req.text() : '',
      isBase64Encoded: false,
    };
    const out = (await lambdaHandler(event, context)) || { statusCode: 204 };
    const h = new Headers();
    for (const [k, v] of Object.entries(out.headers || {})) h.set(k, String(v));
    for (const [k, list] of Object.entries(out.multiValueHeaders || {})) {
      for (const v of list) h.append(k, String(v));
    }
    return new Response(out.body === undefined || out.body === null ? '' : out.body, { status: out.statusCode || 200, headers: h });
  };
}

module.exports = { toV2 };
