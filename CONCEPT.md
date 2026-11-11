# NoteVault Hybrid — Concept

**Hackathon:** #BuildHybridAI 2026, Devpost — https://firebasehybridaihackathon.devpost.com/
**Status:** PREP ONLY (5 Nov 2026). No registration, no submission. Full build starts 9 Nov 2026
when the full rules drop. Everything about the hackathon's rules, prizes and eligibility is
UNVERIFIED until then — see `NOV9_CHECKLIST.md`.
**Working title:** NoteVault Hybrid. Final name to confirm 9 Nov (see "Naming" below).

## The problem (one line)

Every "smart notes" app wants the same deal: upload all your notes to someone's cloud, trust a
black box, and pay per token. Your notes are the most private thing you own — and the "AI"
in your notes app is usually an all-or-nothing choice: everything in the cloud, or no AI at all.

## The idea (one line)

**Your notes never leave your device unless you ask.** Quick work runs on-device in your
browser (Gemini Nano, free, instant, offline, private); deep work goes to cloud Gemini — and
the app shows you, on every single answer, which path served it and why.

## The hybrid story (this is the entry)

| Question | On-device (Gemini Nano, Chrome) | Cloud (Gemini via Firebase AI Logic) |
|---|---|---|
| What runs here | One-note summary, instant answer from your notes, tag suggestions, organise plan | Multi-note synthesis, follow-up chat, image/PDF notes, long-context reasoning |
| Why here | Private (notes never leave the device), instant, free, works offline | Capable (long context, multi-turn chat, tools, multimodal docs) |
| What the user sees | A chip: **"On device"** + the reason ("private · instant · free") | A chip: **"Cloud"** + the reason ("deep work · 3 notes · chat") |
| If it can't run here | Falls back to cloud automatically — the answer still arrives | Falls back to on-device only when offline (PREFER_IN_CLOUD is not our mode) |

**The fallback IS the product.** The same request works for 100% of users: Nano when present,
cloud otherwise. The app never shows a dead end — it shows the route it took.

**Privacy is a mode, not a promise.** A toggle — "Keep my notes on this device" — switches the
app to `ONLY_ON_DEVICE`. In that mode a request that can't run on-device fails loudly ("This
needs the cloud — turn off privacy mode or shorten the request") instead of silently sending
your notes to a server. That is the differentiator no cloud-only notes app can copy.

## What it is built from

NoteVault already exists (Python CLI + local web UI, 24 tests, public repo
https://github.com/MSAbhishek22/notevault, built for Mozilla Otari, submission pending 11 Nov).
This is **not a resubmission of that repo**. It is a **new web app, built 9–30 Nov 2026**,
that reuses NoteVault's ideas, sample notes, and design DNA:

- **Routing panel, every answer** — NoteVault already shows which route answered and why.
  Hybrid makes the routing *real*: device vs cloud, read from `inferenceSource`, not a
  provider string.
- **Budget meter, every answer** — NoteVault already meters calls per run. Hybrid meters
  *cloud* calls against the Gemini free tier, so the user sees exactly what the cloud costs
  (nothing, within the free tier) and how much is left.
- **Grounded refusal** — if no note matches, the app says so before any model call. Same as
  NoteVault; it spends no budget and attempts no route.
- **Citations** — answers cite the notes they used.
- **Local-first notes** — the vault lives in the browser (IndexedDB + file import). No account,
  no server, notes are never uploaded as a condition of using the app.

## Feature list (buildable in ~3 weeks, solo)

Core (must ship):
1. **Vault** — notes in the browser (IndexedDB), import `.md` / `.txt` files, bundled sample
   notes, local keyword search (no AI needed), note list + preview.
2. **Ask (single-turn)** — grounded answer from your notes, citations, `PREFER_ON_DEVICE`
   routing, chip shows ON_DEVICE / IN_CLOUD + reason + fallback attempts.
3. **Summarise** — 3-bullet summary of one note (on-device first; structured JSON output so
   the bullets are reliable).
4. **Deep Dive (cloud)** — multi-note synthesis + follow-up chat. Multi-turn chat is
   cloud-only per the docs, so this is the honest cloud feature. Budget meter on screen.
5. **Organise** — grouping plan by tag (on-device first, structured output). Plan only —
   no files are changed, same as NoteVault.
6. **Privacy mode** — `ONLY_ON_DEVICE` toggle; offline indicator; works with Wi-Fi off for
   on-device answers (the demo proves it).
7. **Routing panel** — every answer shows route, reason, fallback attempts, cloud budget
   used/remaining.

Stretch (only if core is done):
8. **Photo note** — photograph a handwritten note (JPEG/PNG); on-device multimodal reads it,
   cloud fallback for anything else. On-device multimodal supports JPEG/PNG only.
9. **Export** — download an answer + its citations as Markdown.

Deliberately NOT built (the docs say on-device can't do these; don't fake them):
- On-device audio/video/PDF understanding, on-device chat, on-device tools/function calling,
  on-device image generation, on-device token counting. All of these go through the cloud
  path, and the app says so.

## How it hits each judging lens

| Lens (from the Devpost page) | How NoteVault Hybrid hits it |
|---|---|
| **Technological Implementation** (how well it uses Firebase AI Logic hybrid inference) | Real hybrid routing with the Firebase AI Logic SDK: `PREFER_ON_DEVICE` + automatic cloud fallback, `inferenceSource` chips on every answer, App Check, structured output, explicit cloud fallback model. The demo shows the *same request* served on-device and (with Nano disabled) in the cloud. |
| **Design** | Clean notes UI; the routing is visible, not hidden; privacy mode is one toggle; responsive; reduced-motion support. |
| **Potential Impact** | Anyone with private notes — students, writers, researchers. Free (Spark plan + Gemini free tier), works offline, no account, notes stay on the device. The privacy story is credible and specific. |
| **Quality of Idea** | "Your notes never leave your device unless you ask" — privacy as a mode, with a loud failure instead of a silent cloud call. The fallback is the product: 100% of users get answers. |

## Naming

Working title: **NoteVault Hybrid**. Options if the rules require a clearly new project
(confirm 9 Nov): "NoteVault — Hybrid Notes", "On-Device Notes", "Vault on Device". Do not
finalise until the new-project rule is read — if the rules require a new project, the repo and
the name must read as a new build, not a renamed resubmission.

## What "new" means (important)

- **New repo, new web app, built 9–30 Nov 2026.** Reuse: NoteVault's ideas, sample notes,
  test patterns, and design language. Do NOT copy the Python app, do NOT resubmit the Otari
  repo, do NOT claim Otari work as hybrid work.
- If the Nov 9 rules say adaptation of an existing project is allowed, say so in the
  submission and name exactly what was reused vs what was built in the window. If the rules
  say new projects only, the submission says "built Nov 9–30" and the reused pieces are
  ideas + sample notes only.
- The Otari submission (NoteVault, deadline 11 Nov) is a **separate** track — this project
  must not jeopardise it. Different repo, different hackathon, different tech.

## Demo story (for the video, 60–120s, recorded from the live hosted app)

1. Open the live app; notes are already there (sample vault). Show the vault + local search.
2. Ask a question → answer arrives with an **"On device"** chip + citation. (Quick, private.)
3. Turn Wi-Fi off → ask again → still answers on-device. (Offline proof.)
4. Deep Dive on three notes → follow-up question → **"Cloud"** chip + budget meter moves.
   (Deep work, and the cost is visible.)
5. Flip privacy mode on → ask a deep question → loud refusal, no cloud call. (Privacy is a mode.)
6. Close: "Your notes never leave your device unless you ask."
