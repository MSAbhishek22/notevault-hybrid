# Firebase AI Logic — Hybrid Inference Research

**Prepared:** 5 Nov 2026 (prep for #BuildHybridAI 2026; build starts 9 Nov 2026)
**Purpose:** what hybrid inference is, what runs where, which stacks work, what it costs.
**Rule:** everything below is marked VERIFIED (read from official Firebase/Google docs on 5 Nov 2026)
or SECONDARY (from reputable third-party write-ups) or TO-VERIFY (must be checked at build time).
Nothing here is a hackathon rule — hackathon rules are UNVERIFIED until the full rules drop Nov 9.

## Sources (official, read 5 Nov 2026)

- Hybrid, web get-started: https://firebase.google.com/docs/ai-logic/hybrid/web/get-started
- AI Logic overview: https://firebase.google.com/docs/ai-logic
- Hybrid, Android config options: https://firebase.google.com/docs/ai-logic/hybrid/android/configuration-options
- Android hybrid guide: https://developer.android.com/ai/hybrid
- Hackathon page: https://firebasehybridaihackathon.devpost.com/

## 1. What hybrid inference is (VERIFIED)

Hybrid inference = one `GenerativeModel` that runs inference on-device when the on-device model
is available, and seamlessly falls back to a cloud-hosted model otherwise (and vice versa).
You set a mode; the SDK routes each request and falls back when the preferred path can't
serve it. There is no server of your own: the Firebase AI Logic client SDK calls Gemini
directly from the app, through a Firebase proxy that keeps the API key server-side.

## 2. What runs where (VERIFIED)

| Path | Model | How it runs |
|---|---|---|
| On-device (web) | Gemini Nano, via Chrome's Prompt API | Inside Chrome on the user's machine; the model is downloaded to the browser, not shipped by the app |
| On-device (Android) | Gemini Nano, via ML Kit Prompt API / AICore | Android system service; the model is shared across apps, downloaded/updated by the OS |
| Cloud | Gemini (e.g. gemini-2.5-flash / gemini-2.5-flash-lite) | Via Firebase AI Logic proxy → your chosen Gemini API provider |

**Web constraint (VERIFIED): on-device inference is supported only for web apps running
on Chrome on Desktop.** Not other browsers, not mobile Chrome.

## 3. Inference modes (VERIFIED, official docs)

| Mode | Behaviour |
|---|---|
| `PREFER_ON_DEVICE` | Use the on-device model if available and it supports the request; otherwise log an on-device error, then automatically fall back to the cloud model. |
| `ONLY_ON_DEVICE` | Use the on-device model if available; otherwise throw an exception (no fallback). |
| `PREFER_IN_CLOUD` | Use the cloud model if online and available; fall back to the on-device model only when offline; throw for other failures. |
| `ONLY_IN_CLOUD` | Use the cloud model if online and available; otherwise throw. |

A named cloud model must be set explicitly for every mode that can reach the cloud — the SDK
has no default cloud model for those modes (documented on the Android config page; confirm the
web default at build time — see §9).

## 4. What on-device can and cannot do — web (VERIFIED)

**Supported on-device (web):**
- Single-turn text generation ONLY (explicitly **not** chat), streaming (`generateContentStream`)
  or non-streaming (`generateContent`).
- Text-only input, or text + image input (JPEG and PNG only).
- Structured output (JSON and enums) via a response schema.

**NOT supported on-device (falls back to cloud in `PREFER_ON_DEVICE`; throws in `ONLY_ON_DEVICE`):**
- Audio, video, and document (e.g. PDF) inputs.
- Image input types other than JPEG/PNG; image generation (Gemini Nano Banana models).
- Files supplied by URL (on-device needs files as inline data).
- Multi-turn chat.
- Tools: function calling, code execution, URL context, Grounding with Google Search/Maps.
- Bi-directional streaming (Gemini Live API).
- Token counting — **always throws** (counts differ between on-device and cloud models, so there
  is no fallback). Do not build a token counter that depends on the model.
- AI monitoring in the Firebase console for on-device inference (cloud inference is monitored
  normally).

## 5. How to tell which path served a request (VERIFIED for Android and web — 12 Nov 2026)

Every response carries an `inferenceSource` property returning `ON_DEVICE` or `IN_CLOUD`
(documented on the official Android configuration page, for `PREFER_ON_DEVICE` /
`PREFER_IN_CLOUD` modes). This is the field the UI chip reads — log the value, never the prompt.
**Web parity to confirm during the Day 1 spike:** the web `GenerateContentResponse` should
carry the same property; verify it in the browser before building UI around it.

## 6. Setup requirements — web (VERIFIED)

1. **Chrome v139+** on desktop. Enable the flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
   and restart Chrome.
2. **Download the on-device model** before the first request (or it auto-starts downloading on
   the first request). Pre-download check in DevTools console: `await LanguageModel.availability()`
   → `available` / `downloading` / `downloadable`; then `await LanguageModel.create()` to start it.
3. **Firebase project** (free Spark plan works for the Gemini Developer API). In the console:
   AI Services → AI Logic → Get started (guided workflow enables the required APIs).
4. **Gemini API provider: Gemini Developer API** (recommended; free tier, no billing). The other
   provider, Agent Platform Gemini API (formerly Vertex AI), **requires billing (Blaze)** — do NOT
   use it (free-only rule).
5. **Firebase App Check is auto-enforced** by the AI Logic setup workflow (it protects the Gemini
   API key, which the proxy keeps server-side — the key is never in the app bundle). For local
   development, configure the App Check **debug provider** and safelist the debug token in the
   console (App Check → Apps → Manage debug tokens).
6. **SDK:** `npm install firebase`; imports from `"firebase/ai"`:
   `getAI`, `getGenerativeModel`, `GoogleAIBackend`, `InferenceMode`.
   `const model = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE });`
7. **`model.initializeDeviceModel()` must be called after/on a user interaction (e.g. a button
   click) and before any `generateContent()` call.** It reports download progress as a callback
   value (0–1). For `ONLY_ON_DEVICE`, await it.
8. **Code pattern (from the official docs):**
   ```js
   import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from "firebase/ai";
   const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
   const model = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE });
   // after a user click:
   model.initializeDeviceModel((v) => console.log(`Download progress: ${Math.round(v * 100)}%`));
   const result = await model.generateContent(prompt);
   const text = result.response.text();
   ```

## 7. Supported stacks (VERIFIED)

Firebase AI Logic client SDKs exist for: **Swift (Apple), Kotlin & Java (Android),
JavaScript (web), Dart (Flutter), Unity.**

Hybrid inference documentation exists for **Web and Android**. Status per platform:

| Platform | Hybrid docs | Notes |
|---|---|---|
| Web (JS) | VERIFIED — full get-started + config docs | Chrome desktop only; this is our primary stack |
| Android (Kotlin/Java) | VERIFIED — get-started + config docs + Android Developers guide | Gemini Nano via AICore; flagship devices only in practice |
| Flutter (Dart) | NOT verified from official docs | Secondary sources call it experimental but functional (`firebase_ai` package); do NOT choose as primary without verifying |
| iOS / Swift | NOT verified | No hybrid doc found; no on-device Gemini Nano on iOS — treat as cloud-only, do NOT build for it |
| Unity | NOT verified | No hybrid doc found |

**Decision: build the WEB app (JavaScript).** Best-documented hybrid path, runs in Chrome
desktop, easiest to demo and screen-record for the video, and the judges can open it in a
browser with no install.

## 8. Cost / free tier (VERIFIED in outline; exact numbers TO-VERIFY)

- **Firebase AI Logic itself:** no per-call charge from Firebase; you use the underlying Gemini
  API provider's quota. (VERIFIED: overview page links to the Gemini models' quotas/pricing.)
