// Vercel Serverless Function — Supabase proxy
// Keeps FLASHCARDS_SUPABASE_URL and FLASHCARDS_SUPABASE_KEY server-side, never exposed to the browser.
//
// Set in Vercel dashboard → Settings → Environment Variables:
//   FLASHCARDS_SUPABASE_URL = https://xxxx.supabase.co
//   FLASHCARDS_SUPABASE_KEY = service_role key (bypasses RLS; server-only)
//
// Endpoints:
//   GET /api/supabase?action=decks          → list of deck names
//   GET /api/supabase?action=cards&deck=xxx → cards for exactly that deck
//   GET /api/supabase?action=cards&deck=xxx&subdecks=1
//                                           → that deck plus all its subdecks (xxx::*)
//   GET/POST /api/supabase?action=inbox     → CSV uploads by deck, see lib/anki-inbox.js

import inboxHandler from '../lib/anki-inbox.js';

export default async function handler(req, res) {
  if (req.query.action === 'inbox') return inboxHandler(req, res);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = process.env.FLASHCARDS_SUPABASE_URL;
  const key = process.env.FLASHCARDS_SUPABASE_KEY;

  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase env vars not set on server.' });
  }

  const { action, deck, subdecks } = req.query;
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
      // Quoted so deck names with commas/parens survive PostgREST's filter syntax.
      const q = JSON.stringify(deck);
      const filter = subdecks
        ? 'or=' + encodeURIComponent(`(deck.eq.${q},deck.like.${JSON.stringify(deck + '::*')})`)
        : 'deck=eq.' + encodeURIComponent(deck);
      const r = await fetch(
        `${url}/rest/v1/flashcards?${filter}&select=front,back,deck&order=deck,id&limit=1000`,
        { headers }
      );
      if (!r.ok) return res.status(502).json({ error: 'Supabase error ' + r.status + ': ' + (await r.text()) });
      const rows = await r.json();
      return res.status(200).json(rows);
    }

    return res.status(400).json({ error: 'Unknown action. Use action=decks or action=cards&deck=name' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
