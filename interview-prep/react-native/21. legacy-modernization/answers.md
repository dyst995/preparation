# Legacy modernization playbook — Answers

## Core recall

1. **0 Characterize** → **1 Seams** → **2 Strangle** → **3 Stabilize platform** → **4 Measure**.
2. **Crashes/ANRs/startup**; **god screens / dead deps**; **OS + RN version**; **business-critical flows**.
3. **`features/` gradually**; **stop new code** in legacy piles; **lint / module boundaries**.
4. **One vertical slice**; **ship every week**; **characterization tests** on risky areas.
5. **Crashlytics hygiene**; **CI/signing** confidence; **remove unused native** deps.
6. **Crash-free users**; **startup**; **key conversion**.
7. **MyCreditInfo:** outdated → feature-based + crash collapse. **Wizer:** ownership + architecture + native. **Online School:** modernization + deadline. **EasyPay:** green-field done right day one.
8. **One capability** end-to-end (screens through api/model), not one **technical** layer across the app.
9. Soup **keeps growing**; you’ll never finish the migration.
10. **Lock current behavior** so an extract **doesn’t silently change** fees/states/UI contracts.

## Explain why

1. Without data you **move the wrong code** and can’t **prove** later. Critical flows tell you **what must keep shipping**.
2. **Unknowns** in god screens; **missed dates**; **new** crash cluster; **zero** weekly product value.
3. Business/store **don’t pause**. Modernization that **blocks** releases **will be cancelled** or rushed unsafely.
4. New features **re-tangle** the old tree; seams are **habits**, not a folder.
5. Humans forget. **CI** makes the seam **real**.
6. You **prioritize** (Step 0) and **prove** (Step 4) only if stacks are **readable**. Boot crashes especially.
7. They **crash**, **bloat**, and **block** upgrades / New Architecture — often Step 0 hotspots.
8. You might have “fixed” crashes by **breaking** the funnel. Architecture must not **hide** that.
9. There was **no** legacy soup to wrap — you **chose** seams **up front**.
10. A freeze-rewrite **misses** the date. Strangler **delivers** while you migrate.

## Compare and contrast

1. **Strangler:** new path beside old, **weekly ship**, delete old when unused. **Big-bang:** long branch, **merge bomb**.
2. **Seams:** **rules and first folders**. **Slice:** **move a flow** through the new path.
3. **MyCreditInfo:** **patient** + metrics. **EasyPay:** **prevention**.
4. Both architecture; Wizer stresses **owning native** (preview), not only JS features.
5. Tests **before** extract vs tests **promised** after a rewrite that **never** gets them.
6. Rename **doesn’t** change blast radius. **Stories** as a slice **does**.
7. Type-vs-feature = **destination tree**. This unit = **how to walk there** on a live app.
8. Shell = **boot sequence** you might **install as a slice**. Playbook Step 3 = **hygiene + CI + native deps** around that.

## Predict the output

1. Skipped **0–2’s shippable rule** (and usually 4). Merge: **date slip** and/or **new crashes**; no incremental value.
2. **Legacy grows**; `features/` is a **side museum**. Migration never ends.
3. Missing **0, 2 (real slices), 3, 4**. Rename ≠ strangler; **no metric**.
4. You optimized **folder aesthetics** instead of the **god screen** that **users** hit. Step 0 **ignored**.
5. EasyPay had **no** `screens/` soup to strangle. That’s **green-field**.
6. You **didn’t** watch conversion (or you **broke** pay while chasing crashes). Incomplete Step 4.

## Debugging

1. **Don’t freeze.** Characterize (that 20% **is** the brief), seams, **strangle a hotspot slice this week**, keep the train, measure. Rewrite **after** you can ship — usually **never** as step 1.
2. **No freeze on legacy piles** / no lint. Re-assert **no new code** in `components/`/`screens/`.
3. **Step 3** — remove dead native; it’s blocking **and** a crash risk.
4. **No Crashlytics hygiene** — you cannot do Step 0/4. Fix mapping/dSYMs **now**.
5. **Pinned** “this input → this fee/status.” Extract would have **failed CI** instead of **prod**.
6. No **0–4**, no **metric**, no **slice**. A Button is [design system](../18.%20design-system/notes.md), not modernization.

## Application

1. Characterize → seams → one slice/week + tests → Crashlytics/CI/native → crash-free/startup/conversion.
2. Outdated RN, high crashes, god screens → `features/` + freeze soup → slice (e.g. auth/feed) weekly → native patch/CI → **~20% → 0.03%**.
3. **Wizer:** owned the app, architecture **and** native preview. **Online School:** strangler **under deadline**. **EasyPay:** seams **day one**.
4. **PRs must not add new code under legacy `screens/`/`components/`/`utils/` dumps** (except strangler deletion).
5. **Tradeoff:** Login-first **stops the bleeding** (most crashes). Payments-first **protects revenue** if you can **contain** login with Crashlytics + a **thin** boot fix. A senior answer **names both** and picks with **Step 0**: e.g. **stabilize launch/login enough to ship**, then **payments slice** if that’s the **business** critical path — or login first if **unusable**. Don’t pretend there’s only one right slice.
6. **N:** entry routes to `features/stories`; legacy Feed still exists. **N+2:** only stories path; `screens/Feed` deleted.

## Interview questions

1. **Spoken:** Characterize (crashes, ANRs, startup, god screens, OS/RN, critical flows). Seams: `features/`, no new legacy code, lint. Strangle one slice at a time, ship weekly, characterization tests where risky. Stabilize Crashlytics, CI/signing, dead native. Measure crash-free, startup, conversion.  
   **Follow-ups:** Rewrite **freezes** value and **gambles** merge. **Numbers** + funnel — that’s how you show it.

2. **Spoken (pick one):** MyCreditInfo — outdated, **~20%** crashes, seams + slices + native patch, **~0.03%**. Wizer — **ownership**, architecture, **native preview**, **~15% → 0.09%**. Online School — **deadline**, strangler, **~28% → 0.15%**. Don’t list all unless asked.

3. **Spoken:** Tiny stable app, **few screens**, **low** cohesion pain — migration **cost > benefit** ([type-vs-feature](../14.%20type-vs-feature/notes.md) table). Still **measure**; don’t **invent** a playbook.

4. **Spoken:** **One** frozen legacy area; **one** growing `features/`; **lint**; **entry points** that **route** to the new slice. Two models are **temporary**; “no new legacy” **bounds** them.

5. **Spoken:** Legacy = **this playbook**. EasyPay = **same destination**, **no strangler** — Step 1 **on day one**, still **measure**.

## Connections

1. **Scale:** seams/ownership. **Ship:** weekly trains + slices. **Migrate:** Step 2. **UI/domain/native:** inner slice + Step 3. **Onboard:** one feature tree instead of soup.
2. A slice **is** a feature with **api DTO → mapper → model** and **screens → hooks**. You don’t strangle a **type** folder.
3. Mount **new AuthStack** behind `hydrated`; rest of app **legacy** until you cut wallet. Session **state** still **one** owner.
4. You **cannot** claim modernization if you **can’t ship** or **mix staging/prod**. Step 3 is **release + native** confidence.
5. **§10** is the **whiteboard target** (EasyPay-like). This unit is **how Wizer/MyCreditInfo walked toward something like it**.
