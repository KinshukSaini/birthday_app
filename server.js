// Tiny zero-dependency server for running the birthday surprise locally.
// (On Vercel, public/ is served as static files and api/ handles the API instead.)
//   /         -> the surprise itself
//   /modify   -> editor for all the text
//   /api/config (GET / POST / DELETE) -> read, save or reset the text
const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('./lib/store');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.MODIFY_PASSWORD || '';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function authorized(req) {
  return !PASSWORD || req.headers['x-modify-password'] === PASSWORD;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) { reject(new Error('too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/\/+$/, '') || '/';

  if (route === '/api/config') {
    try {
      if (req.method === 'GET') return send(res, 200, await store.getConfig());

      if (!authorized(req)) return send(res, 401, { error: 'Wrong password' });

      if (req.method === 'POST') {
        let incoming;
        try { incoming = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Could not save that' }); }
        return send(res, 200, await store.saveConfig(incoming));
      }
      if (req.method === 'DELETE') return send(res, 200, await store.resetConfig());
      return send(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: 'Something went wrong' });
    }
  }

  if (route === '/api/meta') return send(res, 200, { passwordRequired: !!PASSWORD });
  if (route === '/api/defaults') return send(res, 200, store.DEFAULTS);

  if (route === '/') return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
  if (route === '/modify') return serveFile(res, path.join(PUBLIC_DIR, 'modify.html'));

  const file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  serveFile(res, file);
});

server.listen(PORT, () => {
  console.log(`🎂 Birthday surprise running at http://localhost:${PORT}`);
  console.log(`✏️  Edit the text at        http://localhost:${PORT}/modify`);
  if (!PASSWORD) console.log('   (Tip: set MODIFY_PASSWORD to stop others from editing.)');
});
