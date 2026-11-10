# CLAUDE.md — `talkinghead/`

A 3D head in the browser that speaks pasted text; the jaw is driven by the
audio. Page is `../talkinghead.html`, served flat from the repo root like
every other page here. Ported from `~/onedrive/Documents/technical/talkinghead/web`
(upstream keeps the fuller docs, including the Azure viseme plan).

## The four contracts — do not break these casually

Each file owns exactly one thing. Most bad changes here are a change made in
the wrong file.

| File | Owns | Must NOT know about |
|---|---|---|
| `head.js` | geometry, animation, rendering | audio, network, the DOM outside its mount |
| `drivers.js` | where the mouth should be, per frame | three.js, the DOM, how audio arrives |
| `speech.js` | getting audio to play | the head, the mouth, three.js |
| `app.js` | the DOM and wiring | nothing else imports it |

### The driver contract

Everything about lip sync is behind one function:

```js
(dt, now) => ({ open, wide, level? })
//  open: 0 shut .. 1 wide open
//  wide: 0 rounded "oo" .. 1 spread "ee"
```

The head owns smoothing (fast open, slow close) and gain. A driver returns the
**raw** target and nothing else. To improve lip sync, write a new driver — do
not touch `head.js`.

## What this port changed, and why

`drivers.js` is upstream byte-for-byte. `head.js` differs by three lines (see
**The face** below). Two files differ by design, both marked `PORT NOTE` at
the top:

- **`speech.js`** — the server voice posts `{ input, voice, speed, dialect }`
  to this repo's existing `/api/tts` (OpenAI `gpt-4o-mini-tts`, mp3 back),
  not upstream's `/api/speak`. **No new serverless function was added**: `api/`
  already holds 11 and Vercel Hobby allows 12.
- **`app.js`** — there is no `/api/config` here, so the voice list is the
  `VOICES` constant and the only question asked of the server is an `OPTIONS`
  probe of `/api/tts`. The model picker is gone (the endpoint pins the model);
  speed and the Cantonese `dialect` flag, which it does take, replace it.

## The controls

Voice, Expression and Mouth drive are fixed at **onyx / neutral / normal**.
Their `<select>`s are still in `talkinghead.html`, carrying `hidden`, so
`app.js` reads them exactly as before — unhide one and it takes over again
with no JS change. The voice deliberately does **not** persist in
`localStorage`: with the picker hidden, a value remembered from an earlier
visit would outrank `DEFAULT_VOICE` with no way to see or change it.

Speed and Dialect stay visible. Dialect offers *As written / Mandarin /
Cantonese*, and those strings go straight to `/api/tts`, which only
special-cases `cantonese`; `mandarin` is what the `learn-*-tts` pages send for
Chinese read the default way, so it behaves like *As written* unless someone
adds a branch for it in `api/tts.js`.

**Paste & Speak** reads the clipboard and speaks it in one tap. Both halves
need the user gesture — `readText()` does, and so does starting audio — so the
read happens inside the click handler, never before it. A synthetic
`.click()` has no user activation, so `AudioContext.resume()` never settles
and the page sits on "Generating voice…": test this button with a real tap,
not from the console. Refusal is not an error here (permission denied, no
`readText` on some iOS browsers, a page served over plain http): the fallback
focuses the text box and says to paste by hand.

Dropped with it: upstream's `ACCESS_PASSWORD` gate and its server-side
`MAX_CHARS`. **`maxChars` in `app.js` is client-side decoration** — `/api/tts`
has no cap of its own. A real cap belongs in `api/tts.js`, which the eleven
`learn-*-tts` pages share, so adding one is their change too, not just this
page's.

## The access code

`/api/tts` checks the code against `ACCESS_CODE` server-side and will not
spend the OpenAI key without it: **no code → 400, wrong code → 401, and in
neither case is OpenAI called.** The enforcement is in the endpoint, not in
this page. The box in the panel is only how the code gets there.

Deliberate: **nothing is validated when you type it.** `openGate()` stores the
code and enables the buttons; the code rides along with the first real request
and a 401 from `/api/tts` is what brings the box back (`speakNow()`'s catch,
which also forgets the stored code). One round trip instead of two, and the
page can never disagree with the thing doing the spending. An earlier version
pre-checked the code against `/api/known`; that is gone, and should not come
back.

- Same code and same `localStorage` key (`ocr-access-code`) as the tutor, OCR
  and `learn-*-tts` pages, so entering it anywhere unlocks it everywhere.
- **No reachable `/api/tts` means no gate at all** — opened as a static file
  there is nothing to spend, and the free browser voice would otherwise sit
  behind a check that can never pass.
- `setBusy()` ORs in `!unlocked`, so finishing a sentence cannot re-enable the
  buttons the gate is holding shut. Keep that if you touch it.

The other eleven callers (`learn-*-tts.html`) got the same contract, as a
`ttsAccessCode()` / `ttsFetch()` pair inlined above each page's
`speakOpenAI()`: read the key, prompt if missing, attach `accessCode`, and on
a 401 forget it, ask once more, retry. When there is no code to try they
return null and the page uses its own browser-voice fallback, so a caller that
never learned about the code degrades rather than breaks. The shape is lifted
from `~/Documents/technical/github/react-chess-analysis_vercel` (`api/chat.js`
plus the retry loop near `sbReportAccessCode` in `index.html`), which is worth
reading before changing any of this.

