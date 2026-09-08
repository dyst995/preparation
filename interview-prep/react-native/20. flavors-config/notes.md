# Environments, flavors, and config

## What you need to know

The [app shell](../16.%20app-shell/notes.md) **reads** typed config. This unit is **how that config is produced**: **which backend**, **which app identity**, **what may live in JS**, and **what you can change after the store ships**.

Topics:

- **dev / staging / prod** backends
- Separate **bundle IDs / applicationIds** for **side-by-side** installs
- **`.env` strategies** and what must **not** go in env (**secrets**)
- **Build-time vs runtime** config
- **Feature flags / remote config** for risky rollouts

**Belongs in config:** API base URLs, feature-flag **defaults**, analytics keys that are **public by nature**, deep-link hostnames.

**Does not:** private API secrets that **grant privileged access**; **raw production signing passwords** in JS; **anything catastrophic if extracted from the bundle**.

The JS bundle is **not a vault**. Anyone can unpack an APK/IPA and read strings. “It’s in `.env`” still means **it shipped to the device**.

This unit is **env + flavors + flags**. **CI signing**, **pinning**, and the **legacy playbook** are other files. Don’t recite Fastlane if you cannot say **why a Stripe secret key must not be in `react-native-config`**.

Preserve the spoken answer:

> I use build flavors/schemes for platform identity and compile-time config, plus a small typed config module. Staging and prod are clearly separated. Secrets that must remain private stay off-device or in secure native storage flows. For risky features I prefer remote flags so I can disable without waiting for store review when appropriate.

---

## Why three backends (and why mixing them is an incident)

| Env | Typical use |
| --- | --- |
| **dev** | Local / ephemeral API, debug tools, fake payments |
| **staging** | Shared pre-prod, real-ish data, QA, store **internal** tracks |
| **prod** | Real customers, real money |

A **prod binary talking to staging** (or the reverse) is a **data and compliance** incident: test cards on real users, or **production PII** on a shared staging laptop. Architecture’s job is to make that **hard**: flavor **binds** `API_URL` at **compile** time, typed `getConfig()`, CI that **fails** if a prod scheme points at staging.

Features call `getConfig().apiBaseUrl`. They do **not** `process.env.API_URL` inside `model/` or hardcode `https://api.prod...` in a screen.

---

## Flavors / schemes: identity, not just a URL

**Flavor (Android `productFlavors`) / scheme or configuration (iOS):** a **named build** with its own **applicationId / bundle ID**, icons, Google/Firebase files, and **compile-time** defines.

**Side-by-side installs:** `com.company.easypay` vs `com.company.easypay.staging`. QA can keep **prod and staging on one phone**. Same bundle ID → **install replaces** the other app; you cannot compare.

Also different IDs ⇒ **separate** push tokens, Keychain/keystore entries, OAuth redirect URLs, universal-link entitlements. That is **why** identity is **native**, not only a JS string.

```text
easypay (prod)     applicationId: com.company.app
easypayStaging     applicationId: com.company.app.staging
```

**White-label (preview):** extra flavors + [tokens](../18.%20design-system/notes.md), not a **forked repo**, if you planned the seam. Full white-label timeline is an interview follow-up, not this unit’s core.

---

## `.env` is still the bundle

Tools (`react-native-config`, Babel `inline`, Expo extras) **inline** values into JS **at build**. Useful for **URLs and public keys**. They do **not** become secret by sitting in a gitignored file.

**Safe in env / typed config (public or low-privilege):**

- `API_BASE_URL`
- `DEEP_LINK_HOST`
- Flag **defaults** (`NEW_QR_ENABLED=false`)
- Analytics / Crashlytics **app** keys that are **meant** to be in the client (they identify the **app**, not a **god-mode** API)

**Must not:**

- **Private** API keys that **mint money**, bypass auth, or read **all** customers
- **Signing** passwords, `keystore` PINs, App Store Connect / Play **tokens**
- Refresh-token **seeds**, HMAC secrets, **admin** endpoints baked as “the key”

Those stay **off-device** (backend) or in **secure native** flows the user **unlocks** (session from [auth + secure storage](../17.%20nav-architecture/notes.md)) — never as `SECRET=...` shipped in the binary.

