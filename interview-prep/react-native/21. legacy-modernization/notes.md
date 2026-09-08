# Legacy modernization playbook

## What you need to know

Earlier units are **what good looks like** (features, layers, shell, session trees). This unit is **how you get there without freezing the store**: a **spoken playbook** plus **CV mapping**. Interviewers who ask “how would you refactor this RN app?” are scoring **sequence and risk**, not a weekend folder rename.

Use this structure:

| Step | Name | One line |
| --- | --- | --- |
| **0** | **Characterize the patient** | Measure and name the pain **before** moving files |
| **1** | **Establish seams** | `features/` + **no new code** in legacy piles + lint if you can |
| **2** | **Strangle, don’t big-bang** | One **vertical slice** at a time; **ship every week** |
| **3** | **Stabilize platform** | Crashlytics, **CI/signing**, dead **native** deps |
| **4** | **Measure** | Crash-free users, **startup**, **conversion** — prove the work |

**CV map (preserve):**

- **MyCreditInfo:** outdated codebase → feature-based + **crash collapse** (~20% → ~0.03% in your prep numbers)
- **Wizer:** **ownership** + architecture + **native** capability (e.g. iOS preview)
- **Online School:** modernization + **deadline** ownership
- **EasyPay:** **green-field** — same seams **from day one**, not a strangler (the **contrast**)

This unit is **the playbook**. The [EasyPay-like tree](../02-architecture.md) you draw in 60s is the **next** section. Don’t skip Step 0 and jump to folders.

---

## Step 0 — Characterize the patient

You cannot prioritize **Stories vs Premium** until you know **what is killing users and what the business cannot break**.

| Look at | Why |
| --- | --- |
| **Crash rate, ANRs, startup** | Architecture work that **doesn’t** move these is a **folder tour**. Crashlytics **top stacks** tell you **hotspots**. |
| **God screens, dead dependencies** | 4k-line screens and unused native modules are **where** you cut first (or **delete**). |
| **OS + RN version** | You may need a **native patch** (MyCreditInfo) **before** a pretty `features/` tree compiles on new Android. |
| **Business-critical flows** | Payments / login / credit-report **must stay shippable**. Strangle **around** them, or **start** with the slice that is both **hot** and **bounded**. |

**Characterization** here also means: **write down** “login is 40% of crashes” vs “we hate `utils/`.” Step 0 is **evidence**. Skipping it is how teams **rewrite** a quiet module and **miss** launch crashes.

---

## Step 1 — Establish seams

A **seam** is a place you can **change one side** without rewriting the world (Feathers). In RN: a **feature folder + public `index.ts`**, and a rule that **new work does not grow `screens/` soup**.

- **Introduce `features/` gradually** — even **one** `features/auth` while the rest stays legacy.
- **Stop adding new code to legacy piles** — reviewable, later **lint** (`no-restricted-imports` / `eslint-plugin-boundaries` on `src/screens/**`).
- **Module boundaries** — the seam is **real** when CI **fails** a deep import, not when the README hopes.

Without Step 1, Step 2 is **copy-paste into parallel soup**.

```text
# After step 1 you might have
src/screens/          # frozen — no new files
src/features/auth/   # new work lives here
```

---

## Step 2 — Strangle, don’t big-bang

**Big-bang:** freeze product, rewrite on a branch for months, merge, pray. Misses dates; ships a **new** crash cluster; **no** weekly value.

**Strangler:** grow a **new** implementation **beside** the old, **route** one flow into it, **delete** the old path when it is unused. Name from the fig that **wraps and replaces** a tree.

- **One vertical slice** (curriculum: Stories, then Premium) — **UI + hooks + api + model** for **that** capability, not “all hooks this sprint.”
- **Shippable every week** — store trains **don’t stop**. That’s how modernization **is** a product job.
- **Characterization tests** when feasible — tests that **lock current behavior** of a god screen **before** you extract, so a refactor **fails CI** instead of **silent** fee/status bugs ([data/domain](../19.%20data-domain/notes.md)).

```text
Week N:   App still opens legacy Feed
          features/stories/ exists; one entry point routes to it
Week N+2: Feed gone from src/screens; stories is the only path
```

**Don’t** rename `components/` → `features/components` in one weekend and call it a migration.

---

## Step 3 — Stabilize platform

Folders don’t catch **native** death. After (and **during**) slices:

