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

  const { accessCode, imageBase64, chinese } = req.body;

  if (!accessCode) {
    return res.status(400).json({ error: 'Access code required' });
  }

  const validAccessCode = process.env.ACCESS_CODE;
  if (!validAccessCode || accessCode !== validAccessCode) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  // If GEMINI_API_KEY is set, use Gemini (OCR_MODEL: gemini-3.8-flash [default]
  // or gemini-3.8-flash-lite). Otherwise fall back to OpenAI as before.
  const geminiKey = process.env.GEMINI_API_KEY;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !apiKey) {
    return res.status(500).json({ error: 'Neither GEMINI_API_KEY nor OPENAI_API_KEY configured on server' });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  const prompt = chinese
    ? 'This is an image of handwritten Chinese notes written with a stylus on a canvas. Transcribe all the Chinese characters exactly. If a character is ambiguous, infer the most likely character from context. Preserve line breaks. Output only the transcribed text, nothing else.'
    : 'This is an image of handwritten notes written with a stylus on a canvas. Transcribe all the text. If a transcribed word is not a real English word, correct it to the closest real word that fits the context — for example "decribe" should become "describe", "specifility" should become "specificity". Preserve line breaks. Output only the transcribed text, nothing else.';

  if (geminiKey) {
    try {
      const model = process.env.OCR_MODEL || 'gemini-3.8-flash';
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ inline_data: { mime_type: 'image/png', data: imageBase64 } }, { text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const raw = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        return res.status(200).json({ text: raw.split(/\s+/).join(' ').trim() });
      }
      // Rate-limited (e.g. free-tier daily cap): fall through to OpenAI if configured.
      if (!(response.status === 429 && apiKey)) {
        const errData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: errData.error?.message || 'Gemini request failed' });
      }
    } catch (err) {
      if (!apiKey) return res.status(500).json({ error: 'OCR request failed: ' + err.message });
    }
  }
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });

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
              text: chinese
                ? 'This is an image of handwritten Chinese notes written with a stylus on a canvas. Transcribe all the Chinese characters exactly. If a character is ambiguous, infer the most likely character from context. Preserve line breaks. Output only the transcribed text, nothing else.'
                : 'This is an image of handwritten notes written with a stylus on a canvas. Transcribe all the text. If a transcribed word is not a real English word, correct it to the closest real word that fits the context — for example "decribe" should become "describe", "specifility" should become "specificity". Preserve line breaks. Output only the transcribed text, nothing else.',
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
