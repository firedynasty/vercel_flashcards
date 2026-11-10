/**
 * speech.js — client-side voices.
 *
 * Two of them, and the difference between them is the whole lip-sync
 * story:
 *
 *   serverVoice  — fetches mp3 from /api/tts and plays it through a
 *                  Web Audio graph. There IS an audio signal, so the
 *                  mouth can be measured from it.
 *   browserVoice — speechSynthesis. Free, no key, and exposes no audio
 *                  whatsoever, so there is nothing to measure.
 *
 * Neither knows about the head. They own audio; the caller wires a
 * driver to the head.
 *
 * PORT NOTE (vercel_flashcards): upstream talks to its own /api/speak,
 * which takes { text, voice, model, password }. This repo already has
 * /api/tts — OpenAI gpt-4o-mini-tts, { input, voice, speed, dialect },
 * mp3 back — shared with the learn-*-tts pages, so the server voice
 * posts that shape instead and no new serverless function is added.
 * Everything else in this folder is upstream, unchanged.
 */

/* ------------------------------------------------------------------ *
 *  Server voice (/api/tts)
 * ------------------------------------------------------------------ */
export function createServerVoice({ endpoint = '/api/tts' } = {}) {
  let ctx = null, analyser = null, audioEl = null, srcNode = null;
  let objectUrl = null, abortCtl = null;
  const listeners = { end: [], error: [] };

  const emit = (name, arg) => listeners[name].forEach((fn) => fn(arg));

  function ensureGraph() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioEl = new Audio();
    audioEl.crossOrigin = 'anonymous';
    srcNode = ctx.createMediaElementSource(audioEl);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    audioEl.addEventListener('ended', () => emit('end'));
    audioEl.addEventListener('error', () => {
      if (audioEl.src) emit('error', new Error('The audio could not be played.'));
    });
  }

  return {
    /** The AnalyserNode the amplitude driver reads. Null until first speak(). */
    get analyser() { return analyser; },
    /** Playback position in seconds — the clock a viseme driver would use. */
    get currentTime() { return audioEl ? audioEl.currentTime : 0; },
    on(name, fn) { listeners[name]?.push(fn); },

    async speak({ text, voice, speed, dialect, accessCode } = {}) {
      ensureGraph();
      // Browsers start the context suspended until a user gesture.
      if (ctx.state === 'suspended') await ctx.resume();

      abortCtl = new AbortController();
      let res;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          signal: abortCtl.signal,
          headers: { 'Content-Type': 'application/json' },
          // /api/tts's shape, not upstream's.
          body: JSON.stringify({ input: text, voice, speed, dialect, accessCode })
        });
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        throw new Error('Could not reach the voice endpoint. Is the server running?');
      }

      if (!res.ok) {
        let msg = `Voice endpoint returned ${res.status}.`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch { /* keep the status-only message */ }
        // The caller needs the status, not just the text: 400 and 401 are the
        // access code's, and only it knows what to do about them.
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }

      const blob = await res.blob();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      audioEl.src = objectUrl;
      await audioEl.play();
    },

    stop() {
      if (abortCtl) { abortCtl.abort(); abortCtl = null; }
      if (audioEl) { audioEl.pause(); audioEl.removeAttribute('src'); audioEl.load(); }
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    }
  };
}

/* ------------------------------------------------------------------ *
 *  Browser voice (speechSynthesis)
 * ------------------------------------------------------------------ */
export function createBrowserVoice() {
  const listeners = { end: [], error: [], boundary: [] };
  const emit = (name, arg) => listeners[name].forEach((fn) => fn(arg));

  return {
    get available() { return 'speechSynthesis' in window; },

    /** Voice list arrives asynchronously in most browsers. */
    voices() {
      if (!('speechSynthesis' in window)) return [];
      return speechSynthesis.getVoices();
    },
    onVoicesChanged(fn) {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.addEventListener('voiceschanged', fn);
    },
    on(name, fn) { listeners[name]?.push(fn); },

    async speak({ text, voiceIndex, rate = 1 } = {}) {
      if (!('speechSynthesis' in window)) {
        throw new Error('This browser has no built-in speech synthesis.');
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      const v = vs[Number(voiceIndex)];
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = Number(rate) || 1;
      // The only timing signal the API gives us: a word just started.
      u.onboundary = () => emit('boundary');
      u.onend = () => emit('end');
      u.onerror = (e) => {
        // Cancelling fires an 'error' of its own; that is not a failure.
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          emit('error', new Error('Speech synthesis failed.'));
        }
      };
      speechSynthesis.speak(u);
    },

    stop() {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
  };
}
