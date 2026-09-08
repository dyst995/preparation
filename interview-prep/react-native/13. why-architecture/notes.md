# Why architecture matters in RN interviews

## What you need to know

Interviewers who ask about “project structure” are rarely grading your folder names. They are testing whether you can **run a team and a codebase over time**:

- **Scale** past one developer (ownership, less merge conflict soup)
- **Ship a feature** without breaking unrelated areas (cohesion, blast radius)
- **Modernize** a legacy RN app **without a big-bang rewrite**
- **Separate UI** from **business rules** and **native** details
- Make **onboarding and code review** faster (clear seams, smaller diffs)

Your CV already claims this: **EasyPay** from scratch, **Wizer / MyCreditInfo / Online School** modernization. This unit turns those lines into **explainable engineering**, not “we used folders.”

This unit is **why**. The **feature-based tree**, layering, and `index.ts` rules are the **next** sections of [02-architecture.md](../02-architecture.md). Don’t recite a 40-folder tree here if you can’t defend **risk**.

---

## What they are actually scoring

| They say | They mean |
| --- | --- |
| “How do you structure the app?” | Can two squads ship **without** stepping on `utils/`? |
| “How would you refactor this legacy RN app?” | **Incremental** boundaries, not a 6-month rewrite with no releases |
| “Where does this logic live?” | **UI vs domain vs native** — not `Platform.OS` in a fee calculator |
| “How do you keep quality up?” | Reviewable PRs, obvious **ownership**, tests that don’t boot the whole app |

A **mid** answer: “I put screens in `screens/` and components in `components/`.”  
A **senior** answer: “I draw **capability** boundaries so a payments change doesn’t require hunting five folders, and I can **strangle** a legacy screen without pausing the store.”

---

## Scale beyond one developer

One person can live in a junk drawer. **N people** need:

- A place that **owns** wallet vs auth
- **Public APIs** between features (so you don’t import `features/auth/screens/Login/internal/Foo`)
- Fewer **global** `components/` that everyone is afraid to touch

If your story is EasyPay greenfield: you **chose** seams early so the next hire doesn’t invent a second `utils`. If your story is Wizer/MyCreditInfo: you **introduced** seams into soup so squads could move.

---

## Ship without breaking neighbors

**Blast radius:** one feature’s PR should not rewrite `App.tsx`, three unrelated screens, and a 2k-line `helpers.js`.

Architecture is **how you localize change**. That’s regression risk (crash-rate work only sticks if the next feature doesn’t retangle the tree).

**Testability** follows: domain **without** rendering a navigator; UI **without** hitting production APIs.

---

## Modernize without big-bang

**Big-bang:** freeze product, rewrite in a branch for months, merge, pray. Interviewers have seen it **miss dates** and ship a **new** crash cluster.

**Incremental (strangler):** pick a **capability** (auth, then payments), wrap a **boundary**, replace internals, keep shipping store builds. Your modernization CV **only lands** if you can say this.

You do **not** need the full strangler playbook in this unit — you need: **why** architecture is the **tool** for that strategy.

---

## UI vs business rules vs native

Same split as [platform-specific](../8.%20platform-specific/notes.md) and fundamentals:

- **UI:** screens, Yoga, `Platform.select`
- **Domain:** fees, eligibility, validators — **no** `Platform.OS`, no `NativeModules`
- **Native:** biometrics, SDKs — **modules**, not `if (ios)` in a hook that also computes APR

Interviewers use architecture questions to see if you **repeat** that split at **folder and import** level, not only in a Flexbox answer.

---

## Onboarding and review

A new engineer should find **payments** in one tree, not `grep` across `screens` + `hooks` + `services`. Reviewers see a **feature-sized** diff, not a random `Button2.tsx` in `components/`.

That’s **speed**, not aesthetics.

---

## Common mistakes and misconceptions

- **“Architecture = folders.”** Folders are **how** you encode the decisions above.
- **“I’ll rewrite it properly next quarter.”** Unfunded big-bang.
- **“shared/ is for anything two screens touch.”** That’s how `shared/` becomes the new `utils/`.
- **CV name-drop without a mechanism.** “We modernized” needs **boundaries + incremental ship**.
- Answering with **Redux vs Zustand** when they asked **structure**. State is a later chapter; here it’s **seams**.

---

## Connections to other concepts

`interview signal → seams (feature, layer, public API) → next sections draw the tree`

- **[02-architecture.md](../02-architecture.md) §2:** feature-based vs type-based — the **shape** that implements this.
- **[Platform](../8.%20platform-specific/notes.md):** soup is an **architecture** smell.
- **[Debugging](../12.%20debugging/notes.md):** blast radius is how crashes **return** after a fix.
- **[New Architecture](../3.%20new-architecture/notes.md):** native lives behind a **feature `native/`**, not sprinkled imports.
- **State/navigation chapters:** they **plug into** shells and features; they don’t replace this.

---

## Interview perspective

You should be able to list the **five tests** without notes and map **one CV app** to each of: scale, blast radius, incremental migrate, layers, onboarding.

Spoken (30–60s):

> They’re not asking where files go. They want to know I can scale a team, ship a feature without breaking neighbors, modernize without a rewrite freeze, keep UI / domain / native separate, and make onboarding and review sane. That’s what EasyPay’s structure was for, and what the Wizer and MyCreditInfo migrations actually were — capability boundaries, not a new `components/` folder.

If they immediately ask “so folders?”: “Feature-based, next. The point is **cohesion and a public API**, not the names.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
