/**
 * app.js — wiring only.
 *
 * Head (head.js) + voices (speech.js) + mouth strategy (drivers.js).
 * This file owns the DOM and nothing else, so none of the other three
 * modules has to care that a UI exists.
 *
 * PORT NOTE (vercel_flashcards): upstream asks /api/config what the
 * deployment can do. This repo has no such route and Hobby caps the
 * function count, so the voice list is a constant here and the only
 * question asked of the server is whether /api/tts answers at all.
 * The model picker is gone (/api/tts pins gpt-4o-mini-tts); speed and
 * the Cantonese dialect flag, which that endpoint does take, replace it.
 */

import { createHead } from './head.js';
import { createServerVoice, createBrowserVoice } from './speech.js';
import { createAmplitudeDriver, createRhythmDriver } from './drivers.js';

const $ = (id) => document.getElementById(id);
const ui = {
  wrap: $('canvasWrap'), meter: $('meterFill'), status: $('status'), err: $('err'),
  text: $('text'), count: $('count'), speak: $('speak'), paste: $('paste'),
  stop: $('stop'), reset: $('reset'),
  voice: $('voice'), speed: $('speed'), dialect: $('dialect'),
  sysVoice: $('sysVoice'), rate: $('rate'),
  mood: $('mood'), gain: $('gain'), modeNote: $('modeNote'),
  serverFields: $('serverFields'), browserFields: $('browserFields'),
  modeServer: $('modeServer'), modeBrowser: $('modeBrowser'),
  gate: $('gate'), code: $('code'), unlock: $('unlock'), gateErr: $('gateErr')
};

/* The voices /api/tts accepts. gpt-4o-mini-tts, so the newer expressive
   ones are available too; the learn-*-tts pages only offer the first six. */
const VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer',
                'ash', 'ballad', 'coral', 'sage', 'verse'];
/* Voice, expression and mouth drive are fixed; their selects are in the page
   but hidden, so these are what the head always uses. Unhide a control in
   talkinghead.html and it takes over again with no change here. */
const DEFAULT_VOICE = 'onyx';

const head = createHead({ mount: ui.wrap });
const serverVoice = createServerVoice({ endpoint: '/api/tts' });
const browserVoice = createBrowserVoice();
const rhythmDriver = createRhythmDriver();

let mode = 'server';
let speaking = false;
let unlocked = false;
/* Client-side only: /api/tts has no server-side cap, so this is a courtesy
   to the OpenAI bill, not a guard. A real cap belongs in api/tts.js, which
   the learn-*-tts pages share. */
let maxChars = 2000;
let serverAvailable = false;

/* ------------------------------------------------------------------ *
 *  Small UI helpers
 * ------------------------------------------------------------------ */
const setStatus = (s) => { ui.status.textContent = s; };
const setError = (s) => { ui.err.textContent = s || ''; };
/** Only the server voice costs money, so only the server voice needs the code.
    The browser voice is free and stays usable without one. */
function locked() {
  return serverAvailable && mode === 'server' && !unlocked;
}
function setBusy(b) {
  speaking = b;
  head.setSpeaking(b);
  // `|| locked()` matters on the way back out of busy: finishing a sentence
  // must not re-enable the buttons the gate is holding shut.
  ui.speak.disabled = b || locked();
  ui.paste.disabled = b || locked();
  ui.stop.disabled = !b;
}
/** Single place that decides whether the code box is up and the buttons work. */
function refreshLock(message) {
  const needed = locked();
  ui.gate.hidden = !needed;
  if (needed) ui.code.value = readCode();
  ui.gateErr.textContent = needed ? (message || '') : '';
  setBusy(speaking);
  if (!speaking) setStatus(needed ? 'Access code needed' : 'Ready');
}
function updateCount() {
  const n = ui.text.value.length;
  const over = mode === 'server' && n > maxChars;
  ui.count.textContent = over
    ? `${n.toLocaleString()} characters — over the ${maxChars.toLocaleString()} limit`
    : `${n.toLocaleString()} characters`;
  ui.count.classList.toggle('over', over);
}
ui.text.addEventListener('input', updateCount);

function finish(label) {
  setBusy(false);
  head.setDriver(null);
  setStatus(label);
}

/* ------------------------------------------------------------------ *
 *  Mode
 * ------------------------------------------------------------------ */
const NOTES = {
  server: 'OpenAI voice via /api/tts, the same endpoint the learn-*-tts pages use, so it ' +
          'spends real credit. The jaw is measured from the returned waveform, so it follows ' +
          'the voice closely — but it tracks loudness, not phonemes, so the lips do not ' +
          'close on "m", "b" or "p".',
  browser: 'Free, uses the voice built into your browser. The browser does not expose that ' +
           'audio, so the jaw moves on a speech-shaped rhythm instead of tracking the sound.',
  noServer: 'No /api/tts reachable — opened as a static file, or the route is missing. ' +
            'Using the browser voice, whose jaw motion is a rhythm, not real sync.'
};

