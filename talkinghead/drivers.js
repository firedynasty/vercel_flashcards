/**
 * drivers.js — strategies for deciding where the mouth should be.
 *
 * A driver is just `(dt, now) => ({ open, wide, level? })`, called once
 * per frame by the head. Everything about lip sync lives behind this
 * one function, so adding a better strategy never touches geometry.
 *
 *   open: 0 shut .. 1 wide open
 *   wide: 0 rounded "oo" .. 1 spread "ee"
 *   level: optional 0..1 for a VU meter; defaults to open * 0.25
 */

/* ------------------------------------------------------------------ *
 *  Amplitude driver — real audio, no text
 *
 *  Reads the playing waveform: RMS opens the jaw, spectral centroid
 *  rounds or spreads the lips. Honest about what it is: this tracks
 *  LOUDNESS, not phonemes. It will open the mouth on "m", "b" and "p",
 *  which are loud sounds your lips should be closed for. Convincing in
 *  motion, wrong if you freeze on a bilabial.
 * ------------------------------------------------------------------ */
export function createAmplitudeDriver(analyser, opts = {}) {
  const {
    floor = 0.014,    // RMS below this counts as silence
    scale = 6.4,      // RMS -> open
    briLow = 6,       // centroid bin mapped to fully rounded
    briHigh = 32      // centroid bin mapped to fully spread
  } = opts;

  const timeBuf = new Uint8Array(analyser.fftSize);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  return function amplitudeDriver() {
    analyser.getByteTimeDomainData(timeBuf);
    let sum = 0;
    for (let i = 0; i < timeBuf.length; i++) {
      const v = (timeBuf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeBuf.length);

    analyser.getByteFrequencyData(freqBuf);
    let num = 0, den = 0;
    const n = Math.min(freqBuf.length, 160);
    for (let j = 1; j < n; j++) { num += j * freqBuf[j]; den += freqBuf[j]; }
    const centroid = den > 0 ? num / den : 0;

    return {
      open: Math.max(0, (rms - floor) * scale),
      wide: (centroid - briLow) / (briHigh - briLow),
      level: rms
    };
  };
}

/* ------------------------------------------------------------------ *
 *  Rhythm driver — no audio at all
 *
 *  The Web Speech API never exposes its audio, so when the browser
 *  voice is speaking there is nothing to measure. This flaps on a
 *  speech-shaped random rhythm: right duration, right cadence, no
 *  relationship whatsoever to the words. It is a placeholder, and it
 *  looks like one if you watch closely.
 * ------------------------------------------------------------------ */
export function createRhythmDriver() {
  let flap = 0, next = 0, wide = 0.5;
  const driver = function rhythmDriver(dt, now) {
    if (now > next) {
      flap = 0.18 + Math.random() * 0.72;
      wide = 0.35 + Math.random() * 0.3;
      next = now + 90 + Math.random() * 110;
    }
    return { open: flap, wide, level: flap * 0.2 };
  };
  /** Call on a word boundary to kick the mouth open in time with it. */
  driver.accent = () => { flap = 0.95; next = performance.now() + 120; };
  return driver;
}

/* ------------------------------------------------------------------ *
 *  Viseme driver — the Tier 2 slot, not yet wired to a provider
 *
 *  Takes a timeline of mouth shapes with absolute offsets and a clock
 *  that reports playback position in seconds. This is the shape that
 *  Azure Speech's VisemeReceived events arrive in, and the shape a
 *  forced aligner would produce. Nothing here needs the audio itself,
 *  only its clock — so sync is exact rather than inferred.
 *
 *    const timeline = [{ t: 0.00, open: 0,    wide: 0.5 },
 *                      { t: 0.08, open: 0.7,  wide: 0.9 },  // "ee"
 *                      { t: 0.21, open: 0,    wide: 0.4 }]; // "m" — shut
 *
 *    head.setDriver(createVisemeDriver(timeline, () => audioEl.currentTime));
 *
 *  Bilabials get open: 0, which is exactly the thing the amplitude
 *  driver cannot do.
 * ------------------------------------------------------------------ */
export function createVisemeDriver(timeline, clock) {
  const frames = [...timeline].sort((a, b) => a.t - b.t);
  let i = 0;
  return function visemeDriver() {
    const t = clock();
    if (!frames.length) return { open: 0, wide: 0.5 };
    if (t < frames[0].t) return { open: 0, wide: 0.5 };
    // Timeline is monotonic, so walk forward from where we were.
    if (t < (frames[i]?.t ?? 0)) i = 0;
    while (i < frames.length - 1 && frames[i + 1].t <= t) i++;
    const a = frames[i], b = frames[i + 1];
    if (!b) return { open: a.open, wide: a.wide };
    const span = b.t - a.t;
    const u = span > 0 ? (t - a.t) / span : 0;
    return {
      open: a.open + (b.open - a.open) * u,
      wide: a.wide + (b.wide - a.wide) * u
    };
  };
}

/**
 * Azure Speech viseme IDs (0-21) mapped onto this head's two numbers.
 * Unused until a viseme provider is wired up, but this is the table
 * that does the work, and it is the whole reason Tier 2 is small.
 * Reference: Microsoft's "Get facial position with viseme".
 */
export const AZURE_VISEMES = {
  0:  { open: 0.00, wide: 0.50 },  // silence
  1:  { open: 0.55, wide: 0.85 },  // æ ə ʌ
  2:  { open: 0.80, wide: 0.60 },  // ɑ
  3:  { open: 0.60, wide: 0.20 },  // ɔ
  4:  { open: 0.45, wide: 0.80 },  // ɛ ʊ
  5:  { open: 0.35, wide: 0.55 },  // ɝ
  6:  { open: 0.25, wide: 0.95 },  // j i ɪ
  7:  { open: 0.20, wide: 0.05 },  // w u
  8:  { open: 0.45, wide: 0.15 },  // o
  9:  { open: 0.65, wide: 0.30 },  // aʊ
  10: { open: 0.55, wide: 0.25 },  // ɔɪ
  11: { open: 0.70, wide: 0.70 },  // aɪ
  12: { open: 0.30, wide: 0.60 },  // h
  13: { open: 0.25, wide: 0.30 },  // ɹ
  14: { open: 0.30, wide: 0.70 },  // l
  15: { open: 0.15, wide: 0.80 },  // s z
  16: { open: 0.20, wide: 0.30 },  // ʃ tʃ dʒ ʒ
  17: { open: 0.20, wide: 0.70 },  // ð
  18: { open: 0.15, wide: 0.65 },  // f v
  19: { open: 0.25, wide: 0.70 },  // d t n θ
  20: { open: 0.30, wide: 0.60 },  // k g ŋ
  21: { open: 0.00, wide: 0.45 }   // p b m  <- lips SHUT
};
