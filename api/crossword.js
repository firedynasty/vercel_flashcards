// Crossword Reveal (crossword_reveal.html) — one function for all three
// Dropbox-backed parts, to stay under the Hobby plan's 12-function limit:
//   GET /api/crossword?part=link   → { url }  (DROPBOX_CROSSWORD_LINK_URL)
//   GET /api/crossword?part=image  → solution image  (DROPBOX_CROSSWORD_SOLUTION)
//   GET /api/crossword?part=pdf    → puzzle PDF  (DROPBOX_CROSSWORD_PDF)

const PARTS = {
  link:  { env: 'DROPBOX_CROSSWORD_LINK_URL' },
  image: { env: 'DROPBOX_CROSSWORD_SOLUTION', label: 'image' },
  pdf:   { env: 'DROPBOX_CROSSWORD_PDF', label: 'PDF' },
};

export default async function handler(req, res) {
  const partName = req.query.part;
  const part = PARTS[partName];
  if (partName === 'link') res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }
  if (!part) {
    return res.status(400).json({ error: 'part must be link, image or pdf' });
  }

  const url = process.env[part.env] || '';
  if (!url) {
    return res.status(404).json({ error: part.env + ' not configured' });
  }
  if (partName === 'link') {
    return res.status(200).json({ url });
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ error: 'Failed to fetch ' + part.label + ' from Dropbox' });
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (partName === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="crossword.pdf"');
    } else {
      res.setHeader('Content-Type', resp.headers.get('content-type') || 'image/png');
    }
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch ' + part.label + ': ' + e.message });
  }
}
