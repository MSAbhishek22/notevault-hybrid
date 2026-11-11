# NoteVault Hybrid — Build Plan (9–30 Nov 2026)

**Window:** submissions open Mon 9 Nov 2026, close Mon 30 Nov 2026, 2:00 PM PT
= **Tue 1 Dec 2026, 03:30 IST**. Safe internal submit target: **Mon 30 Nov 2026, 20:00 IST**.
**Builder:** solo (M S Abhishek). **Budget:** $0 (Spark plan + Gemini free tier; no card, ever).
**Parallel tracks in the same window:** SPECS due 10 Nov, BharatCode due 10 Nov,
Founding.dev build 6–10 Nov — so 9–10 Nov are LIGHT for this project by design.

## Milestones

### Mon 9 Nov — Rules day (light)
- [ ] Read the full rules the moment they drop (`NOV9_CHECKLIST.md` — every box checked or
      marked N/A with a reason). Confirm: India eligibility, solo OK, new-project rule,
      submission requirements, bonus challenges, full prize list, Firebase requirements.
- [ ] Devpost "Join hackathon" / register — **user's tap** (agent prepares everything else).
- [ ] Create the Firebase project (user's Google account, Spark plan) + run the AI Logic
      guided workflow → Gemini Developer API → App Check. Record the exact free-tier
      limits for the chosen cloud model from AI Studio.
- [ ] **Spike (the one technical risk):** in Chrome desktop, verify `inferenceSource` on a
      web hybrid response, the model-download flow, and `initializeDeviceModel()` behaviour.
      If `inferenceSource` is absent on web, decide the fallback chip logic the same day.
- [ ] Pin the `firebase` package version; scaffold `app/` (Vite + `firebase` + Vitest).

### Tue 10 Nov — Rules + spike close (light)
- [ ] Finish any open Nov 9 checklist items (bonus challenges, prize list).
- [ ] SPECS + BharatCode submit today (separate tracks — this project's heavy build starts
      after they are filed).
- [ ] Design constitution + design registry (per the project rulebook): 5 design references,
      distinct from the last 3 projects (Digest Room, Spec Ghost, CageCheck).

### Wed 11 Nov – Fri 13 Nov — Vault + hybrid core
- [ ] Vault: IndexedDB store, `.md`/`.txt` import, bundled sample notes, local keyword
      search, note list + preview.
- [ ] Hybrid core: Firebase init, `PREFER_ON_DEVICE` model, `initializeDeviceModel()` on a
      user click, Ask (single-turn, grounded, citations), Summarise (structured JSON),
      routing panel + inferenceSource chips, fallback logging.
- [ ] Tests: routing/budget/guard tests with a mocked model (Vitest). Manual check in
      Chrome: same question with Nano available vs disabled (flag off) → both paths work.

### Sat 14 Nov – Mon 16 Nov — Cloud depth + privacy
- [ ] Deep Dive (cloud chat, `ONLY_IN_CLOUD`) + budget meter with verified free-tier numbers.
- [ ] Privacy mode (`ONLY_ON_DEVICE`) + loud refusal + offline indicator.
- [ ] Organise (tag plan, structured output, plan only).
- [ ] Per-user rate limits configured in Firebase AI Logic as a guardrail.

### Tue 17 Nov – Thu 19 Nov — Polish
- [ ] Photo note (JPEG/PNG, on-device multimodal + cloud fallback) — only if core is green.
- [ ] Design pass: responsive, reduced-motion, no dead buttons (interaction inventory).
- [ ] Full manual QA in Chrome: on-device path, cloud path, offline path, privacy mode,
      refusal path, budget exhaustion path.

### Fri 20 Nov – Sun 22 Nov — Deploy + QA
- [ ] Firebase Hosting deploy → live URL. Verify the live URL in a clean Chrome profile
      (flag + model download flow as a judge would see it).
- [ ] Deployment runbook + release manifest (exact commit SHA).
- [ ] Fix everything QA found. Freeze the feature list — no new features after 22 Nov.

### Mon 23 Nov – Wed 25 Nov — Video + submission pack
- [ ] Demo video (60–120s) recorded from the LIVE hosted URL only — offline on-device
      answer, cloud Deep Dive, privacy-mode refusal. Watch it back; fill the video manifest.
- [ ] README (storyline: "nothing new, something missing" — private notes AI), submission
      draft finalised, screenshots.
- [ ] Push the repo to GitHub (public) + verify remote head matches local.

### Thu 26 Nov – Sat 28 Nov — Buffer
- [ ] Bug fixes only. Re-verify: live URL still up, video link works, repo matches.
- [ ] If a bonus challenge is worth entering, it is decided by 26 Nov at the latest —
      no new scope after that.

### Sun 29 Nov – Mon 30 Nov — Submit
- [ ] Final check against `NOV9_CHECKLIST.md` (submission requirements as published).
- [ ] Submit on Devpost by **Mon 30 Nov 20:00 IST** (safe target; hard deadline Tue 1 Dec
      03:30 IST). Record the confirmation + submission URL.
- [ ] Post-submit: update this repo's release card + memory with the result.

## Daily rhythm (solo, ~3 weeks)

- Mornings: build the day's milestone; evenings: verify in Chrome + commit + push.
- Every commit message states what was verified (not just what was written).
- No feature is "done" until it works on the live URL, not just localhost.
- The video rule is non-negotiable: the demo video is a screen recording of the live
  hosted app working, with at least one real action. No screenshots/slides video.

## If the rules change the plan (9 Nov)

- If India is NOT eligible → STOP. Do not build. Report it the same day.
- If the rules require a specific stack/model/version → adopt it; update ARCHITECTURE.md
  the same day and note the change.
- If bonus challenges exist → evaluate each on 9–10 Nov; enter one only if it fits the
  existing build (no new product for a bonus).
- If the deadline or submission requirements differ from the pre-announcement page →
  this plan's dates move to match the published rules, and the change is recorded here.