- **Gemini Developer API free tier:** exists, no billing/card required. Limits are per project,
  measured in requests/minute (RPM), tokens/minute (TPM) and requests/day (RPD), and they
  **change over time and differ per model** — published numbers conflict across sources.
- Commonly cited 2026 figures for `gemini-2.5-flash` free tier: **10 RPM / 250,000 TPM /
  250 RPD** (multiple sources); older docs cite up to 15 RPM / 1M TPM / 1,500 RPD. For
  `gemini-2.5-flash-lite`: commonly cited **15 RPM / 250,000 TPM / 1,000–1,500 RPD**.
  **Treat all of these as estimates. Verify the exact limits for our project in Google AI
  Studio at build time (Nov 9–10) and design the budget meter around the verified numbers.**
- **Design consequence:** route routine work on-device (zero cloud cost), use
  `gemini-2.5-flash-lite` as the cloud fallback (cheapest/fastest, highest free daily budget
  per the cited figures), and keep cloud calls small (grounded excerpts, not whole vaults).
  Firebase AI Logic also has **per-user rate limits by default, configurable** (overview page)
  — use them as a guardrail so one user can't burn the daily budget.
- **Vertex AI / Agent Platform:** requires Blaze (pay-as-you-go) billing. NOT used. If any
  setup step asks for billing, stop — that is the wrong provider.

## 9. Open questions / TO-VERIFY at build time (Nov 9–10)

