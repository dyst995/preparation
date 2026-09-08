# Debugging toolkit

## What you need to know

Senior RN debugging is **classify first, then pick a tool** — not “I opened Flipper.” Split **JS vs native**, **dev vs release**, **one device vs fleet**.

Preserve this map:

| Problem | Start here |
| --- | --- |
| Wrong UI / props / re-renders | **React DevTools** |
| JS exceptions in **dev** | **LogBox** / **RN DevTools** |
| Android **native** crash | **Logcat** + **Crashlytics** stack |
| iOS **native** crash | **Xcode** device logs + **symbolicated** Crashlytics |
| Perf FPS / JS lag | **Perf Monitor** + list profiling + why-did-you-render (**carefully**) |
| **Prod-only** bug | **Release** build, staging parity, feature flags, Crashlytics **breadcrumbs** |

**React Native DevTools** is the **modern** JS/Hermes debugging direction. **Flipper** is **legacy awareness** — many teams left it; don’t pretend it’s required in 2026.

This unit is **which tool**. Deep perf workflow: [06-performance.md](../06-performance.md). Release lanes: [11-cicd-releases.md](../11-cicd-releases.md). Threads: [4. threads](../4.%20threads/notes.md).

---

## Dev JS: LogBox, console, RN DevTools

**LogBox / `console`:** redbox, yellowbox, your logs. Fine for **dev** JS throws. **Not** how production looks — release has **no** redbox; uncaught JS may **die silently** or hit an Error Boundary / Crashlytics.

**React Native DevTools:** modern attach for **breakpoints**, Hermes, component inspection overlapping React DevTools. Use this, not “Chrome debugger that moved JS off-device” (old remote-debug **lies** about perf and sometimes **behavior**).

**React DevTools:** **tree, props, hooks, Profiler** (“why did this render”). First stop for **wrong UI** that isn’t a crash.

**why-did-you-render:** noisy; **targeted** on a hot screen, not left on in a shared debug build forever.

---

## Flipper (legacy)

Interview: “We used Flipper; **current RN points at RN DevTools**.” If a company still has Flipper, you can **navigate it**; you don’t **require** it in your playbook.

---

## Native: Logcat, Xcode, symbolication

JS stack in Crashlytics ≠ **SIGABRT in libc**. **Classify**:

- **JS:** Hermes/JS frames, your `src/` names (if source maps uploaded).
- **Native:** `libreactnative`, your Kotlin/ObjC, a vendor `.so`.

**Android:** Logcat while reproducing; **mapping.txt** / R8 for release names. **iOS:** device Console; **dSYMs** so Crashlytics isn’t `0x0000…`.

Without **symbolication**, native stacks are **unusable**. CI must **upload dSYMs / mapping** — that’s debugging **infrastructure**, not a nice-to-have.

---

## Production: Crashlytics and release-only

**Crashlytics:** crashes **and** (if wired) **non-fatal** JS, **breadcrumbs** (last screens, `log`, custom keys). **Segment** by **app version, OS, OEM** — aggregate crash-free % **hides** one Samsung Android 12 spike.

**Prod-only** means you **stop reproducing in debug**:

- `__DEV__` paths, Metro, unoptimized Hermes
- R8/ProGuard stripping
- **prod API** / flags
- **TestFlight / Play internal track** / `--variant release`

Match **app version**. Then: race vs bad **data** vs **upgrade** (lockfile/RN bump).

**Staged rollout** after the fix so the next crash cluster is small.

---

## Perf: don’t start in LogBox

**Perf Monitor:** **JS FPS vs UI FPS** ([threads](../4.%20threads/notes.md)). Then Profiler or Instruments — **not** `console.log` in `render`.

**Never trust debug FPS** as the customer number ([Hermes](../5.%20hermes/notes.md) bytecode, extra invariants).

why-did-you-render **carefully**: it can **cause** the jank you’re measuring.

---

## Common mistakes and misconceptions

- **Guessing “RN is slow”** without JS vs UI vs native crash.
- **Debug-only** repro for a TestFlight bug.
- **Flipper as the identity** of an RN engineer.
- **unsymbolicated** native stacks as “unreproducible.”
- **LogBox in prod** (it isn’t there).
- Remote Chrome debug as **truth** for timing.
- why-did-you-render **always on**.

---

## Connections to other concepts

`classify JS | native | UI-thread → tool from the table → release if prod-only`

- **[Threads](../4.%20threads/notes.md):** FPS split; JS stall vs ANR.
- **[Hermes](../5.%20hermes/notes.md):** sampling profiler; release ≠ debug.
- **[Metro](../6.%20metro/notes.md):** `__DEV__`, no Fast Refresh in prod.
- **[New Architecture](../3.%20new-architecture/notes.md):** native module crashes vs JS.
- **CI:** dSYM/mapping upload is **how** Crashlytics becomes readable.

---

## Interview perspective

You should be able to **fill the table from memory** and walk a **prod crash** without naming ten products.

Preserved spoken answer:

> First classify JS vs native from the stack. Reproduce on a release build with matching app version. Use Crashlytics breadcrumbs/logs, device/OS segmentation, and recent release diffs. If native, symbolicate and open the relevant Android/iOS project. If JS, trace the feature path, add guarded logging if needed, and verify whether it’s data-dependent, racey, or upgrade-related. Ship via staged rollout when possible.

Add: “Wrong UI → React DevTools. Dev JS exception → LogBox/RN DevTools. I don’t use debug perf as customer proof.”

Staff line from this chapter: **classify → reproduce on the right build → right tool → fix → re-measure / staged ship.**

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
