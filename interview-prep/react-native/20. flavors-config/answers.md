# Environments, flavors, and config — Answers

## Core recall

1. **dev / staging / prod** — local vs shared pre-prod vs real customers. Mixing them is a data/compliance risk.
2. **Side-by-side** installs; also separate push/Keychain/OAuth/link entitlements.
3. **API base URLs**; **flag defaults**; **public-by-nature** analytics keys; **deep-link hostnames**.
4. **Privileged private API secrets**; **signing passwords** in JS; **anything catastrophic if extracted from the bundle**.
5. Flavors/schemes for **identity + compile-time** config; **typed** config module; staging/prod **separated**; private secrets **off-device** or **secure native** flows; **remote flags** for risky features so you can disable **without** waiting for store review when appropriate.
6. **Build-time:** baked into that binary (URL, ID). **Runtime:** fetched after install (flags/remote config).
7. **Kill / % roll out** without a new store binary (when you shipped the gate).
8. The value is still **in the binary** (and in CI artifacts). Gitignore only hides it from **git**.
9. **Typed `getConfig()` / `app/config`**, not `process.env` in domain.
10. Stay **off** (safe **default false**). Don’t fail **open**.

## Explain why

1. **Prod PII** on staging, or **test** backends/cards on **real** users — trust, regulation, money.
2. OS identity drives **install slot**, store listing, push, keychain, universal links. JS cannot add a second icon/ID.
3. Same ID = **replace** the installed app. You cannot run both.
4. **APK/IPA reverse engineering** reads strings. Privileged keys become **world-readable**.
5. Those unlock **your** release pipeline / store. They belong in **CI secrets**, not a client bundle.
6. **Client analytics IDs** are expected in the app. **Secret keys** authorize **server-side** privileged APIs.
7. One **typed** door, flavor-safe, testable. Scatter in `model/` = hardcoded prod, untestable domain, easy mixups.
8. Flags don’t change **applicationId** or Firebase plist. You still **overwrite** the other build.
9. Compile-time is **frozen** until a new artifact. Runtime flag (if present) or **hotfix** binary.
10. Network hangs → **forever splash**. Defaults + **timeout**; flags aren’t identity.

## Compare and contrast

1. **dev:** engineers. **staging:** QA/integration. **prod:** customers. URLs and data **must not** mix.
2. Hidden URL switch: easy **wrong backend**, one install slot. Flavors: **bound** URL + **two apps**.
3. URL/ID **won’t** change without rebuild. Flag **can** change in the field.
4. Analytics: **identify the app**. Secret: **act as the business**.
5. Default = **offline/fail-safe**. Remote **overrides** when reachable.
6. **Central, typed, flavor-injected** vs drift and domain pollution.
7. Extra **flavor + token/asset** swap vs **double maintenance**. Fork if you never tokenized.
8. **This:** what values, flavors, secrets. **CI:** who signs which flavor. **Shell:** **when** you read flags at boot.

## Predict the output

1. **Prod users hit staging API** (or staging-like). Wrong data, possible **PII** leak / broken payments.
2. **Extract the secret** from the bundle; call Stripe (or whatever) **as you**. Catastrophic privileged access.
3. **Staging replaces prod** (or vice versa). One app left.
4. **Store review** (hours/days) unless you already have a **remote** kill switch. Build-time only = **stuck**.
5. **Hardcoded prod** bypasses flavors. Staging builds still **hit prod** — incident class.
6. **Fail-open** on a risky feature. Outage of flags **enables** risk. Default **false**.

## Debugging

1. **No runtime gate** (only compile-time); or **cached** old true; or a **second** code path that ignores the flag.
2. **API_URL** can stay client config. **PLAY_UPLOAD_JSON** → **CI**, never JS.
3. **Staging** app registered for **prod** host **or** same ID so the **wrong** app owns the link. Separate IDs **and** entitlements/hosts per env.
4. **JS hardcoded / wrong envfile** vs native flavor. Check `getConfig()`, `.env` used in that job, and native `applicationId`.
5. **Compile-time defaults** (all **off** for risky). Don’t treat “no fetch” as **all true**.
6. **Use `getConfig().apiBaseUrl`**. Add a lint/CI grep for hardcoded hosts / raw `process.env` in features.

## Application

1. Flavors/schemes + compile-time + typed module; staging/prod separated; private secrets off-device or secure native; remote flags for risky kill without store when appropriate.
2. `{ env, apiBaseUrl, deepLinkHost, flags: { newQr: boolean } }`.
3. **URL:** config. **Publishable:** usually client-ok. **Secret / signing:** never JS. **Crashlytics id:** public-by-nature. **NEW_QR false:** compile-time default.
4. **…must not ship a staging `API_BASE_URL` (or staging Firebase) in the prod flavor.**
5. **…must not read raw env or hardcode hosts in domain/screens — `getConfig()` only.**
6. **Compile-time default false**; **remote** can enable/%; **hope** = always-on in prod with no gate.

## Interview questions

1. **Spoken:** Flavors/schemes for identity and compile-time config, plus a small typed config module. Staging and prod clearly separated. Private secrets off-device or secure native storage flows. Risky features: remote flags to disable without store review when appropriate.  
   **Follow-ups:** IDs = side-by-side + Keychain/push. Never privileged secrets or signing passwords in `.env`/JS.

2. **Spoken:** Build-time for **which world** (URL, ID, Firebase). Runtime for **kill switches and rollouts**. Flags don’t replace flavors; flavors don’t replace Friday kill switches.

3. **Spoken:** Ship **gated** (`default false` + remote). Watch metrics; disable remotely. Don’t bake “always on” into the prod `.env` as the only control.

4. **Spoken:** **Different applicationId/bundle ID**, different icons, matching `.env`/Firebase per flavor so both install.

5. **Spoken:** If **tokens + flavor config** exist, it’s **config/assets**, not a fork. If hex and IDs were never abstracted, 6 weeks is a **fork or a token sprint first** — don’t pretend `.env` alone white-labels.

## Connections

1. Shell **owns the door** (`getConfig`). This unit **defines** what’s behind the door and **what must never** be there.
2. Extra brand = **flavor assets + token swap**, not a second hex universe. Flavors still supply **IDs/URLs**.
3. **Hostnames** in config must match **that** app’s entitlements. Staging app shouldn’t claim prod universal links.
4. **Assume the binary is readable.** Pinning protects **transport**; it does **not** hide a secret you **put in JS**.
5. Folders/DTOs are **code shape**. This is **which world the binary is** and **what you may ship inside it**.
