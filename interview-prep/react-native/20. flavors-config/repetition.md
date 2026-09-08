# Environments, flavors, and config — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Three backends. What belongs in config vs what must never ship in the bundle. Why gitignore ≠ secret. Typed `getConfig()` vs `process.env` in `model/`.
- [ ] Recite the spoken “how do you manage environments in RN?” Different bundle IDs (side-by-side). Build-time vs runtime. Remote flags for risky rollouts; fail **closed** if flags are down.
- [ ] Analytics public-by-nature vs Stripe **secret** vs signing passwords. Why flavors don’t replace Friday kill switches and flags don’t replace side-by-side IDs.
- [ ] Shell reads config vs this unit defining it. Tokens + flavor vs fork. Deep-link hosts must match that app’s identity.

## Predict / debug

- [ ] Prod CI uses `.env.staging`. Harm? `STRIPE_SECRET_KEY` in `react-native-config` — class of harm? Same `applicationId` for staging and prod — what happens on install?
- [ ] QR gated only in prod `.env`, no remote flag; Friday bug — how fast to disable? `fees.ts` hardcodes prod URL. Remote `newQr` defaults **true** on fetch fail.
- [ ] Firebase “off” but users still see the feature. `.env` has `PLAY_UPLOAD_JSON` and `API_URL`. Prod deep links open staging. Crashlytics `env=prod` but host is staging.
- [ ] First launch offline, all flags on. Three features read `process.env.API_URL`.

## Say it out loud

- [ ] How do you manage environments in RN? Follow-ups: bundle IDs? what never goes in `.env`?
- [ ] Build-time vs runtime. How do you roll out a risky payments feature?
- [ ] Explain env/flavors/secrets/flags in 30–60 seconds.
