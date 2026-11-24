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

  // provider: 'auto' (default) tries Gemini -> Ollama -> OpenAI; 'gemini', 'ollama'
  // or 'openai' use just that one. Ollama is only used when OLLAMA_URL is set
  // (the local server, ocr_server.mjs, sets it); on Vercel it is skipped.
  const { accessCode, imageBase64, chinese, geminiModel } = req.body;
  const provider = ['gemini', 'ollama', 'openai'].includes(req.body.provider) ? req.body.provider : 'auto';

  if (!accessCode) {
    return res.status(400).json({ error: 'Access code required' });
  }

  const validAccessCode = process.env.ACCESS_CODE;
  if (!validAccessCode || accessCode !== validAccessCode) {
    return res.status(401).json({ error: 'Invalid access code' });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = (process.env.OLLAMA_URL || '').replace(/\/$/, '');

  const prompt = chinese
    ? 'This is an image of handwritten Chinese notes written with a stylus on a canvas. Transcribe all the Chinese characters exactly. If a character is ambiguous, infer the most likely character from context. Preserve line breaks. Output only the transcribed text, nothing else.'
    : 'This is an image of handwritten notes written with a stylus on a canvas. Transcribe all the text. If a transcribed word is not a real English word, correct it to the closest real word that fits the context — for example "decribe" should become "describe", "specifility" should become "specificity". Preserve line breaks. Output only the transcribed text, nothing else.';
  const tidy = (raw) => String(raw || '').split(/\s+/).join(' ').trim();

  async function errMsg(label, response) {
    const d = await response.json().catch(() => ({}));
    return label + ': ' + (d.error?.message || d.error || ('HTTP ' + response.status));
  }

  // Each step returns text or throws an Error whose message is shown to the user.
  const steps = {
    async gemini() {
      if (!geminiKey) throw new Error('Gemini: GEMINI_API_KEY not configured');
      const ALLOWED = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
      const model = ALLOWED.includes(geminiModel) ? geminiModel : (process.env.OCR_MODEL || 'gemini-3.5-flash-lite');
      const r = await fetch(
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
      if (!r.ok) throw new Error(await errMsg('Gemini', r));
      const data = await r.json();
      return tidy((data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''));
    },

    async ollama() {
      if (!ollamaUrl) throw new Error('Ollama: not available here (only via the local server, npm run ocr)');
      const t = await fetch(ollamaUrl + '/api/tags', { signal: AbortSignal.timeout(3000) })
        .catch(() => { throw new Error('Ollama: Mac Studio not reachable at ' + ollamaUrl); });
      if (!t.ok) throw new Error('Ollama: tags HTTP ' + t.status);
      const have = ((await t.json()).models || []).map(m => m.name);
      const wanted = process.env.OLLAMA_MODEL ? [process.env.OLLAMA_MODEL] : ['gemma4:26b', 'gemma3:27b'];
      const model = wanted.find(w => have.includes(w) || have.includes(w + ':latest'));
      if (!model) throw new Error('Ollama: none of ' + wanted.join(', ') + ' installed on the Studio');
      const r = await fetch(ollamaUrl + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({ model, stream: false, think: false, keep_alive: '30m', messages: [{ role: 'user', content: prompt, images: [imageBase64] }] }),
      });
      if (!r.ok) throw new Error('Ollama (' + model + '): ' + (await r.text()).slice(0, 200));
      return tidy((await r.json()).message?.content);
    },

    async openai() {
      if (!openaiKey) throw new Error('OpenAI: OPENAI_API_KEY not configured');
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 4096,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: 'data:image/png;base64,' + imageBase64 } },
            { type: 'text', text: prompt },
          ] }],
        }),
      });
      if (!r.ok) throw new Error(await errMsg('OpenAI', r));
      return tidy((await r.json()).choices?.[0]?.message?.content);
    },
  };

  const order = provider === 'auto'
    ? ['gemini', ...(ollamaUrl ? ['ollama'] : []), 'openai'].filter(n => n !== 'gemini' || geminiKey)
    : [provider];

  const errors = [];
  for (const name of order) {
    try {
      const text = await steps[name]();
      return res.status(200).json({ text, provider: name });
    } catch (e) {
      errors.push(e.message || String(e));
    }
  }
  return res.status(502).json({ error: errors.join(' → ') });
}
