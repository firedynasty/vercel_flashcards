export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.DROPBOX_CROSSWORD_LINK_URL || '';
  if (!url) {
    return res.status(404).json({ error: 'DROPBOX_CROSSWORD_LINK_URL not configured' });
  }
  return res.status(200).json({ url });
}