function setMode(m) {
  mode = m;
  ui.modeServer.setAttribute('aria-pressed', String(m === 'server'));
  ui.modeBrowser.setAttribute('aria-pressed', String(m === 'browser'));
  ui.serverFields.hidden = m !== 'server';
  ui.browserFields.hidden = m !== 'browser';
  ui.modeNote.textContent = serverAvailable ? NOTES[m] : NOTES.noServer;
  updateCount();
  refreshLock();        // the code box follows the mode: free voice, no code
}
ui.modeServer.addEventListener('click', () => setMode('server'));
ui.modeBrowser.addEventListener('click', () => setMode('browser'));

/* ------------------------------------------------------------------ *
 *  Is there a server voice here at all?
 * ------------------------------------------------------------------ *
 *  OPTIONS costs nothing and spends no OpenAI credit — api/tts.js
 *  answers it before it looks at the key. It proves the function is
 *  wired, not that OPENAI_API_KEY is set; a missing key surfaces as the
 *  endpoint's own 500 on the first Speak, which is where it belongs.
 *  The catch-all rewrite in vercel.json serves flashcards.html for
 *  anything unmatched, so an HTML answer here means "no such route".
 */
async function init() {
  // No localStorage for the voice: the picker is hidden, so a value remembered
  // from an earlier visit would silently outrank DEFAULT_VOICE with no way to
  // see or change it.
  fillSelect(ui.voice, VOICES, DEFAULT_VOICE);

  try {
    const res = await fetch('/api/tts', { method: 'OPTIONS' });
    const type = res.headers.get('content-type') || '';
    serverAvailable = res.ok && !type.includes('text/html');
  } catch {
    serverAvailable = false;
  }

  if (!serverAvailable) {
    ui.modeServer.disabled = true;
    setMode('browser');
    // Nothing reachable to spend money with, so there is nothing to ask for.
    openGate('');
    return;
  }
  setMode('server');

  const saved = readCode();
  if (saved) openGate(saved); else closeGate('');
}

/* ------------------------------------------------------------------ *
 *  The access code
 * ------------------------------------------------------------------ *
 *  /api/tts checks it against ACCESS_CODE server-side and will not
 *  spend the OpenAI key without it, so this box is how the code gets
 *  there, not a lock of its own: the enforcement is in the endpoint.
 *  There is deliberately no check on entry — the code rides along with
 *  the first real request, and a 401 from it is what sends the box
 *  back up. That is one round trip, not two, and it can never disagree
 *  with the thing doing the spending.
 *
 *  Same code and same localStorage key as the tutor, OCR and
 *  learn-*-tts pages, so entering it anywhere unlocks it here.
 */
const CODE_KEY = 'ocr-access-code';           // shared with tutor.html, imageNotes.html, …

function readCode() {
  try { return (localStorage.getItem(CODE_KEY) || '').trim(); } catch { return ''; }
}
function saveCode(code) {
  try { localStorage.setItem(CODE_KEY, code); } catch { /* private mode */ }
}

function forgetCode() {
  try { localStorage.removeItem(CODE_KEY); } catch { /* private mode */ }
}

function openGate(code) {
  unlocked = true;
  if (code) saveCode(code);
  refreshLock();
}
function closeGate(message) {
  unlocked = false;
  refreshLock(message);
}

ui.unlock.addEventListener('click', () => {
  const code = ui.code.value.trim();
  if (!code) { ui.gateErr.textContent = 'Enter the access code.'; return; }
  openGate(code);                             // /api/tts is the judge of it, on the first Speak
});
ui.code.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); ui.unlock.click(); }
});

function fillSelect(sel, items, selected) {
  if (!Array.isArray(items)) return;
  sel.innerHTML = '';
  for (const it of items) {
    const o = document.createElement('option');
    o.value = it; o.textContent = it;
    if (it === selected) o.selected = true;
    sel.appendChild(o);
  }
}

/* ------------------------------------------------------------------ *
 *  Browser voice list
 * ------------------------------------------------------------------ */
