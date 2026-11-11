# NoteVault Hybrid — #BuildHybridAI 2026 (prep)

**Your notes never leave your device unless you ask.** Quick work runs on-device in your
browser (Gemini Nano, free, instant, offline, private); deep work goes to cloud Gemini —
and every answer shows you which path served it and why.

## Status

| Item | State |
|---|---|
| Hackathon | #BuildHybridAI 2026, Devpost — https://firebasehybridaihackathon.devpost.com/ |
| Prize | $30,000 Grand Prize, 1 winner — REGISTERED 12 Nov 00:59 IST (solo; 1,457 participants at registration). Prize split contradictory on the page ($30,000 Grand vs $10,000 Grand + $3,000/platform) — quote neither as final; formal Official Rules still unpublished — re-check when they post. |
| Window | Submissions 11–30 Nov 2026 (close 1 Dec 03:30 IST) |
| Eligibility | Solo OK; **India NOT excluded** (verified 12 Nov on the official page); formal rules still unpublished |
| Phase | **REAL WIRING DONE 12 Nov 2026** — Firebase AI Logic hybrid engine is live in code (tests 23/23 PASS, vite build PASS, static serve 200). No Firebase project yet (console setup needed — see `app/REAL_WIRING_NOTES.md`). No repo, no deploy, no video, no submission yet. |
| Build | 12 Nov 2026, real wiring (replaces the 5 Nov mock shell) |

## What is real vs mock now (12 Nov 2026)

- **REAL:** every AI call goes through the Firebase AI Logic SDK (`firebase` 12.19.0,
  `getGenerativeModel` with `mode: "prefer_on_device"` / `"only_on_device"`, cloud
  fallback model `gemini-3.5-flash-lite`). The On device / Cloud chip is read from the
  SDK response's `inferenceSource` (`"on_device"` / `"in_cloud"` — verified in the
  installed SDK types). Privacy toggle `ONLY_ON_DEVICE` refuses cloud calls loudly
  before any SDK call (proven by tests: zero SDK calls in that path). Chat is a
  separate plain cloud model (multi-turn chat is not supported on-device).
- **HONEST FALLBACK, not fake:** on a machine without Chrome's Prompt API / Gemini
  Nano, the on-device path says so and the request falls back to the cloud — the
  chip says Cloud and the reason says why. Nothing pretends to be Nano.
- **NOT YET REAL:** no Firebase project exists, so the app cannot make a live call
  until the console setup in `app/REAL_WIRING_NOTES.md` is done; live end-to-end
  (real Nano download + real cloud call) is unverified in this sandbox and must be
  checked on the deployed site. No repo / deploy / video / submission yet.
- Full detail: `app/REAL_WIRING_NOTES.md`.

## What this is

A new web app (built 9–30 Nov 2026) that adapts NoteVault's ideas into a Firebase AI Logic
**hybrid inference** app. See:

- `CONCEPT.md` — the concept, the hybrid story, features, judging-lens map
- `ARCHITECTURE.md` — stack, data flow, routing rules, deployment plan, risks
- `BUILD_PLAN.md` — dated milestones, 9–30 Nov
- `NOV9_CHECKLIST.md` — exactly what to verify when the rules drop on 9 Nov
- `research/FIREBASE_AI_LOGIC_RESEARCH.md` — verified Firebase AI Logic findings
  (official docs read 5 Nov 2026), with verified vs assumed clearly marked
- `submission/SUBMISSION_DRAFT.md` — skeleton, filled during the build
- `app/` — minimal starter (Vite + Firebase JS SDK pattern from the official docs)

## The hybrid story in one paragraph

On-device Gemini Nano (Chrome desktop) handles quick, private, single-turn work — a
one-note summary, an instant answer, tags — free, instant, offline. Cloud Gemini (via
Firebase AI Logic, Gemini Developer API free tier) handles deep work — multi-note synthesis,
follow-up chat, images and PDFs. Every answer carries a chip read from the response's
`inferenceSource`: **On device** or **Cloud**, plus the reason. If Nano isn't available,
the same request falls back to the cloud — 100% of users get answers. A privacy toggle
switches the app to `ONLY_ON_DEVICE`: in that mode a request that can't run on-device fails
loudly instead of silently sending your notes to a server.

## Rules of this prep

- **Free-only, no card, ever.** Gemini Developer API (free tier) + Firebase Spark plan.
  Vertex AI / Agent Platform needs billing — never used.
- **Registered 12 Nov 2026** (solo, Devpost MSAbhishek22). No accounts created yet
  except the Devpost registration — the Firebase project is the one console step left
  (see `app/REAL_WIRING_NOTES.md`).
- **New build, not a resubmission.** New repo, new web app, built 9–30 Nov. NoteVault's
  ideas, sample notes and design language are reused; the Otari repo is never resubmitted.
- **Video rule:** the demo video is a screen recording of the live hosted app working,
  with at least one real action. No screenshots/slides video.

## Related work (existing, separate tracks)

- NoteVault (Mozilla Otari, submission due 11 Nov): https://github.com/MSAbhishek22/notevault
  — local source of the ideas reused here: `~/workspace/hackathons/mozilla-otari/`
- The parent's other November tracks (SPECS due 10 Nov, BharatCode due 10 Nov,
  Founding.dev build 6–10 Nov) overlap 9–10 Nov — this project's heavy build starts ~11 Nov.
