# NoteVault Hybrid — Real Wiring Notes (12 Nov 2026)

Replaces the 5 Nov mock shell. The app now calls **Firebase AI Logic for real**
at runtime. This file says exactly what is real, what is honest fallback, what
is still missing, and what console step the parent/user must do.

## What is real now

- **Cloud path = real Firebase AI Logic call.** `src/hybrid.js` creates the model
  with `getGenerativeModel(ai, { mode: "prefer_on_device", inCloudParams: { model:
  "gemini-3.5-flash-lite", generationConfig: { maxOutputTokens: 1024 } } })` from the
  installed `firebase` **12.19.0** SDK (minimum required 12.5.0 for hybrid +
  `inferenceSource`). Backend is `GoogleAIBackend()` = Gemini Developer API
  (free tier). Vertex AI / Agent Platform is **never** used (needs Blaze billing).
- **On-device path = real Gemini Nano via the hybrid model**, when Chrome's Prompt
  API is present and the model is downloaded. `initializeDeviceModel()` reports
  real download progress; `deviceModelReady` flips true only after it succeeds.
- **The chip is read from the SDK.** Every answer's On device / Cloud chip comes
  from `response.inferenceSource`. Verified in the installed SDK types: the SDK
  returns lowercase snake_case `"on_device"` / `"in_cloud"` (the docs prose says
  `ON_DEVICE` / `IN_CLOUD`); the code normalises both. If the SDK ever omits the
  field, the source is **derived from routing state and the reason says so**
  ("derived from routing state" — never silently presented as SDK-reported).
- **Privacy toggle is enforced in our code, before any SDK call.** `ONLY_ON_DEVICE`
  + device model not ready → ask / summarise / organise / chat throw a loud,
  visible error ("Privacy mode is on…") and make **zero** SDK calls. Proven by
  test: the fake SDK records every call; in that path it records none. No silent
  cloud leak, by construction and by test.
- **Chat is cloud-only, honestly.** Multi-turn chat is not supported on-device
  (SDK docs), so Deep Dive uses a separate plain cloud model
  (`getGenerativeModel(ai, { model: "gemini-3.5-flash-lite" })`); the hybrid
  model's `startChat` is never called. In `ONLY_ON_DEVICE`, chat throws loudly.
- **No Firebase config → loud failure, no SDK call.** With the placeholder
  config the app boots, the vault works, and every AI action throws
  `FirebaseNotConfiguredError` ("Firebase is not configured…") before any SDK
  call. Nothing silently degrades to a fake model.
- **No secrets in the repo.** `src/firebase-config.js` ships placeholders only
  (`YOUR_API_KEY`, `YOUR_PROJECT_ID`, …). Real config comes from `VITE_FIREBASE_*`
  env vars at deploy time. A Firebase web `apiKey` is a public client identifier,
  not a secret — but even so, no real value lives in this repo.
- **App Check:** initialised in `getFirebase()` (`src/firebase-app.js`)
  **before** `getAI()` and before any model call, so every AI Logic request
  carries a token. Provider is `ReCaptchaEnterpriseProvider` with
  `isTokenAutoRefreshEnabled: true`; the site key is resolved **at call
  time** from `VITE_RECAPTCHA_ENTERPRISE_KEY`
  (`getAppCheckSiteKey()` in `src/firebase-config.js` — never hardcoded).
  Missing key → a clear console warning and the app continues without App
  Check (no crash, no blocked call); cloud calls are then rejected while
  the console enforces App Check. Console state 12 Nov: web app registered
  in App Check (reCAPTCHA Enterprise, token TTL 1h), enforcement **ON** for
  Firebase AI Logic ("Basic - Enforced", Replay Off). Proven by test (24th
  test): init is attempted before the first AI call when the key is set, and
  only warns when it is missing.

## What is honest fallback, not fake

