export default async function handler(req, res) {
  const lang = (req.query.lang || '').toLowerCase();
  let url = req.query.url;
  if (!url) {
    if (lang === 'spanish') {
      url = process.env.DROPBOX_SHEETS_SPANISH_URL;
    } else if (lang === 'chinese') {
      url = process.env.DROPBOX_SHEETS_CHINESE_URL;
    }
    // Fallback to the original env var for backward compat
    if (!url) url = process.env.DROPBOX_SHEETS_URL;
  }
  if (!url) {
    return res.status(400).json({ error: 'Missing ?url= parameter or DROPBOX_SHEETS_*_URL env var' });
  }

  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream error ' + response.status });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
