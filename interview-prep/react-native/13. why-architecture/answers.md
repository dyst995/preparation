# Why architecture matters in RN interviews — Answers

## Core recall

1. **Where files go** / pretty trees. They’re scoring **team + risk over time**.
2. **Scale** a team; **ship** without breaking neighbors; **modernize** without big-bang; **separate** UI / domain / native; **onboarding & review**.
3. **EasyPay** greenfield; **Wizer / MyCreditInfo / Online School** modernization.
4. How much **unrelated code** a change (and a bug) can touch.
5. **Freeze + rewrite** vs **replace capability-by-capability** while shipping.
6. **UI:** screens/styles. **Domain:** fees/rules. **Native:** biometrics/SDK wrappers.
7. **Mid:** `screens/` + `components/`. **Senior:** **capability boundaries**, incremental migrate, public APIs.
8. **Next** section of `02-architecture.md` — this unit is **why**.

## Explain why

1. No **ownership**; everyone edits the same `utils/` / giant `components/`; conflicts and fear.
2. Localized change → **fewer accidental regressions** after crash/perf work.
3. Unfunded freeze; missed dates; **new** bug cluster; no incremental value.
4. Domain must be **testable and product-true** on both OS; OS is a **UI/native** concern.
5. Time-to-first-PR is **money**; seams are how people **find** work.
6. State libraries are **one plug**. They asked **seams and ownership**.

## Compare and contrast

1. **Names** vs **who can change what without fear**.
2. **Choose** seams on day one vs **cut** seams into soup while shipping.
3. **All-or-nothing branch** vs **strangle** a feature and keep releases.
4. **Type folders** scatter a feature; **capability** keeps it together (detail next unit).
5. **Render** vs **rules** vs **platform APIs**.
6. **Genuinely reused** vs **dumping ground**.

## Predict the output

1. **No cohesion / no boundary** — payments wasn’t a module; helpers were global.
2. **The five tests** — they think you only do cosmetics.
3. **Separate UI / domain / native** (and testability).
4. **Modernize without big-bang** — you froze the product.

## Debugging

1. **Blast radius** — extract a payments boundary so the next tweak is local.
2. **Type-based soup** / no capability home for auth.
3. **Fake shared** — belongs in `features/payments`.
4. **No incremental mechanism** — renaming isn’t modernization.

## Application

1. Scale team; localize ship; strangler migrate; UI/domain/native; faster onboard/review.
2. EasyPay: seams so a team can grow. MyCreditInfo: cut features out of soup **while** store trains ran.
3. `screens → hooks → api/model`; `native` at the edge; **no** feature internals hopping.
4. “Not folders — **risk and team**. Boundaries so we ship and migrate without a freeze.”

## Interview questions

1. **Spoken:** They’re testing scale, blast radius, incremental migrate, UI/domain/native, onboard/review — EasyPay and the modernizations are those moves, not a `src/components` tour.  
   **Follow-ups:** Map one app. Feature-based is **how**; this is **why**.

2. **Spoken:** Strangle by **capability**; keep shipping; don’t freeze for a rewrite.

3. **Spoken:** Payments owns its tree + public API; auth isn’t imported via internals; shared only if truly shared.

4. **Spoken:** Rules in **model**; SDKs behind **native/** or a module; UI composes.

5. **Spoken:** Feature-sized diffs, obvious owner, less “where does this go?” in review.

## Connections

1. `Platform.OS` in domain is the **layer** failure this unit names.
2. Feature folders + `index.ts` **are** the blast-radius implementation.
3. A “fix” that touches the world **reintroduces** crashes.
4. Turbo Module lives in **feature native**, not `utils/nativeStuff`.
5. Auth stack vs app stack is **shell**; you still needed **why seams exist**.
