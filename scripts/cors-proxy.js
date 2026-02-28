/**
 * Local CORS proxy for web development.
 * Runs on port 8082 and forwards API requests to their target servers,
 * adding CORS headers so the browser allows the requests.
 *
 * Usage: node scripts/cors-proxy.js
 *
 * The web app sends requests to http://localhost:8082/<target-url>
 * e.g. http://localhost:8082/https://api.manus.ai/v1/tasks
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 8082;

const server = http.createServer((req, res) => {
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Extract target URL from the path (remove leading /)
  const targetUrl = decodeURIComponent(req.url.slice(1));
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Provide target URL as path, e.g. /https://api.example.com/v1/endpoint' }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid target URL' }));
    return;
  }

  // Collect request body
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = chunks.length > 0 ? Buffer.concat(chunks) : null;

    // Forward headers (exclude host and origin)
    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'origin' || lower === 'referer' || lower === 'connection') continue;
      forwardHeaders[key] = value;
    }
    forwardHeaders['host'] = parsed.host;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: req.method,
      headers: forwardHeaders,
    };

    const transport = parsed.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(options, (proxyRes) => {
      // Forward response headers + add CORS
      const responseHeaders = { ...proxyRes.headers };
      responseHeaders['access-control-allow-origin'] = '*';
      responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
      responseHeaders['access-control-allow-headers'] = '*';

      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy error for ${targetUrl}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`🔀 CORS Proxy running on http://localhost:${PORT}`);
  console.log(`   Usage: http://localhost:${PORT}/https://api.example.com/v1/endpoint`);
});