- **Crashlytics hygiene** — mapping/dSYMs, **meaningful** groups, boot crashes **visible** ([app shell](../16.%20app-shell/notes.md) init order). You **cannot** improve what you **don’t record**.
- **CI signing/release confidence** — a modern tree you **cannot ship** is not modernized ([11-cicd-releases.md](../11-cicd-releases.md)).
- **Remove unused native dependencies** — they **crash**, **block New Architecture**, and inflate the binary. Dead SDK = Step 0 hotspot.

Wizer’s **native preview** and MyCreditInfo’s **patched Android library** sit here: **stabilize the boundary**, don’t only shuffle JS.

---

## Step 4 — Measure

Architecture health is **not vibes**.

| Metric | Why it belongs in the story |
| --- | --- |
| **Crash-free users** (or crash rate) | MyCreditInfo / Wizer / Online School **headline** |
| **Startup** | Shell + deferred SDKs + less god-screen JS |
| **Key conversion** | You didn’t “fix crashes” by **breaking** pay / signup |

Prep numbers to **own** (from your CI/crash stories — say them as **yours**, not folklore):

- MyCreditInfo ~**20% → 0.03%**
- Wizer ~**15% → 0.09%**
- Online School ~**28% → 0.15%**

Tie **each** to **this playbook** (seams + strangler + **native/CI**), not “we used Crashlytics.”

---

## Map each CV app to a **different** sentence

| App | Playbook emphasis |
| --- | --- |
| **MyCreditInfo** | Legacy RN + **native** debt → **feature-based** strangler + **crash collapse** (measure) |
| **Wizer** | Took **ownership**; architecture **and** a **native** capability (preview), not folders alone |
| **Online School** | Same modernization **under a deadline** — strangler **because** big-bang would **miss** the date |
| **EasyPay** | **No patient** — green-field **Step 1 seams on day one**; you still **measure**, you don’t **strangle** |

If they only give you 90 seconds, pick **one** modernization (usually MyCreditInfo) and **run 0→4**, then **contrast EasyPay**.

---

## Common mistakes and misconceptions

- **Big-bang as the first answer.** Seniors **default** to strangler.
- **Step 2 without Step 0** — moving files that aren’t the crash hotspot.
- **“We modernized” = renamed folders** in a weekend.
- **No “no new code in legacy”** — soup **grows** while you extract.
- **Never measuring** — crash stories become **unfalsifiable**.
- **EasyPay told as a strangler.** It isn’t; it’s **prevention**.
- **Native/CI ignored** — JS `features/` with a **broken** pipeline and **dead** SDKs.
- Dumping the **whole** EasyPay tree when they asked **how you migrate**.

---

## Connections to other concepts

`why (risk) → type vs feature (target shape) → this playbook (how to move) → measure`

- **[Why architecture](../13.%20why-architecture/notes.md):** this is the **incremental migrate** test, fully sequenced.
- **[Type vs feature](../14.%20type-vs-feature/notes.md):** **target** of the strangler; EasyPay **starts** there.
- **[Feature layering](../15.%20feature-layering/notes.md):** a **vertical slice** includes **inner** DAG, not a new `screens/` pile named `features`.
- **[App shell](../16.%20app-shell/notes.md):** often an **early** slice — boot + Crashlytics — because **launch crashes** dominate Step 0.
- **[Nav architecture](../17.%20nav-architecture/notes.md):** you can strangle **AuthStack** first without rewriting payments.
- **Native / CI chapters:** Step 3 **is** those skills **in service of** the playbook.

---

## Interview perspective

**Walk through modernizing a legacy RN app** = **0 → 4** + **one CV name** + **one metric**. If they push “why not rewrite?”: **ship every week**, **risk**, **unknowns in god screens**.

Spoken (~60–90s, MyCreditInfo-shaped):

> I’d characterize first: crash rate, ANRs, startup, god screens, RN/OS version, and which flows we cannot break. Then I’d put seams in — features/ for new work, no new code in the old piles, lint if we can. I’d strangle one vertical slice at a time and keep shipping every week, with characterization tests where the risk is high — not a big-bang rewrite. In parallel I’d stabilize Crashlytics, CI/signing, and delete dead native deps. I’d measure crash-free users, startup, and conversion. That’s MyCreditInfo: outdated codebase to feature-based, and the crash rate came down with that discipline, not a freeze. EasyPay is the other side — we put those seams in on day one so we wouldn’t need this playbook.

If they ask Wizer: **ownership + native preview**, not only JS folders. Online School: **deadline** ⇒ strangler **because** rewrite **would slip**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
