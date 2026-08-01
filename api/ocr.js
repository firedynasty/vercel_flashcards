export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accessCode, imageBase64 } = req.body;

  if (!accessCode) {
    return res.status(400).json({ error: 'Access code required' });
  }

  const validAccessCode = process.env.ACCESS_CODE;
  if (!validAccessCode || accessCode !== validAccessCode) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,' + imageBase64 },
            },
            {
              type: 'text',
              text: 'This is an image of handwritten notes with a stylus on a canvas. Transcribe all the text. Where handwriting is ambiguous, use context to infer the most likely word. Preserve line breaks. Output only the transcribed text, nothing else.',
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: errData.error?.message || 'OpenAI request failed' });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const text = raw.split(/\s+/).join(' ').trim();
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'OCR request failed: ' + err.message });
  }
}