- **No Prompt API / no Nano (most machines, incl. this sandbox):**
  `getDeviceModelAvailability()` reads `LanguageModel.availability()` when it
  exists and returns `"unavailable"` otherwise. The hybrid model then falls back
  to the cloud; the chip says **Cloud** and the reason says the device model is
  not ready / not available. Nothing pretends a Nano call happened.
- **Unparseable model JSON:** summarise/organise ask for structured JSON; if the
  model's reply is not parseable JSON, the app falls back to a **local,
  deterministic** extractive/keyword result (no second model call) and the reason
  says so ("local extractive fallback" / "local keyword fallback"). The 5 Nov
  shell's mock answers are gone — the fallback is clearly labelled local.
- **Budget meter is a placeholder.** `src/budget.js` counts calls but the daily
  budget (250) is `BUDGET_VERIFIED = false`. Read the real free-tier RPD for
  `gemini-3.5-flash-lite` from Google AI Studio at deploy time and set it then.

## What is NOT yet verified / NOT done

- **Firebase project exists and the app is deployed live**
  (https://notevault-hybrid.vercel.app/, protection OFF, notes persist) —
  but **live Ask still fails** as of 12 Nov 01:44 IST: `[400] Firebase AI
  Logic genai config not found` from
  `firebasevertexai.googleapis.com/v1beta/.../gemini-3.5-flash-lite:generateContent`.
  The console shows Gemini Developer API Enabled, Firebase AI API Enabled,
  App Check registered + enforced, and offers no "Get started" step to
  create the missing genai config. The App Check code change above is the
  remaining fix named by the browser report; whether it clears this error
  is **unverified until the Vercel env var + redeploy + live re-verify**
  (parent's next steps). If the error survives the redeploy, the next step
  is a fresh console look for the provider-setup step — do not work around
  it by switching to Vertex AI / Agent Platform.
- **Live end-to-end unverified in this sandbox** (no network-reaching Chromium,
  no Firebase project). Must be verified on the deployed site by the parent:
  1. Open the live URL in Chrome Desktop 139+ (Prompt API flag on if needed).
  2. With the privacy toggle OFF, ask a question — the chip must say **Cloud**
     and the answer must come from the model.
  3. Click "Download on-device model" — progress must move, then the chip must
     say **On device** on the next ask.
  4. Turn the privacy toggle ON with no model downloaded — the ask must fail
     loudly (visible error), not silently answer from the cloud.
- **Repo / deploy / video / submission: not done.** Parent handles those.
- **Formal Official Rules still unpublished** (12 Nov) — re-check for the country
  list and the true prize split before submitting. Prize split on the page is
  contradictory ($30,000 Grand vs $10,000 Grand + $3,000/platform).

## Console setup step (parent / user — a console tap, not automatable here)

1. Go to the [Firebase console](https://console.firebase.google.com/) → **Add
   project** → name it (e.g. `notevault-hybrid`) → **Spark (free) plan** — no
   billing, no card. If any step asks for billing, stop: that is the wrong path.
2. In the project: **Build → AI Services → AI Logic → Get started** → choose
   **Gemini Developer API** (NOT Agent Platform / Vertex AI — that needs Blaze).
3. **Register the web app** (</> icon) → copy the config object.
4. In Vercel (project settings → Environment Variables), set:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   (or paste the same values into `src/firebase-config.js` — local only, never
   commit real values).
5. **App Check (required — Firebase enforces it for AI Logic since 2 Nov
   2026, and the event needs it for submission):** Firebase console → App
   Check → register the web app with **reCAPTCHA Enterprise** → set
   `VITE_RECAPTCHA_ENTERPRISE_KEY` in Vercel env vars (the site key is a
   public client key; it ships in the bundle by design). For localhost
   testing, create a debug token instead (console → App Check → Manage
   debug tokens).
6. **Budget meter:** read the free-tier RPD for `gemini-3.5-flash-lite` from
   Google AI Studio for this project and update `BUDGET` in `src/budget.js`
   (set `BUDGET_VERIFIED = true` when done).

## Verification done 12 Nov 2026 (this sandbox)

- `node --check` on all `src/*.js` + `test/*.js` — clean.
- `npm test` — **23/23 PASS** (`test/hybrid.test.js`, vitest). Covers: mode
  flips, engine identity (`MOCK_ENGINE === false`, cloud model
  `gemini-3.5-flash-lite`), `inferenceSource` normalisation (both cases +
  fallback), loud not-configured failures with zero SDK calls (ask / summarise /
  organise / init / chat), configured ask (hybrid `generateContent` called once,
  `mode: "prefer_on_device"`, `inCloudParams.model === "gemini-3.5-flash-lite"`),
  cloud fallback (`IN_CLOUD`, `fallbackAttempts: 1`), derived source when the
  SDK omits the field, `initializeDeviceModel` progress + `deviceModelReady`,
  `ONLY_ON_DEVICE` after init (mode `only_on_device`) and without a ready model
  (loud throw, zero SDK calls), chat via the cloud model only
  (`hybrid.startChat` never called), chat refusal in privacy mode, summarise /
  organise JSON parse + local fallbacks (exactly one model call each),
  `getDeviceModelAvailability` (unavailable / available / unknown), budget
  counting (`verified === false`).
- `npm run build` — **PASS** (vite 6.4.6, 24 modules, 1.69s).
- Static serve of `dist/` — `/` **200**, title "NoteVault Hybrid — your notes,
  on-device first", all 5 assets **200** (CSS 5,210 B; JS 31,640 / 1,345 /
  41,377 / 75,205 B). (First serve attempt hit port 8124, which was already
  bound by another agent's TapeOut Gate server — re-checked on port 8132.)
- `grep -rn MOCK src/ index.html test/` — only historical comments ("Replaces
  the 5 Nov MOCK engine", `MOCK_ENGINE = false` flag) and the test asserting
  `MOCK_ENGINE` is false. No mock engine code remains.

- **Known live quirk (browser observation, 12 Nov):** repeated Asks without
  a page reload sometimes fail with an IndexedDB error ("Failed to execute
  'transaction' on 'IDBDatabase': The database connection is closing"); a
  fresh reload before Ask avoids it. Not yet root-caused; treat as a
  verification-time workaround, not a fix.

## Files changed 12 Nov (real wiring)

- `src/firebase-config.js` (new) — placeholders + env override + `isFirebaseConfigured()`
- `src/firebase-app.js` (new) — lazy `getFirebase()`, dynamic imports, App Check gating
- `src/hybrid.js` (rewritten, same exported interface) — real engine
- `src/main.js` (edited) — mock labels removed, verbatim error display
- `index.html`, `src/style.css`, `src/budget.js` — banner/label renames + cloud-model note
- `package.json` — `firebase ^12.0.0` → `^12.5.0`; `firebase` 12.19.0 installed
- `test/hybrid.test.js` (new) — 23 tests (see above)
- `src/firebase-config.js` (12 Nov, App Check wiring) — `APP_CHECK_SITE_KEY`
  hardcoded `""` replaced by `getAppCheckSiteKey()`, which reads
  `VITE_RECAPTCHA_ENTERPRISE_KEY` at call time (never hardcoded)
- `src/firebase-app.js` (12 Nov, App Check wiring) — `getFirebase()` now
  resolves the key at call time and initialises App Check
  (`ReCaptchaEnterpriseProvider`, `isTokenAutoRefreshEnabled: true`)
  before `getAI()` / any model call; missing key warns and continues
- `test/hybrid.test.js` (12 Nov, App Check wiring) — 24th test: init
  attempted before the first AI call when the key is set (order
  `appCheck` → `getAI`, provider key + auto-refresh asserted); missing
  key warns only, no crash, AI call still goes through
