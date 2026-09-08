# Environments, flavors, and config — Self-test

## Core recall

1. Name the three typical backends and why they exist.
2. Why separate **bundle IDs / applicationIds**? (side-by-side)
3. List what **belongs** in config (four curriculum bullets).
4. List what **does not** belong (three curriculum bullets).
5. Recite the spoken answer to “How do you manage environments in RN?”
6. What is **build-time** vs **runtime** config (one line each)?
7. What are remote flags for (risky rollouts)?
8. Why is gitignoring `.env` **not** enough to make a value secret?
9. Where should features read `apiBaseUrl` from?
10. If remote config is down, what should a **risky** flag do?

## Explain why

1. Why is a prod app hitting **staging** (or the reverse) an incident, not a UX nit?
2. Why is flavor **identity** native (bundle ID) and not only a JS URL?
3. Why can QA **not** keep two builds if IDs are identical?
4. Why must private API secrets stay **out** of the RN bundle?
5. Why are **signing passwords** not `.env` that Metro bundles?
6. Why aren’t **all** “API keys” equally secret (analytics vs payment **secret** key)?
7. Why compile-time URL **and** a typed module, not `process.env` in `model/`?
8. Why remote flags **cannot** replace flavors for side-by-side staging?
9. Why flavors **cannot** kill a shipped crash **today** without a flag or a new binary?
10. Why infinite-wait on remote config at boot is a shell/config failure?

## Compare and contrast

1. dev vs staging vs prod backends.
2. Same bundle ID + runtime URL switch vs flavors with different IDs.
3. Build-time `API_BASE_URL` vs remote feature flag.
4. Public analytics app key vs private privileged secret.
5. Flag **default** in compile-time config vs value from remote.
6. Typed `app/config.ts` vs scattering `process.env` in features.
7. White-label via **flavor + tokens** vs forking the repo (high level).
8. This unit vs [CI/signing](../11-cicd-releases.md) vs [app shell boot](../16.%20app-shell/notes.md).

## Predict the output

1. Prod CI uses `.env.staging`. What can users hit, and why is that bad?

2. `STRIPE_SECRET_KEY` in `react-native-config`. What can an attacker with the APK do (class of harm)?

3. Staging and prod share `com.company.app`. Tester installs staging. What happens to the prod app on the phone?

4. New QR payments gated only by `NEW_QR=true` in **prod** `.env` (build-time), no remote flag. Friday production bug. How fast can you disable?

5. `getConfig()` in the shell; `features/payments/model/fees.ts` still has `fetch('https://api.prod...')`. What failed?

6. Remote flag `newQr` defaults to **true** in code if fetch fails. Risky feature. What’s wrong?

## Debugging

1. “We disabled the feature in Firebase” but users still see it. Two possible architecture misses?

2. Review: `.env` contains `PLAY_UPLOAD_JSON=...` and `API_URL`. Split them.

3. Deep links for prod open the **staging** app on an engineer’s phone. What identity/config mismatch?

4. Crashlytics shows `env=prod` but requests go to staging host. Where do you look (flavor vs JS vs hardcoded)?

5. First launch offline: all flags **on**. Where should defaults have lived?

6. PR adds `process.env.API_URL` in three features. What do you ask them to do instead?

## Application

1. Recite the spoken environments answer from memory.

2. Sketch `AppConfig` type: `env`, `apiBaseUrl`, `deepLinkHost`, one flag.

3. Classify: API URL, Stripe **publishable** key, Stripe **secret**, Play signing password, Crashlytics app id, `NEW_QR` default `false`.

4. Write a one-line CI rule: prod scheme must not …

5. One-line PR rule: “Features must not …”

6. Risky feature: what is compile-time vs remote vs “just ship and hope”?

## Interview questions

1. How do you manage environments in RN?  
   **Follow-ups:** Why different bundle IDs? What must never go in `.env`?

2. Build-time vs runtime config — when do you use each?

3. How do you roll out a risky payments feature?

4. A stakeholder wants staging and prod on one device. What do you set up?

5. White-label second app in 6 weeks — how do flavors/tokens help or hurt? (Keep this at **config/identity**, not a full product lecture.)

## Connections

1. How does this **implement** shell “environment config access”?
2. How do **tokens** [design system](../18.%20design-system/notes.md) interact with extra flavors?
3. How do deep-link **hostnames** in config relate to [nav architecture](../17.%20nav-architecture/notes.md)?
4. How does “catastrophic if extracted” connect to [security](../13-security.md) without dumping pinning?
5. Why is this **not** an answer to DTO mapping or feature folders?