> Resolved 12 Nov 2026 — see the §11 addendum at the end of this file. Items 1, 2, 4, 5, 7 resolved; item 3 (exact free-tier RPD) still open; item 6 (Prompt API on judges' machines) still a live risk.

1. `inferenceSource` on the **web** response — confirm the property name and that it returns
   `ON_DEVICE` / `IN_CLOUD` (documented for Android; web parity unconfirmed).
2. The **default cloud-hosted fallback model** for web hybrid (docs mention overriding it;
   the default name is not stated in what we read). We will set it explicitly to
   `gemini-2.5-flash-lite` (confirm the exact model string is current on Nov 9).
3. Exact **free-tier RPM/TPM/RPD** for the chosen cloud model, read from Google AI Studio
   for our own project.
4. Whether the hybrid feature is still marked **Experimental** (multiple secondary sources say
   so; the web docs we read carry no such banner — recheck the docs on Nov 9).
5. Firebase **Hosting free-tier limits** (Spark plan) for the live demo URL.
6. Chrome **Prompt API availability in the judges' environment** — the demo video must show
   the on-device path working; if the model isn't downloaded, the first request downloads it
   (slow on camera). Mitigation: pre-download the model before recording, and show the
   download-progress UI honestly.
7. Whether the Nov 9 hackathon rules require a **specific Firebase/AI Logic version, model, or
   a Firebase project in a particular setup** — unknown until the rules drop.

## 10. What this means for the concept

- The product's core is a **visible routing decision**: every answer shows ON_DEVICE or
  IN_CLOUD and why. That is the hybrid story, and it is also NoteVault's existing DNA
  (its routing panel already shows which route answered and why).
- On-device is for **quick, private, single-turn** work: one-note summary, instant answer,
  tags. Cloud is for **deep** work: multi-note synthesis, follow-up chat, images/PDFs.
- The **fallback is the product**: the same request works for 100% of users — Nano when
  present, cloud otherwise — and the app says so on screen.
- A **privacy mode** (`ONLY_ON_DEVICE`) is the differentiator: notes never leave the device,
  and the app fails loudly instead of silently using the cloud.

## 11. Addendum — verified 12 Nov 2026 (real wiring)

The open questions in §9 are now resolved, from the official Firebase docs
(crawled 2026-11-11 19:30 UTC) and the installed `firebase` 12.19.0 SDK types
(`node_modules/@firebase/ai/dist/ai-public.d.ts`).

1. **`inferenceSource` on web — CONFIRMED.** `GenerateContentResponse.inferenceSource?:
   InferenceSource` exists in the SDK types (v12.5.0+). **The SDK returns lowercase
   snake_case `"on_device"` / `"in_cloud"`** (`InferenceSource: { ON_DEVICE:
   "on_device", IN_CLOUD: "in_cloud" }`) — NOT the uppercase strings the docs
   prose uses. The app normalises both. If the field is ever omitted, the app
   derives the source from routing state and says so in the reason string.
2. **Default cloud fallback model — CONFIRMED: `gemini-3.5-flash-lite`** (SDK
   v13.0.0+ per the config-options page). The app sets it explicitly anyway in
   `inCloudParams: { model: "gemini-3.5-flash-lite" }`. **gemini-2.5-flash-lite is
   being retired** — requests routed to gemini-3.5-flash-lite from 1 Dec 2026
   (official models page). The 5 Nov plan's "use 2.5-flash-lite as cloud fallback"
   is superseded; do not use it.
3. **Free-tier RPM/TPM/RPD for gemini-3.5-flash-lite — STILL UNVERIFIED.** Read
   from Google AI Studio for our own project at deploy time; the budget meter's
   250/day is still a placeholder (`BUDGET_VERIFIED = false`).
4. **Experimental banner — not seen on the web hybrid docs** (12 Nov read).
   Treat as stable enough to ship; re-check if the rules mention a version pin.
5. **Firebase Hosting free-tier limits — MOOT.** The deploy route is Vercel
   (proven for this fleet), not Firebase Hosting.
6. **Prompt API in the judges' environment — still a live risk.** Mitigation
   stands: pre-download the model before recording; the video must show the
   download-progress UI honestly, and the Cloud fallback must be visible for
   machines without Nano.
7. **Rules — PARTIALLY RESOLVED 12 Nov.** India NOT excluded; NOT fresh-build-only
   (existing apps eligible if significantly updated in-window); all AI inference
   must go through Firebase AI Logic at runtime. Formal Official Rules still
   unpublished — re-check for the country list and the true prize split
   (page is contradictory: $30,000 Grand vs $10,000 Grand + $3,000/platform).

