// Vercel Serverless Function — CSV uploads by deck
// anki_manager.html "Upload" posts a CSV with its full deck name here; it's
// stored in the Supabase table anki_decks (deck is the id, so uploading the
// same deck replaces it). On the Mac, `anki_working_directory.py --download`
// writes each deck to anki_working_directory/<deck path>.csv and syncs Anki.
//
// Set in Vercel dashboard → Settings → Environment Variables:
//   SUPABASE_URL, SUPABASE_KEY  (same as api/supabase.js)
//   ANKI_INBOX_TOKEN            any long random string; the page asks for it once
//
// Endpoints (header x-inbox-token required):
//   POST /api/anki-inbox  { deck, csv }  → { deck, updated_at }
//   GET  /api/anki-inbox                 → every uploaded deck with row count and updated_at

import { timingSafeEqual } from 'node:crypto';

const MAX_CSV_BYTES = 1024 * 1024;

function tokenOk(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  const token = process.env.ANKI_INBOX_TOKEN;
  if (!url || !key || !token) {
    return res.status(500).json({ error: 'SUPABASE_URL, SUPABASE_KEY and ANKI_INBOX_TOKEN must be set on the server.' });
  }
  if (!tokenOk(req.headers['x-inbox-token'], token)) {
    return res.status(401).json({ error: 'Wrong inbox token' });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    if (req.method === 'GET') {
      const r = await fetch(
        `${url}/rest/v1/anki_decks?select=deck,rows,updated_at&order=updated_at.desc`,
        { headers }
      );
      if (!r.ok) return res.status(502).json({ error: 'Supabase error ' + r.status + ': ' + (await r.text()) });
      return res.status(200).json(await r.json());
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const deck = String(body.deck || '').trim().replace(/\s*::\s*/g, '::');
      const csv = String(body.csv || '');
      if (!deck) return res.status(400).json({ error: 'deck is required' });
      if (!csv.trim()) return res.status(400).json({ error: 'csv is empty' });
      if (Buffer.byteLength(csv) > MAX_CSV_BYTES) return res.status(413).json({ error: 'csv is over 1 MB' });

      const rows = csv.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).length;  // incl. any header
      // Upsert on deck: a re-upload replaces that deck's CSV.
      const r = await fetch(`${url}/rest/v1/anki_decks?on_conflict=deck`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ deck, csv, rows, updated_at: new Date().toISOString() }),
      });
      if (!r.ok) return res.status(502).json({ error: 'Supabase error ' + r.status + ': ' + (await r.text()) });
      const [row] = await r.json();
      return res.status(200).json({ deck: row.deck, updated_at: row.updated_at });
    }

    return res.status(405).json({ error: 'Use GET or POST' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
