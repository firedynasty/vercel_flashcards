// Vercel Serverless Function — Supabase proxy
// Keeps SUPABASE_URL and SUPABASE_KEY server-side, never exposed to the browser.
//
// Set in Vercel dashboard → Settings → Environment Variables:
//   SUPABASE_URL = https://xxxx.supabase.co
//   SUPABASE_KEY = your-anon-key
//
// Endpoints:
//   GET /api/supabase?action=decks          → list of deck names
//   GET /api/supabase?action=cards&deck=xxx → cards for a deck

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase env vars not set on server.' });
  }

  const { action, deck } = req.query;
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'decks') {
      // Try RPC first, fall back to distinct query
      let r = await fetch(`${url}/rest/v1/rpc/get_decks`, { method: 'POST', headers });
      if (!r.ok) r = await fetch(`${url}/rest/v1/flashcards?select=deck&order=deck&limit=10000`, { headers });
      const rows = await r.json();
      const decks = [...new Set(rows.map(row => row.deck).filter(Boolean))].sort();
      return res.status(200).json(decks);
    }

    if (action === 'cards') {
      if (!deck) return res.status(400).json({ error: 'deck param required' });
      const encoded = encodeURIComponent(deck);
      const r = await fetch(
        `${url}/rest/v1/flashcards?deck=eq.${encoded}&select=front,back&order=id&limit=1000`,
        { headers }
      );
      const rows = await r.json();
      return res.status(200).json(rows);
    }

    return res.status(400).json({ error: 'Unknown action. Use action=decks or action=cards&deck=name' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
