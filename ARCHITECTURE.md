# NoteVault Hybrid — Architecture

**Status:** PREP (5 Nov 2026). Decisions below are the plan; anything marked TO-VERIFY is
confirmed on the Day 1 spike (9–10 Nov) before building on it.

## Stack (chosen)

| Layer | Choice | Why |
|---|---|---|
| App | Web app, vanilla JavaScript + Vite | Best-documented hybrid path (official web docs); runs in Chrome desktop; no framework to fight; easy to demo and record |
| AI | Firebase AI Logic, JS SDK (`firebase/ai`) | The hackathon's required tech; proxy keeps the API key server-side; App Check included |
| Cloud provider | **Gemini Developer API** (free tier) | No billing, no card. Vertex AI / Agent Platform requires Blaze — NOT used |
| Cloud fallback model | `gemini-2.5-flash-lite` (to confirm 9 Nov) | Cheapest/fastest; highest free daily budget per cited figures; plenty for summaries and synthesis |
| On-device model | Gemini Nano via Chrome Prompt API | Built into Chrome v139+; no weights shipped by the app |
| Notes storage | IndexedDB (browser-local) + file import | Local-first: notes never leave the device by default; no Firestore, no account, no server |
| Hosting | Firebase Hosting (Spark plan) | Free tier; the live demo URL for judges and the video |
| Tests | Vitest (unit: routing, budget, guards) + manual QA checklist | Routing logic must be tested with a mocked model; the real model is verified by hand in Chrome |

## Data flow

```
User types a question
  → local keyword search over the vault (IndexedDB, no AI)
  → no matching notes? → grounded refusal (no model call, no budget spent)
  → matching excerpts (max 3 notes, capped chars) + question
  → GenerativeModel, mode PREFER_ON_DEVICE
      → Nano available? → answer on-device → chip "On device" (inferenceSource)
      → Nano unavailable / request unsupported? → SDK falls back to cloud Gemini
          → chip "Cloud" + reason ("Nano unavailable" / "needs long context")
  → answer rendered with citations + routing panel (route, reason, fallbacks, budget)
```

Deep Dive (chat) is a separate path: it always uses the cloud model (`ONLY_IN_CLOUD`),
because multi-turn chat is not supported on-device. The UI labels it "Cloud — chat needs
the cloud" before the first message is sent, so the user consents by using it.

Privacy mode flips the Ask/Summarise/Organise model to `ONLY_ON_DEVICE`. A request that
can't run on-device throws; the app catches it and shows a loud refusal instead of
silently falling back.

## Routing rules (the product logic)

| Feature | Mode | Why |
|---|---|---|
| Ask (single-turn) | `PREFER_ON_DEVICE` | Quick, private; cloud fallback keeps 100% reach |
| Summarise (one note) | `PREFER_ON_DEVICE` + structured JSON output | Short, single-turn; JSON schema makes bullets reliable |
| Organise (tag plan) | `PREFER_ON_DEVICE` + structured JSON output | Short, single-turn |
| Deep Dive (chat) | `ONLY_IN_CLOUD` | Multi-turn chat is cloud-only per the docs |
| Photo note (JPEG/PNG) | `PREFER_ON_DEVICE` (multimodal) | On-device multimodal supports JPEG/PNG; fallback cloud for anything else |
| Privacy mode ON (Ask/Summarise/Organise) | `ONLY_ON_DEVICE` | Fails loudly instead of sending notes to the cloud |

**Budget meter:** counts cloud calls per session against the verified free-tier daily budget
(read from AI Studio on Day 1). On-device calls cost nothing and are shown separately.
Firebase AI Logic's per-user rate limits (default on, configurable) are set as a guardrail
so one session can't burn the daily budget. Token counting via the model is NOT built
(it always throws for on-device) — the meter counts *calls*, not tokens, and says so.

## Files the app reads (and never writes)

- Only `.md` / `.txt` files the user imports, plus the bundled sample notes.
- The app never edits, renames or moves a note. `Organise` prints a plan only.
- Note text is wrapped as data in the prompt; the system prompt says to ignore instructions
  inside notes; notes containing instruction-like text are flagged (same guardrails as
  NoteVault, re-implemented for the web app).

