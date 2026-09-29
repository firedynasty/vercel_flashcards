// Vercel Serverless Function — view and reorder fen-saver's Supabase `puzzles` table,
// used by supabase_fen_chess.html. Reads puzzles, changes `position`, and deletes one
// puzzle at a time (the page asks for two clicks first).
//
// The table lives in fen-saver's Supabase project, so this uses its own env vars
// (SUPABASE_URL / SUPABASE_KEY here belong to the flashcards table):
//   PUZZLES_SUPABASE_URL              = https://xxxx.supabase.co
//   PUZZLES_SUPABASE_SERVICE_ROLE_KEY = service-role key (RLS has no anon policies)
//
// Needs the position column (run once in the Supabase SQL editor):
//   alter table puzzles add column position integer;
//   update puzzles set position = id;
//
// Endpoints:
//   GET  /api/puzzles-order?action=categories
//   GET  /api/puzzles-order?action=list&category=X      -> rows in position order
//   POST /api/puzzles-order { action: "move", id, direction: "up" | "down" }
//   POST /api/puzzles-order { action: "delete", id }                -> remaining rows in the category

const COLUMNS = 'id,category,note,fen,position,created_at';
const ORDER = 'position.asc.nullslast,id.asc';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.PUZZLES_SUPABASE_URL;
  const key = process.env.PUZZLES_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: 'PUZZLES_SUPABASE_URL / PUZZLES_SUPABASE_SERVICE_ROLE_KEY not set on server.' });
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  async function sb(path, opts = {}) {
    const r = await fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    const text = await r.text();
    const body = text ? JSON.parse(text) : null;
    if (!r.ok) throw new Error((body && (body.message || body.error)) || `Supabase error ${r.status}`);
    return body;
  }
  const listCategory = (category) =>
    sb(`puzzles?${new URLSearchParams({ select: COLUMNS, category: `eq.${category}`, order: ORDER })}`);

  try {
    if (req.method === 'GET') {
      const { action, category } = req.query;
      if (action === 'categories') {
        const rows = await sb('puzzles?select=category&order=category.asc');
        return res.status(200).json([...new Set(rows.map((r) => r.category))]);
      }
      if (action === 'list') {
        if (!category) return res.status(400).json({ error: 'category required' });
        return res.status(200).json(await listCategory(category));
      }
      return res.status(400).json({ error: 'Use action=categories or action=list&category=X' });
    }

    if (req.method === 'POST') {
      const { action, id, direction } = req.body || {};
      if (action === 'delete') {
        if (!/^\d+$/.test(String(id))) return res.status(400).json({ error: 'A numeric id is required' });
        const deleted = await sb(`puzzles?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
        if (!deleted.length) return res.status(404).json({ error: 'Puzzle not found' });
        return res.status(200).json(await listCategory(deleted[0].category));
      }
      if (action !== 'move' || !['up', 'down'].includes(direction) || !/^\d+$/.test(String(id))) {
        return res.status(400).json({ error: 'Send { action: "move", id, direction: "up" | "down" }' });
      }
      const [puzzle] = await sb(`puzzles?select=category&id=eq.${id}`);
      if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

      // Swap with the neighbour, then renumber the category 1..n. Renumbering also
      // fixes blank or duplicate positions (e.g. puzzles saved before the column existed).
      const rows = await listCategory(puzzle.category);
      const i = rows.findIndex((r) => r.id === Number(id));
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < rows.length) [rows[i], rows[j]] = [rows[j], rows[i]];
      const changed = rows.map((r, n) => ({ ...r, newPos: n + 1 })).filter((r) => r.position !== r.newPos);
      for (const r of changed) {
        await sb(`puzzles?id=eq.${r.id}`, { method: 'PATCH', body: JSON.stringify({ position: r.newPos }) });
      }
      return res.status(200).json(rows.map((r, n) => ({ ...r, position: n + 1 })));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