```ts
// app/config.ts — typed door (shell)
export type AppConfig = {
  env: 'dev' | 'staging' | 'prod';
  apiBaseUrl: string;
  deepLinkHost: string;
  flags: { newQr: boolean };
};

export const config: AppConfig = {
  env: Config.ENV as AppConfig['env'],
  apiBaseUrl: Config.API_BASE_URL,
  deepLinkHost: Config.DEEP_LINK_HOST,
  flags: { newQr: Config.NEW_QR_ENABLED === 'true' },
};
```

---

## Build-time vs runtime

| | **Build-time** | **Runtime** |
| --- | --- | --- |
| **When set** | Compile / CI (`ENVFILE=.env.staging`) | After install: remote config, flags API, maybe a cached file |
| **Good for** | Which **backend**, bundle ID, which Firebase plist, **cannot** accidentally mix if CI is correct | **Kill switches**, % rollouts, copy, non-identity experiments |
| **Cannot do** | Change prod API URL **without** a new binary | Replace **bundle ID** or **signing** |

**Risky payments / KYC:** ship **behind a remote flag** with a **safe default `false`** in compile-time config. If the flag service is down, you **do not** enable the risk. [Boot](../16.%20app-shell/notes.md): **don’t** infinite-splash on remote config; **timeout + defaults**.

Runtime flags **do not** replace flavors. A flag cannot give you a **second icon** and **side-by-side** ID. A flavor cannot **turn off** a crashing payment module **today** without a store train — **unless** you already gated it remotely.

---

## How it appears when something goes wrong

| Symptom | Likely cause |
| --- | --- |
| Staging data in “prod” app | Wrong **flavor** or `.env` in the **prod** CI job |
| Can’t install staging next to prod | **Same** applicationId |
| Secret leaked in a blog “APK secrets” post | It was in **JS env** |
| Feature still on after “we disabled it” | Only a **build-time** flag; need **remote** or a **hotfix binary** |
| Infinite splash | Runtime config with **no timeout** |

---

## Common mistakes and misconceptions

- **“`.env` is gitignored so it’s secret.”** Reviewers and the **binary** still see it.
- **One bundle ID**, switch URL with a hidden gesture — easy to **ship the wrong URL**; no side-by-side.
- **Hardcoded prod URL** in a feature “just for now.”
- **Remote config as the only** env strategy — first launch / offline / MITM of flags. **Defaults** still compile-time.
- **Putting signing passwords** in `.env` that Metro bundles.
- **Analytics key = secret.** Some keys are **public by design**; **payment processor secret keys** are not.
- Answering **only** “we use `.env`” with **no** flavors and **no** secret rule.

---

## Connections to other concepts

`flavors (identity + compile-time URL) → typed app/config → features call getConfig()`  
`defaults + remote flags → kill switch without store`

- **[App shell](../16.%20app-shell/notes.md):** `getConfig()`; remote config **must not** block boot forever.
- **[Design tokens](../18.%20design-system/notes.md):** extra **brand** via tokens + flavor **assets**, not hex in 90 files.
- **[13-security.md](../13-security.md):** what “catastrophic if extracted” means; pinning is **transport**, not a substitute for “don’t ship the admin key.”
- **[11-cicd-releases.md](../11-cicd-releases.md):** which job builds which flavor; signing **in CI**, not in JS.
- **[Nav / deep links](../17.%20nav-architecture/notes.md):** **hostnames** in config; **prod** links must not open the **staging** app (different IDs/entitlements).

---

## Interview perspective

They want **separation of staging/prod**, **typed config**, **honest secret model** (bundle is public), and **flags** for **risky** features. Recite the spoken answer, then one example: **side-by-side IDs**, one example: **no private key in `.env`**.

**Q: How do you manage environments in RN?** — use the preserved answer above.

Follow-ups: **Why different bundle IDs?** Side-by-side, separate Keychain/push. **Can I put the Stripe secret in `.env`?** No — extractable; secret stays on **server**. **How do you kill a bad feature on Friday?** Remote flag if you shipped one; otherwise you’re on **store review**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