function loadSystemVoices() {
  const vs = browserVoice.voices();
  if (!vs.length) return;
  const prev = ui.sysVoice.value;
  ui.sysVoice.innerHTML = '';
  vs.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${v.name} (${v.lang})`;
    ui.sysVoice.appendChild(o);
  });
  if (prev) ui.sysVoice.value = prev;
  else {
    const en = vs.findIndex((v) => /^en/i.test(v.lang));
    if (en >= 0) ui.sysVoice.value = String(en);
  }
}
if (browserVoice.available) {
  loadSystemVoices();
  browserVoice.onVoicesChanged(loadSystemVoices);
}

/* ------------------------------------------------------------------ *
 *  Speaking
 * ------------------------------------------------------------------ */
serverVoice.on('end', () => finish('Done'));
serverVoice.on('error', (e) => { finish('Ready'); setError(e.message); });
browserVoice.on('end', () => finish('Done'));
browserVoice.on('error', (e) => { finish('Ready'); setError(e.message); });
browserVoice.on('boundary', () => rhythmDriver.accent());

function stopAll() {
  serverVoice.stop();
  browserVoice.stop();
  finish('Ready');
}
ui.stop.addEventListener('click', stopAll);

async function speakNow() {
  setError('');
  const text = ui.text.value.trim();
  if (!text) { setError('Type or paste some text first.'); return; }

  stopAll();
  setBusy(true);

  try {
    if (mode === 'server') {
      if (text.length > maxChars) {
        throw new Error(`Text is ${text.length} characters; this page sends at most ${maxChars} per request.`);
      }
      setStatus('Generating voice...');
      await serverVoice.speak({
        text,
        voice: ui.voice.value,
        speed: Number(ui.speed.value) || 1,
        dialect: ui.dialect.value || undefined,
        accessCode: readCode()
      });
      // The analyser only exists once the graph has been built, which
      // speak() does, so the driver is attached after the await.
      head.setDriver(createAmplitudeDriver(serverVoice.analyser));
      setStatus('Speaking');
    } else {
      head.setDriver(rhythmDriver);
      setStatus('Speaking');
      await browserVoice.speak({
        text,
        voiceIndex: ui.sysVoice.value,
        rate: ui.rate.value
      });
    }
  } catch (e) {
    if (e.name === 'AbortError') return;   // we cancelled it ourselves
    finish('Ready');
    // 401 wrong code, 400 none sent: the endpoint has just told us the stored
    // code is no good, so forget it and put the box back up. Anything else is
    // an ordinary error and the code is not to blame.
    if (e.status === 401 || e.status === 400) {
      forgetCode();
      closeGate(e.status === 401 ? 'That code was refused. Enter it again.'
                                 : 'The voice needs an access code.');
      setError('');
      return;
    }
    setError(e.message);
  }
}
ui.speak.addEventListener('click', speakNow);

/* ------------------------------------------------------------------ *
 *  Paste & Speak
 * ------------------------------------------------------------------ *
 *  One tap for the usual trip: copy something elsewhere, come here,
 *  hear it. The clipboard read has to happen inside the click, because
 *  readText() needs the user gesture, and so does starting audio.
 *
 *  It can fail for reasons that are not errors — permission refused,
 *  an iOS browser that has no readText, a page that is not on https or
 *  localhost — so the fallback puts the cursor in the box and says to
 *  paste by hand rather than reporting a failure.
 */
async function pasteAndSpeak() {
  setError('');
  let clip;
  try {
    if (!navigator.clipboard?.readText) throw new Error('no clipboard api');
    clip = await navigator.clipboard.readText();
  } catch {
    ui.text.focus();
    ui.text.select();
    setError('Could not read the clipboard — allow paste access, or long-press the box and paste, then press Speak.');
    return;
  }

  if (!clip.trim()) { setError('The clipboard is empty.'); return; }

  ui.text.value = clip.trim();
  updateCount();
  return speakNow();
}
ui.paste.addEventListener('click', pasteAndSpeak);

/* ------------------------------------------------------------------ *
 *  Expression, drive, recenter, meter
 * ------------------------------------------------------------------ */
ui.mood.addEventListener('change', () => head.setMood(ui.mood.value));
ui.gain.addEventListener('change', () => head.setGain(ui.gain.value));
ui.reset.addEventListener('click', () => head.recenter());
head.setGain(ui.gain.value);

head.onFrame = () => {
  ui.meter.style.width = `${Math.min(100, head.level * 380).toFixed(1)}%`;
};

/* ------------------------------------------------------------------ *
 *  Public API, so the head can be driven from other code
 * ------------------------------------------------------------------ */
window.talkingHead = {
  /** Speak text with whichever voice mode is selected. */
  speak(t) { if (t != null) { ui.text.value = t; updateCount(); } return speakNow(); },
  stop: stopAll,
  /** Drive the mouth yourself: open 0..1, wide 0..1 (0 = "oo", 1 = "ee"). */
  drive(open, wide) {
    head.setDriver(open == null ? null : () => ({ open, wide: wide ?? 0.5 }));
  },
  /** Swap the lip-sync strategy wholesale. See drivers.js. */
  setDriver: (fn) => head.setDriver(fn),
  setMood(name) { ui.mood.value = name; head.setMood(name); },
  head
};

updateCount();
// Dead buttons and no code box until init() has asked whether /api/tts is even
// there: locked() cannot answer yet (serverAvailable is still false, which
// means "free voice, no code needed"), and a saved code that still works
// should never flash a lock screen on the way past.
ui.speak.disabled = true;
ui.paste.disabled = true;
setStatus('Checking…');
init();