Not carried over from there: its bring-your-own-key branch. `api/chat.js` also
accepts a `userApiKey` so someone without the code can pay their own way.
Nothing here has UI for that, so it would be an unused code path; it is about
ten lines in `api/tts.js` if it is ever wanted.

## The face

`head.js` differs from upstream in three constants, all in the mouth, because
upstream's mouth sat half-way between the nose and the chin and read as
sliding off the jaw:

| Line | Upstream | Here | Why |
|---|---|---|---|
| `MT` | `2.11` | `1.97` | Polar angle of the mouth line — **the one knob that moves the mouth**. Lower value = higher on the face. Carries the jaw cut, cavity light, lips, teeth, tongue and cheek bands together, so nothing else needs touching. `1.97` puts the mouth a third of the way from nose base to chin, which is the canonical face proportion; `2.11` put it half-way. |
| `lipUpper` radius | `0.038` | `0.050` | A fuller upper lip. At the raised mouth line you look straight into the seam instead of down onto it, and the thin lip left a strip of dark cavity visible between its top edge and the skull's cut edge. |
| `lipLower` theta | `MT + 0.058` | `MT + 0.030` | Closes the resting gap, which at the new angle showed a sliver of upper teeth and read as a permanently parted mouth. Only the *lower* lip moved down-to-up for this: raising the **upper** lip instead widens that dark strip above it, because the upper lip rides the skull and the strip is the space between it and the cut. |

Changing `MT` alone is safe. Changing the lip constants is a trade between two
artifacts that pull in opposite directions — the resting seam and the dark
strip above the upper lip — so check **both** states after any edit:

```js
window.talkingHead.drive(0.9, 0.5);   // hold the mouth open
window.talkingHead.drive(null);       // back to rest
```

**Known, pre-existing, not from this port:** with the jaw open there are small
dark wedges at the mouth corners, where the cheek bands in `head.js` fail to
cover the gap the swinging jaw opens. Verified present at upstream's `MT =
2.11` too, so it is a cheek-band bug, not a lip-placement one. The fatter
upper lip shrinks it; it does not fix it.

## Verify changes

```bash
python3 talkinghead/check.py
```

Checks bracket balance, that every named import resolves to a real export, and
that every `$('id')` in `app.js` exists in `../talkinghead.html`. That last one
catches the most common real bug here. It is static — it proves nothing about
runtime behaviour.

To look at the page without `/api/tts` (it detects the missing route and falls
back to the browser voice by itself):

```bash
python3 -m http.server 8777    # from the repo root, then /talkinghead.html
```

With the endpoint live: `npx vercel dev`, needs `OPENAI_API_KEY`.

## Reusing the head on another page here

`head.js` imports only `three`, and themes itself from `--skin`, `--mouth`,
`--iris` etc. on `:root`, falling back to its own colours. It is the piece
worth lifting into `learn-chinese-tts.html` or `tutor.html`:

```html
<script type="importmap">
{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js" } }
</script>
<script type="module">
  import { createHead } from './talkinghead/head.js';
  import { createAmplitudeDriver } from './talkinghead/drivers.js';
  const head = createHead({ mount: document.getElementById('stage') });
  head.setMood('bright');       // neutral | bright | surprised | serious
  head.setGain(1.4);
  head.setDriver(createAmplitudeDriver(analyserNode));
  head.dispose();               // it holds a RAF loop
</script>
```

A host page that already plays mp3 from `/api/tts` needs its own
`AnalyserNode` to get real sync — route the `<audio>` element through a
`MediaElementSource` the way `speech.js` does, then hand the analyser to
`createAmplitudeDriver`. Without an analyser the only honest option is
`createRhythmDriver`, which is a flap, not sync.

## Things that look wrong but are not

- **`api.onFrame?.()` inside `frame()` references `api` before its `const`.**
  Fine — the first `requestAnimationFrame` callback runs after the synchronous
  body completes, so `api` is assigned by then.
- **`createAmplitudeDriver` is called *after* `await serverVoice.speak()`.**
  Required: the `AnalyserNode` does not exist until `speak()` builds the audio
  graph. Costs about one frame.
- **`AZURE_VISEMES` and `createVisemeDriver` are exported but unused.** Staged
  for real phoneme lip sync (see upstream's CLAUDE.md). Not dead code.
- **The amplitude driver cannot close the lips on `m`/`b`/`p`.** It tracks
  loudness, not phonemes, and those are loud. Convincing in motion, wrong if
  you freeze on a bilabial. Fixing it needs per-phoneme timings from the TTS
  provider (Azure's `VisemeReceived`), not cleverer code here.
- **`speech.js` buffers the whole mp3 (`res.blob()`) before playing.** Do not
  describe this as streaming; real streaming playback means MediaSource and
  chunked mp3.

## Safety rails

- Every Speak in server mode spends real OpenAI credit on the same key the
  rest of the repo uses. There is no rate limiting and no password here.
- Never put a key in client code. The whole reason the upstream `web/` folder
  exists is that its original page took a pasted key.
