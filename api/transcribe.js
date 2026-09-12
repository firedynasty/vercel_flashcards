// Vercel Serverless Function — OpenAI transcription proxy
// Keeps OPENAI_API_KEY server-side, never exposed to the browser.
// Reuses the same OPENAI_API_KEY env var already configured for api/tts.js and api/ocr.js.
//
// Contract: specs/006-gdoc-voice-notes/contracts/transcribe-api.md
//
// POST /api/transcribe  { audioBase64, mimeType }  →  { text }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });

  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) return res.status(400).json({ error: 'Missing audioBase64' });

  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    const ext = (mimeType || 'audio/webm').split('/')[1].split(';')[0];
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), 'recording.' + ext);
    form.append('model', 'gpt-4o-mini-transcribe');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text });
  } catch (err) {
    return res.status(500).json({ error: 'Transcription failed: ' + err.message });
  }
}
