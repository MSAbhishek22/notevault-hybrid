# Nov 9 Checklist — What to verify when the full rules drop

## Status — Tue 10 Nov 2026, 07:41 IST check (NEW — rules date slipped)
**Rules STILL not live, and the date moved.** Fresh read of https://firebasehybridaihackathon.devpost.com/ (crawled 02:11 UTC): the page now says full details "will be released on day **November 11, 2026** when submissions formally open" (was November 9). Submissions now open Mon 11 Nov 2026, close Mon 30 Nov 2026 2:00 PM PT (= Tue 1 Dec 03:30 IST, unchanged). $30,000 cash Grand Prize, 1 winner, solo OK — unchanged. India eligibility still UNVERIFIED; do NOT stop the build. Registration is open now ("Save your Spot"). One-off re-check scheduled: cron `buildhybridai-rules-check-nov11`, Wed 11 Nov 22:45 IST (after the 12:00 ET open).

## Status — Mon 9 Nov 2026, 21:45 IST check
**Rules NOT yet live.** Checked https://firebasehybridaihackathon.devpost.com/ and /rules directly (fresh crawl 21:44 IST): main page still says full details "will be released on day November 9, 2026"; /rules still says "The Official Rules for the Hackathon are not yet available." No boxes ticked — nothing verified. Per the runonce job instructions: reported once, no retry. Re-check next run / when rules appear.

**When:** Mon 9 Nov 2026, the moment the full rules / submission requirements / prizes /
bonus challenges are published on https://firebasehybridaihackathon.devpost.com/
**How:** read the Devpost page + /rules (and any linked Firebase pages) directly. Do not trust
aggregator summaries. Check every box below, or mark it N/A with a reason. Nothing in this
file is verified yet — the pre-announcement page only said: $30,000 grand prize (1 winner),
submissions 9–30 Nov 2026 (close 30 Nov 2:00 PM PT = 1 Dec 03:30 IST), solo OK, free,
full details land Nov 9.

## Eligibility (STOP if any of these fail)

- [ ] **India eligible?** Read the country/region eligibility list or exclusions. Confirm
      India is not excluded (and note any sanctioned-region list).
- [ ] **Solo entry confirmed in the full rules?** (Pre-announcement page says solo OK — confirm
      it survives in the published rules.)
- [ ] **Age requirement?** (User is 18+; confirm the exact wording — age of majority vs 18+.)
- [ ] **Student / other status required?** Any requirement that would exclude the user?
- [ ] **Anything requiring a card, payment, or paid plan?** If yes → STOP, do not build.
      (Expected: no. Gemini Developer API free tier + Firebase Spark plan.)

## Submission requirements

- [ ] **What exactly must be submitted?** (Repo URL? Demo video? Live demo link? Written
      description? Any required fields?)
- [ ] **Demo video requirements?** (Max length? Must it be public on YouTube? Any required
      content?)
- [ ] **Live demo link required?** (If yes: Firebase Hosting URL is the plan. If a deploy is
      required, confirm which hosts are acceptable.)
- [ ] **Repo requirements?** (Public? License? Must it be created during the window?)
- [ ] **New-project rule?** Must the project be built Nov 9–30, or is adapting an existing
      project (NoteVault) allowed? Record the exact wording — it decides how the submission
      describes reuse.
- [ ] **Submission form fields?** (Anything beyond title/description/repo/video — e.g. a
      Firebase project ID, a write-up, team details?)
- [ ] **Deadline, confirmed:** submissions close Mon 30 Nov 2026, 2:00 PM PT (= Tue 1 Dec
      03:30 IST)? Record the exact published time + timezone.

## Prizes

- [ ] **Full prize list:** is it only the $30,000 grand prize, or are there more prizes /
      categories? Record each prize + its value.
- [ ] **Bonus challenges:** what are they, what do they add, do they need a separate
      submission or extra work? Decide by 10 Nov whether to enter any.
- [ ] **Payout:** how/when are winners paid? Any tax, verification, or payout-eligibility
      step for India? Winners announcement date?

## Firebase / technical requirements

- [ ] **Is a Firebase project required, or just recommended?** Any required Firebase
      services beyond AI Logic (Hosting? App Check? Auth?)?
- [ ] **Required Firebase AI Logic version / SDK version / model?** (Pin versions to match.)
- [ ] **Required cloud model?** (If the rules name a model, use it; otherwise our plan is
      `gemini-2.5-flash-lite` as the cloud fallback — confirm the model string is current.)
- [ ] **Any Firebase credits offered?** (If credits require a card or billing to claim, do
      NOT claim them — record that instead.)
- [ ] **Hybrid inference explicitly required, or is any Firebase AI Logic use enough?**
      (Our concept is hybrid-first either way, but the wording matters for the submission.)

## Judging

- [ ] **Judging criteria + weights?** (Pre-announcement lenses: Technological Implementation,
      Design, Potential Impact, Quality of Idea — confirm and record any weights.)
- [ ] **Judging process + timeline?** (Who judges, when are winners announced?)
- [ ] **Demo / presentation required beyond the video?** (Live demo session? Pitch?)

## Registration

- [ ] **Devpost "Join hackathon" / registration step?** (User's tap — record what it asks.)
- [ ] **Anything else to register for?** (Firebase? Discord? A form?)

## After checking everything

- [ ] Update `CONCEPT.md` + `ARCHITECTURE.md` with anything the rules changed (and note the
      change + date).
- [ ] Update `BUILD_PLAN.md` dates if the published deadline differs from 1 Dec 03:30 IST.
- [ ] If any eligibility box failed → STOP the build, report it the same day, do not spend
      further effort.
- [ ] If all green → proceed with the Day 1 spike (see BUILD_PLAN.md, 9 Nov).
