# Hermes

## What you need to know

**Hermes** is a **JavaScript engine** built for **React Native on mobile**: it **compiles JS to bytecode ahead of time** (especially in **release**), is tuned for **startup (TTI)** and **memory**, and is the **usual default** in modern RN. It is **not** Metro, **not** Fabric, and **not** “the New Architecture.”

It runs on the **[JS thread](../4.%20threads/notes.md)**. Faster parse/compile does **not** fix a huge React tree, an unvirtualized list, or a blocking native call.

Curriculum this unit completes:

- What Hermes is vs JSC / V8 / Chrome
- AOT bytecode and why TTI moves
- Memory / GC (high level)
- Debug vs JSC (high level)
- It’s usually default — when the topic still matters
- What to measure after enable/upgrade
- “Just enable Hermes” is not a perf strategy

---

## What an engine is here

The **engine** executes your bundle: parse/compile (or load bytecode), run JS, GC.

| Engine | Typical story |
| --- | --- |
| **Hermes** | RN-first; **bytecode**; mobile TTI/memory |
| **JSC** (JavaScriptCore) | Historical iOS (and older Android) default |
| **V8** | Chrome/Node world; not RN’s default mobile engine |

Your **source** is still JS/TS that **Metro** bundles. Hermes is **how that JS runs on device**, not the bundler (next unit).

```text
TypeScript/JS  →  Metro bundle  →  [release] Hermes bytecode (.hbc)
                                      →  Hermes runtime on JS thread
```

---

## Bytecode and TTI

**Problem Hermes targets:** on cold start, **parsing and compiling** a large JS bundle on a phone is **expensive**. JSC-style “parse source at launch” pays that tax **on device, on the JS thread**, before the app is interactive.

**Hermes (release):** compile to **bytecode ahead of time** (build time). At launch the engine **loads bytecode** instead of parsing the whole program from source. That usually **improves TTI** (time to interactive — native process start → first interactive frame, not “Metro finished”).

**Dev vs release:** debug often **does not** behave like a store build (no full bytecode optimizations, extra invariants). **Never** quote Hermes TTI from a debug session as production proof. Confirm **release** actually ships **precompiled bytecode**, not only `hermes_enabled: true` in a config file nobody verified.

Bytecode helps the **bundle/parse** bucket of startup. It does **not** delete:

- Giant root providers / eager SDK init
- Network on the critical path
- First-screen **render** cost

---

## Memory

Hermes is tuned so **heaps stay smaller** on RAM-poor phones. **GC pauses** can still **feel** like a JS stall ([threads](../4.%20threads/notes.md)) if you **allocate hard** (huge lists of objects, parse-and-hold megabyte JSON).

“Better memory” ≠ “leaks went away.” You still profile **allocations**. Hermes is a **better default engine**, not a leak sanitizer.

---

## Debugging vs JSC (high level)

You do not need a Safari vs Chrome trivia dump. You need:

- Tooling **differs**: Hermes is usually **RN DevTools / Chrome-like** debugging; JSC was more **Safari/WebKit** flavored on iOS historically.
- After an engine switch/upgrade, **debugger attach, source maps, and profiling** (Hermes sampling profiler) may change. That’s why the follow-up includes **tooling**.
- **Semantics:** Hermes is not Chrome. Rare **engine-specific** bugs exist (historically Intl and other gaps; **test on Hermes release**, don’t assume desktop Node).

---

## It’s usually default — why mention it anyway

Interviewers still ask because:

- You might **upgrade** RN/Hermes and need **metrics**.
- A **legacy** app might still be on JSC.
- Stakeholders say **“just enable Hermes”** as a substitute for profiling ([01-fundamentals](../01-fundamentals.md) senior Q).

If the stack is already Hermes + recent RN, spend interview time on **measure TTI / memory / crashes**, not reciting the homepage.

---

## What to check after enable or upgrade

Preserved follow-up:

- **Startup / TTI** (release, real devices — include a **low-end Android**)
- **ANRs / crashes** (Hermes-incompatible native/JS paths, ProGuard + engine)
- **Memory**
- **Debugger / profiler** still works for the team

Do **not** ship the flag unmeasured. Rare incompatibilities show up in **release** (CI, `11-cicd-releases.md`).

---

## Common mistakes and misconceptions

- **“Hermes = New Architecture / JSI / Fabric.”** Engine vs renderer/modules.
- **“Hermes = Metro.”** Metro **produces** the bundle; Hermes **runs** it (and compiles bytecode in release).
- **“Hermes makes everything faster.”** It helps **parse/startup/memory** on average. It does **not** fix an unvirtualized list or JS-driven per-frame animation.
- **“Debug TTI = production TTI.”** False.
- **“Config says Hermes so bytecode ships.”** Verify the **release artifact**.
- **“Chrome DevTools semantics = Hermes.”** Test on device engine.

---

## Connections to other concepts

`Metro bundles JS → Hermes (bytecode) executes on JS thread → React → native UI`

- **[Threads](../4.%20threads/notes.md):** Hermes **is** the JS engine on that thread; GC/parse still **block JS**.
- **[New Architecture](../3.%20new-architecture/notes.md):** orthogonal; you can be Hermes-on / New-Arch-off (and the reverse in odd setups).
- **[Bridge](../2.%20bridge/notes.md):** engine doesn’t remove serialization; it runs the **JS side** faster to start.
- **Metro** (next section): who **emits** the bundle/bytecode pipeline.
- **Performance chapter:** Hermes sampling profiler; TTI buckets.

---

## Interview perspective

You should be able to:

1. Define Hermes as the **RN JS engine** + **bytecode**.
2. Separate it from Metro and New Architecture.
3. Name **TTI + memory** as the usual wins — with **measure**.
4. List **metrics** after enable/upgrade.
5. Push back on **“just enable Hermes”** as the fix for an unmeasured jank ticket.

Preserved spoken answer:

> Hermes is a JavaScript engine optimized for React Native. It compiles to bytecode and is tuned for mobile startup and memory constraints. In practice it usually improves TTI and resource usage versus older engine setups, which matters for production apps with cold-start expectations.

**Follow-up — metrics:** startup time, ANRs/crashes, memory, and any native debugger tooling changes.

**“Just enable Hermes” (staff pushback):**

> I’d ask which metric we mean — TTI, JS FPS, memory — and whether we’ve profiled. Hermes is usually a good default for parse/startup and often memory. It does not fix a slow render tree, an unvirtualized list, or a blocking native call. I’d enable/keep Hermes, but I would not sell it as the fix for an unmeasured problem.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
