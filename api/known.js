// Vercel Serverless Function — Supabase `known_items` table proxy ("mark as known")
// Keeps CHESS_SUPABASE_URL and CHESS_SUPABASE_SERVICE_ROLE_KEY server-side
// (falls back to SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). service_role is
// required because RLS on `known_items` has no anon/authenticated policies — same
// pattern as vercel_fen_saver's api/puzzles.js (same Supabase project).
//
// Set in Vercel dashboard -> Settings -> Environment Variables:
//   CHESS_SUPABASE_URL = https://xxxx.supabase.co
//   CHESS_SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
//   ACCESS_CODE = (already set; same check as api/tutor.js)
//
// Table (run once in the Supabase SQL editor):
//   create table known_items (
//     source   text not null,   -- Dropbox folder path (or a sheet/tab name for text cards)
//     item     text not null,   -- Dropbox file id (or the card's front text)
//     label    text,            -- filename, so rows are readable
//     known_at timestamptz not null default now(),
//     primary key (source, item)
//   );
//   alter table known_items enable row level security;  -- no policies: only the service key can touch it
//
// Every request must send the access code in an `x-access-code` header.
//
// Endpoints:
//   GET  /api/known?source=/images/foo&days=5   -> [{ item, label, known_at }] marked within the last N days (default 5)
//   POST /api/known { action: "mark",   source, item, label }   (upsert; re-marking resets the date)
//   POST /api/known { action: "unmark", source, item }
//   POST /api/known { action: "prune", dryRun }    -> removes rows older than the window (all folders), like
//                                                    vercel_fen_saver's sync: dryRun lists what would go first.
//                                                    Expired rows are already ignored by GET, so prune is only housekeeping.

const DEFAULT_DAYS = 5;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-access-code');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const validAccessCode = process.env.ACCESS_CODE;
  const accessCode = req.headers['x-access-code'];
  if (!accessCode) return res.status(400).json({ error: 'Access code required' });
  if (!validAccessCode || accessCode !== validAccessCode) return res.status(401).json({ error: 'Invalid access code' });

  const url = process.env.CHESS_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.CHESS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase env vars not set on server (need CHESS_SUPABASE_URL and CHESS_SUPABASE_SERVICE_ROLE_KEY).' });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const clean = (v, max) => (typeof v === 'string' && v.length > 0 && v.length <= max) ? v : null;

  try {
    if (req.method === 'GET') {
      const source = clean(req.query.source, 1000);
      if (!source) return res.status(400).json({ error: 'source required' });
      const days = Math.min(Math.max(parseInt(req.query.days, 10) || DEFAULT_DAYS, 1), 365);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const params = new URLSearchParams({
        select: 'item,label,known_at',
        source: `eq.${source}`,
        known_at: `gte.${cutoff}`,
        limit: '5000',
      });
      const r = await fetch(`${url}/rest/v1/known_items?${params}`, { headers });
      const rows = await r.json();
      return res.status(r.ok ? 200 : r.status).json(rows);
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (action === 'prune') {
        const cutoff = new Date(Date.now() - DEFAULT_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const params = new URLSearchParams({ known_at: `lt.${cutoff}` });
        if (req.body.dryRun) {
          params.set('select', 'source,item,label,known_at'); params.set('order', 'known_at.asc'); params.set('limit', '5000');
          const r = await fetch(`${url}/rest/v1/known_items?${params}`, { headers });
          const rows = await r.json();
          if (!r.ok) return res.status(r.status).json(rows);
          return res.status(200).json({ dryRun: true, count: rows.length, rows: rows.slice(0, 50) });
        }
        params.set('select', 'item');
        const r = await fetch(`${url}/rest/v1/known_items?${params}`, { method: 'DELETE', headers: { ...headers, Prefer: 'return=representation' } });
        const rows = await r.json().catch(() => []);
        if (!r.ok) return res.status(r.status).json(rows);
        return res.status(200).json({ dryRun: false, deleted: rows.length });
      }

      const source = clean(req.body && req.body.source, 1000);
      const item = clean(req.body && req.body.item, 1000);
      if (!source || !item) return res.status(400).json({ error: 'source and item required' });

      if (action === 'mark') {
        const label = clean(req.body.label, 500);
        const r = await fetch(`${url}/rest/v1/known_items?on_conflict=source,item`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ source, item, label, known_at: new Date().toISOString() }),
        });
        const rows = await r.json();
        return res.status(r.ok ? 200 : r.status).json(r.ok ? rows[0] : rows);
      }

      if (action === 'unmark') {
        const params = new URLSearchParams({ source: `eq.${source}`, item: `eq.${item}` });
        const r = await fetch(`${url}/rest/v1/known_items?${params}`, { method: 'DELETE', headers });
        if (!r.ok) return res.status(r.status).json(await r.json().catch(() => ({})));
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action. Use mark or unmark.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