## Security / privacy

- **API key:** never in the app. Firebase AI Logic proxy injects it server-side; App Check
  attests the app. App Check debug provider is used for localhost only (debug token
  safelisted in the console; never committed).
- **Notes:** stored in IndexedDB on the user's machine. In the default mode, note text is
  sent to the cloud ONLY when the SDK falls back (or for Deep Dive, which is labelled cloud
  before use). In privacy mode, note text never leaves the device.
- **No analytics, no tracking.** No account. No third-party scripts beyond Firebase.
- **Secrets:** the Firebase *config object* (apiKey etc.) is public-by-design for web apps
  and is protected by App Check + Security Rules — but it is still loaded from a local
  config file that is NOT committed with real values; the repo ships a placeholder.
  (The Firebase web apiKey is not a secret in the same sense as a server key; App Check is
  what protects it. This is documented behaviour — do not treat the config as a password,
  and do not invent a backend to hide it.)

## File layout (planned)

```
buildhybridai/
  README.md                  Project index + status
  CONCEPT.md                 Concept + hybrid story + judging map
  ARCHITECTURE.md            This file
  BUILD_PLAN.md              Dated milestones Nov 9–30
  NOV9_CHECKLIST.md          What to verify when rules drop Nov 9
  research/
    FIREBASE_AI_LOGIC_RESEARCH.md
  submission/
    SUBMISSION_DRAFT.md      Skeleton (filled during the build)
    DEMO_VIDEO_MANIFEST.md   (created at video time)
  app/
    package.json             firebase + vite (+ vitest)
    index.html               App shell
    src/
      main.js                UI wiring
      vault.js               IndexedDB + import + local search
      hybrid.js              Firebase init, model creation, routing, inferenceSource chips
      budget.js              Cloud-call budget meter
      guards.js              Path/size/prompt-injection guards (ported from NoteVault ideas)
    public/
      samples/               Bundled sample notes
    tests/
      routing.test.js        Routing/budget/guard tests (mocked model)
  design/
    DESIGN_CONSTITUTION.md   (created during the build, per the rulebook)
    PROJECT_DESIGN_REGISTRY.md
  qa/
    INTERACTION_INVENTORY.md (created during the build)
  deployment/
    DEPLOYMENT_RUNBOOK.md    (created at deploy time)
    RELEASE_MANIFEST.json    (created at release time)
```

## Deployment plan

1. Firebase project (Spark plan, free) — created by the user in the console (his Google
   account; the agent never creates accounts). AI Logic guided workflow → Gemini Developer
   API → App Check (reCAPTCHA Enterprise for the hosted app; debug provider for localhost).
2. `firebase deploy --only hosting` → live URL (e.g. `notevault-hybrid.web.app`).
   The demo video is recorded from that live URL, per the video rule.
3. The live app must work for a judge in Chrome desktop with the Prompt API flag enabled —
   the README states the flag + model-download step plainly, and the app itself guides the
   user (download-progress UI + "Nano not available, using cloud" messaging).

## Risks (honest)

| Risk | Mitigation |
|---|---|
| Judges don't have Chrome / Nano downloaded → everything runs in cloud, hybrid story is invisible | The video shows the on-device path explicitly; the UI always shows the chip; the README explains the flag + download. The app is still fully functional in the cloud. |
| `inferenceSource` missing/different on web | Day 1 spike verifies it; if absent, the chip reads the mode + a local availability check instead — and the docs are re-read before claiming it. |
| Free-tier limits lower than cited | Budget meter uses verified numbers; Deep Dive is the only heavy cloud feature; on-device carries the routine load. |
| Hybrid marked Experimental / API changes before Nov 30 | Pin the `firebase` package version at build start; re-read the docs on Nov 9 and at submit time. |
| Rules require a fully new project / forbid adaptation | Concept already plans a new repo + new web app; confirm the exact wording Nov 9 (see checklist). |
| Time overlap with SPECS (due 10 Nov) + BharatCode (due 10 Nov) + Founding.dev build (6–10 Nov) | Build plan starts light on Nov 9–10 (rules + spike only); heavy build starts ~11 Nov. See BUILD_PLAN.md. |
