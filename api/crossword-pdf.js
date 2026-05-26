export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  const url = process.env.DROPBOX_CROSSWORD_PDF || '';
  if (!url) {
    return res.status(404).json({ error: 'DROPBOX_CROSSWORD_PDF not configured' });
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: 'Failed to fetch PDF from Dropbox' });
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="crossword.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch PDF: ' + e.message });
  }
}
