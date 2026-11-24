// Local server for imageNotes: `npm run ocr`
//
// Serves the page and answers /api/ocr by running the same handler as Vercel
// (api/ocr.js): Gemini -> Ollama on the Mac Studio -> OpenAI. Because Node (not
// the browser) calls Ollama, there is no CORS / OLLAMA_ORIGINS / mixed-content
// problem, and the iPad only needs to reach THIS machine over the wifi.
//
// Keys come from .env.local (git-ignored): GEMINI_API_KEY, OPENAI_API_KEY, ACCESS_CODE
//   STUDIO_URL    default http://Stanleys-Mac-Studio.local:11434
//   OLLAMA_MODEL  force one Ollama model (default: gemma4:26b, else gemma3:27b)
//   PORT          default 8001
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8001', 10);

// Minimal .env.local loader (no dependency); real env vars win.
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch (e) { console.log('No .env.local found — set GEMINI_API_KEY / OPENAI_API_KEY / ACCESS_CODE there.'); }
process.env.OLLAMA_URL = process.env.OLLAMA_URL || process.env.STUDIO_URL || 'http://Stanleys-Mac-Studio.local:11434';
if (!process.env.ACCESS_CODE) console.log('WARNING: ACCESS_CODE is not set — /api/ocr will reject every request.');

const { default: ocrHandler } = await import('./api/ocr.js');

// Only these pages are served (never .env.local, api/, .git, ...).
const PAGES = new Set(['/imageNotes.html']);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/ocr') {
    let buf = '';
    for await (const c of req) buf += c;
    try { req.body = buf ? JSON.parse(buf) : {}; } catch { req.body = {}; }
    const shim = {
      setHeader: (k, v) => res.setHeader(k, v),
      status(code) { this.code = code; return this; },
      json(obj) { res.writeHead(this.code || 200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); },
      end() { res.writeHead(this.code || 200); res.end(); },
    };
    try { await ocrHandler(req, shim); }
    catch (e) { shim.status(500).json({ error: String(e.message || e) }); }
    return;
  }
  const p = url.pathname === '/' ? '/imageNotes.html' : url.pathname;
  if (PAGES.has(p)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(ROOT, p)));
  }
  res.writeHead(404); res.end('Not found');
}).listen(PORT, '0.0.0.0', () => {
  console.log('imageNotes OCR server on port ' + PORT);
  console.log('  This computer:  http://localhost:' + PORT);
  console.log('  iPad (same wifi): http://' + os.hostname().replace(/\.local$/, '') + '.local:' + PORT);
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log('                    or http://' + a.address + ':' + PORT);
  console.log('  Ollama (Mac Studio): ' + process.env.OLLAMA_URL);
});
