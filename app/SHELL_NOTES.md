# NoteVault Hybrid — App Shell Notes (5 Nov 2026; updated 12 Nov)

> **UPDATE 12 Nov 2026:** the mock engine is GONE. The app now calls Firebase AI
> Logic for real — see `REAL_WIRING_NOTES.md` for what is real, what the console
> setup step is, and how it was verified (tests 23/23, build PASS). Everything
> below still describes the app's features; "mock" no longer applies.

**Status (12 Nov):** REAL ENGINE. Every AI call goes through Firebase AI Logic
(`firebase` 12.19.0, Gemini Developer API free tier). **No Firebase project is
configured yet** — with the placeholder config the page still opens from any
static server and the vault works, but every AI action fails loudly with
"Firebase is not configured" until the console setup in `REAL_WIRING_NOTES.md`
is done. No keys in the repo; config comes from `VITE_FIREBASE_*` env vars.

## Preview locally

```sh
cd ~/workspace/hackathons/buildhybridai/app
python3 -m http.server 8123
# open http://localhost:8123/ in Chrome (any modern browser works for the shell)
```

Do NOT open `index.html` with `file://` — ES modules are blocked there.
`npm install && npm run dev` (Vite) is for the real build from 9 Nov; the
shell needs no install step.

## What works tonight

1. **Vault** — notes in IndexedDB; 5 synthetic sample notes seeded on first
   run (labelled SYNTHETIC everywhere); import `.md`/`.txt` files; paste a
   note; local keyword search (title 3x, body 1x); select / preview / delete;
   restore deleted samples.
2. **Ask** — single-turn, grounded: local search first, grounded refusal
   when no note matches (no model call, no budget spent). Otherwise the
   mock answers extractively from the top 3 excerpts, with citations naming
   the note. Routing panel shows On device / Cloud + reason + fallbacks.
3. **Summarise** — 3 bullets in the structured-JSON shape (`{ bullets: [] }`),
   plus a JSON view. Same routing as Ask.
4. **Routing panel + budget meter** — every answer shows its chip; the meter
   counts cloud calls per day against a PLACEHOLDER budget of 250/day
   (UNVERIFIED — see below) and on-device calls separately.
5. **Privacy toggle** — "Keep my notes on this device" switches the engine
   to `ONLY_ON_DEVICE`: Ask/Summarise/Organise fail loudly when the
   on-device model is not ready, and Deep Dive refuses outright (chat is
   cloud-only). Nothing is sent to the cloud in this mode.
6. **Deep Dive + Organise (working UI over the mock)** — Deep Dive is a
   multi-turn chat grounded in the top-3 matching notes (or the 3 most
   recent, labelled as such), always routed Cloud; Organise prints a tag
   plan (plan only, no notes changed).
7. **On-device model button** — simulates the Nano download with progress.
   Before it is enabled, Ask falls back to Cloud (the fallback story, shown
   on screen). After it, Ask answers On device.
8. **Offline indicator** — when the browser goes offline, Deep Dive is
   disabled and Ask keeps working on-device (mock).

## The MOCK engine — what it is and is not

`src/hybrid.js` is a stand-in with the SAME function interface as the real
Firebase AI Logic wiring (see the header comment in that file):

- `createModel()` → model with `initializeDeviceModel(cb)`, `generateContent(prompt)`, `startChat()`
- `setPrivacyMode(on)`, `getMode()`, `initDeviceModel(model, onProgress)`
- `ask(model, prompt)` → `{ text, inferenceSource, route, reason, fallbackAttempts }`
- `summarise(model, note)` → `{ json: { bullets }, inferenceSource, route, reason }`
- `organise(model, notes)` → `{ json: { groups }, inferenceSource, route, reason }`
- `model.startChat().sendMessage(msg)` → `{ response: { text(), inferenceSource, route, reason } }`

Answers are EXTRACTIVE (keyword overlap over the grounded excerpts) — the
mock never generates language. Every answer is labelled MOCK in code and UI.

## Deliberately left for 9 Nov (do NOT do before the rules drop)

- **Real Firebase wiring** — replace `src/hybrid.js` internals with
  `firebase/ai` (`getAI` + `getGenerativeModel` + `InferenceMode`), fill the
  Firebase config from the console (placeholder only in the repo), set the
  cloud fallback model explicitly. `main.js`, `vault.js`, `budget.js`,
  `guards.js` do not change — they only use the functions above.
- **`inferenceSource` verification (Day 1 spike)** — the mock invents
  `inferenceSource`. Verify the real web response carries it before the
  chips claim it; if absent, fall back to mode + local availability check
  and update the research doc first.
- **Free-tier budget numbers** — the meter's 250/day is a PLACEHOLDER.
  Read the real limit from AI Studio on 9–10 Nov and update
  `PLACEHOLDER_DAILY_BUDGET` + `BUDGET_VERIFIED` in `src/budget.js`.
- **Firebase project + App Check + Hosting deploy** — user's console taps;
  the demo video is recorded from the LIVE hosted URL only.
- **Rules check** — India eligibility, solo, new-project rule, submission
  requirements, bonus challenges (see `NOV9_CHECKLIST.md`). If India is
  ineligible, STOP — do not build further.
- **Design constitution + registry, interaction inventory, QA, release
  manifest** — per the project rulebook, during the 9–30 Nov build.

## Verification done 5 Nov 2026 (shell)

- `node --check` on all six JS files: PASS.
- `package.json` valid JSON (unchanged; `firebase`/`vite`/`vitest` stay
  declared for the real build — the shell does not import them).
- Node harness (`/tmp/nv-shell-test.mjs`, kept out of the repo): fake
  IndexedDB + fake DOM — seeded 5 samples, search, Ask (cloud fallback
  before model ready → on-device after), grounded refusal, privacy-mode
  loud refusal, Summarise JSON shape, Organise groups, Deep Dive chat,
  budget counts: all PASS.
- Static server + `curl` on every referenced asset (`/`, `/src/style.css`,
  all five JS modules): all HTTP 200.
- NOT verified here (no headless Chromium in this sandbox): a real browser
  render. Verify visually on first open: 5 sample notes listed, Ask works,
  chips show, budget meter moves. If the page is blank, open DevTools →
  Console and check for module-load errors.
