# Submission draft — NoteVault Hybrid (DO NOT SEND — skeleton only)

**Hackathon:** #BuildHybridAI 2026 — https://firebasehybridaihackathon.devpost.com/
**Status:** REAL WIRING DONE 12 Nov 2026 (tests 23/23 PASS, vite build PASS). REGISTERED
12 Nov 00:59 IST (solo, Devpost MSAbhishek22; 1,457 participants at registration).
No repo / live URL / video yet — parent handles those. Do not submit from this file
until every checklist item is green.

## Title (working)
NoteVault Hybrid

## One line (working)
Your notes never leave your device unless you ask — quick work runs on-device (Gemini Nano),
deep work goes to cloud Gemini, and every answer shows you which path served it and why.

## What to paste (fill during the build)
- Repo: <GitHub URL — parent to create MSAbhishek22/notevault-hybrid; manifest at ~/workspace/hackathons/buildhybridai-paths>
- Demo video: <YouTube URL — recorded ONLY from the live hosted app, 60–120s>
- Live demo: <Vercel URL — parent to deploy>
- How Firebase AI Logic hybrid inference is used: REAL, not mock (12 Nov 2026) —
  `getGenerativeModel` with `mode: "prefer_on_device"` and cloud fallback
  `gemini-3.5-flash-lite` via the Firebase AI Logic SDK (firebase 12.19.0, Gemini
  Developer API free tier — no Vertex AI / Blaze). Every answer's chip is read from
  the SDK response's `inferenceSource` (`"on_device"` / `"in_cloud"`). Privacy
  toggle `ONLY_ON_DEVICE` refuses cloud calls loudly before any SDK call (zero
  SDK calls in that path — proven by tests). Deep Dive chat is a separate plain
  cloud model (multi-turn chat is not supported on-device). On a machine without
  Gemini Nano, the app falls back to the cloud and says so — nothing fakes Nano.
- How to reproduce: <clone the repo, npm install, npm run dev, open in Chrome desktop
  v139+ with the Prompt API flag enabled; model downloads on first use; Firebase
  project config via VITE_FIREBASE_* env vars — see app/REAL_WIRING_NOTES.md>
- What is NOT claimed: on-device works only where Chrome's Prompt API / Gemini Nano
  is available (falls back to cloud otherwise, and says so); free-tier budget for
  gemini-3.5-flash-lite is a placeholder (250/day, unverified — read from AI Studio);
  formal Official Rules still unpublished at registration (prize split on the page
  is contradictory — $30,000 Grand vs $10,000 Grand + $3,000/platform); live
  end-to-end (real Nano download + real cloud call) must be verified on the
  deployed site before the video is recorded.

## Judging-lens map (from CONCEPT.md)
- Technological Implementation: real hybrid routing (Firebase AI Logic SDK, PREFER_ON_DEVICE
  + fallback, inferenceSource chips, App Check, structured output).
- Design: clean notes UI, visible routing, one-toggle privacy mode, responsive.
- Potential Impact: private notes AI for anyone; free, offline-capable, no account.
- Quality of Idea: privacy as a mode; the fallback is the product.

## Pre-send checklist (all must be true)
- [x] Full rules read (12 Nov) — India NOT excluded, solo OK, NOT fresh-build-only;
      formal Official Rules still unpublished — re-check country list + prize split
- [ ] Repo public, remote head verified against local (parent: create MSAbhishek22/notevault-hybrid)
- [ ] Firebase project created (Spark/free, Gemini Developer API) + VITE_FIREBASE_* set on Vercel — see app/REAL_WIRING_NOTES.md
- [ ] Live end-to-end verified on the deployed site: Cloud chip on ask, On device chip after model download, loud failure in ONLY_ON_DEVICE with no model
- [ ] Live demo URL works in a clean Chrome profile
- [ ] Demo video recorded from the live URL, uploaded, link opened and watched back
- [ ] README shows the hybrid story (what runs where, and why)
- [ ] Submission sent before the published deadline (safe target 30 Nov 20:00 IST;
      hard deadline 1 Dec 03:30 IST — confirmed 12 Nov)
