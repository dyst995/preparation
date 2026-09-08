# Deep linking and universal links

## What you need to know

[Params vs fetch](../37.%20params-vs-fetch/notes.md) said links carry **ids**. This unit is **how the OS hands a URL to React Navigation**, how **`linking` mirrors the nested tree**, and **auth + security** around private screens.

**Learn:**

- **URL schemes** vs **universal links / App Links**
- React Navigation **`linking` config**
- Mapping **path → screen hierarchy**
- Waiting for **auth hydration** before resolving **private** links
- **Fallback** when the target is invalid
- **Testing** on iOS / Android
- **Security:** don’t trust link params blindly

**Mental map (preserve; arrows are the hierarchy):**

```text
myapp://transfers/123        → AppTabs → TransfersStack → TransferDetails(id=123)
https://app.example.com/qr  → QR payment flow
```

**Auth + deep link sequence (preserve):**

1. App opens via link
2. Parse URL
3. If not hydrated: **wait**
4. If not authenticated: **store intended URL** / login, then continue
5. If authenticated: **navigate** to target
6. **Validate permissions** for the target resource

**Q: How do deep links work in RN?**

> The OS opens the app with a URL. React Navigation’s linking config maps path patterns to screens in the navigator tree. I configure prefixes, screen paths, and parse params. For private screens I ensure auth hydration and authorization before navigating.

**Q: How do you test deep links?**

> On Android via `adb shell am start` with an intent URI; on iOS via `xcrun simctl openurl` or universal link setup. I also test cold start, warm start, and logged-out scenarios.

**Push → screen** is next. Same **id + hydrate** rules; different **payload**.

---

## URL schemes vs universal / App Links

| | **Custom scheme** (`myapp://`) | **Universal Links** (iOS) / **App Links** (Android) |
| --- | --- | --- |
| **What** | App-registered scheme | **`https://`** host the **OS verifies** (`apple-app-site-association` / `assetlinks.json`) |
| **If app missing** | Often **nothing** / another app **claimed** the scheme | **Browser** opens the page |
| **Spoofing** | Weaker — **any** app can try `myapp://` | Stronger — **domain association** |
| **Interview** | Fine for **dev** and **in-app** | **Production** emails/SMS/`https` QR |

You usually support **both** prefixes in `linking.prefixes`. **QR pay** is often **https** so a **non-user** still sees a **web** fallback.

**Not:** “HTTPS link = user is authorized.” It only means **this app may open**. **Step 6** is still **your API**.

---

## `linking` config maps the **tree**

**One** `NavigationContainer` ([building blocks](../33.%20nav-building-blocks/notes.md)). `prefixes` + nested `screens` **indent like** [nested architecture](../34.%20nested-nav-architecture/notes.md).

```ts
linking: {
  prefixes: ['myapp://', 'https://app.example.com'],
  config: {
    screens: {
      AppTabs: {
        screens: {
          TransfersStack: {
            screens: { TransferDetails: 'transfers/:id' },
          },
        },
      },
    },
  },
}
```

**Path `transfers/:id`** is **not** global. It is **under** `AppTabs → TransfersStack`. A **flat** `TransferDetails: 'transfers/:id'` at Root **misses** the tab/stack — **wrong screen** or **not handled**.

`:id` becomes **`route.params.id`**. Keep it an **id** ([params vs fetch](../37.%20params-vs-fetch/notes.md)). Don’t map `?amount=99999` as **authority**.

**`getInitialURL` / subscribe:** cold start vs **already running**. RN linking does this; you still **gate** on **hydrate**.

---

## Auth sequence (why wait)

Until [hydration](../35.%20auth-flow-patterns/notes.md), **Auth vs App doesn’t exist**. If linking **navigates immediately**:

- **Logged-out** user **lands on TransferDetails** (private UI **flash**) or **action not handled**
- **Logged-in** user **hits Login** then **bounces**

**Wait** (`!hydrated` → splash). Then:

- **No session:** **queue** the URL; show **AuthStack**; after login **replay** the link (same `linking` parse). **Don’t** `navigate('Home')` then **forget** the URL.
- **Session:** App tree **mounted** → linking can **resolve** nested screens.

**Step 6:** `GET /transfers/123` **403/404** → **not** “the URL said you’re the owner.” Show **fallback**, don’t **render** someone else’s **PII** from **query params**.

---

## Invalid target and fallback

| Failure | Do |
| --- | --- |
| Path **not** in config | **Home / NotFound** — don’t **crash** |
| `:id` **malformed** | Treat as **invalid**; don’t call API with **garbage** |
| Resource **404 / 403** | **Error screen** or **Wallet home** + copy |
| Screen **behind** a feature flag | Same as **unknown** |

**Don’t** `navigate` into **Confirm** with **only** link amounts. Invalid **money** links are **security**, not just UX.

---

## Testing (cold / warm / logged out)

**Android:** `adb shell am start` + **VIEW** intent + URI (`myapp://transfers/123` or `https://…`). **iOS:** `xcrun simctl openurl booted <url>` (scheme) and a **real** universal-link pass (associated domain).

**Three** launches:

1. **Cold** — process **killed**; `getInitialURL`
2. **Warm** — backgrounded; **subscribe** / new intent
3. **Logged out** — queue + **login** + **resume**

Plus: **invalid path**, **403 id**, **while splash**. A **green** path only from a **logged-in warm** app is **not** enough.

---

## Don’t trust link params

The URL is **attacker-controlled** (SMS, email, QR, another app).

- **Fetch** the resource; **authorize** on the **server**
- **Ignore** `amount`, `toAccount`, `userId` as **truth**
- **Don’t auto-submit** a payment because the path is `/pay`
- After login, **replay** only **allowlisted** prefixes/paths — **open redirect** via `?next=`

---

## Common mistakes and misconceptions

- **Flat** linking config vs **nested** navigators.
- Linking **before** `hydrated`.
- **HTTPS** confused with **authorization**.
- **Only** testing **warm + logged in**.
- **No fallback** — white screen on typos.
- **Trusting** query **amount**.
- Answering **`adb`** without the **six-step** auth sequence.

---

## Connections to other concepts

`OS URL → prefixes → nested path = tree → wait hydrate → xor Auth (queue) | App → fetch+authorize`

- **[Nested nav](../34.%20nested-nav-architecture/notes.md):** config **indent**.
- **[Auth flow](../35.%20auth-flow-patterns/notes.md):** **wait** + **queue**.
- **[Params vs fetch](../37.%20params-vs-fetch/notes.md):** **`:id` only**.
- **[Shell](../16.%20app-shell/notes.md):** container **inside** providers; linking **after** boot **knows** session.
- Next: **notifications** reuse this **router**.

---

## Interview perspective

They want **OS → linking tree**, **hydrate**, **`adb` / simctl`**, **cold/warm/logged-out**. Spoken answers **are** the two Qs. Add **step 6** unprompted if you can.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
