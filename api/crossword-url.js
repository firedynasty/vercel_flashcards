export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.DROPBOX_CROSSWORD_URL || '';
  if (!url) {
    return res.status(404).json({ error: 'DROPBOX_CROSSWORD_URL not configured' });
  }
  return res.status(200).json({ url });
}
