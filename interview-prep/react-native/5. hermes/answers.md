# Hermes — Answers

## Core recall

1. A **JS engine** built for RN: **bytecode**, tuned for **mobile startup and memory**. Executes your bundle on the JS thread.
2. **Release:** compile to bytecode **at build time**; device **loads bytecode**. Without that, the engine **parses/compiles source on device** at launch (the old expensive path).
3. **Time to interactive** — process start to **first interactive frame**, not “Metro served a file.”
4. Any two: faster **startup via bytecode**, **memory**, engine tuned for RN, matches **modern defaults**.
5. **Metro:** bundle/transform/resolve. **Hermes:** **run** JS (and compile bytecode in release).
6. **Two JS engines.** Not renderer, not native modules.
7. **Startup/TTI, ANRs/crashes, memory, debugger/tooling.**
8. **Usually default now** — still asked on upgrades, legacy JSC, and “just enable it” debates.

## Explain why

1. Bytecode removes **launch parse/compile**. Mid-session FPS is **React/layout/Bridge**, which bytecode doesn’t rewrite.
2. The flag can be on while CI still packs **source**. TTI win is the **artifact**.
3. GC runs on/with the **JS engine**; a pause **stalls JS** (taps/React) even if native scroll continues.
4. It overclaims. Hermes is **one** startup/memory lever. Unmeasured jank is often **render/lists/native**.
5. Different **devtools** (Hermes/RN DevTools vs historical JSC/Safari). Attach and source maps can break until updated.
6. Congestion is **JS↔native messages**. Hermes doesn’t delete the Bridge/JSI **crossing**.

## Compare and contrast

1. **Hermes:** RN bytecode/TTI/memory. **JSC:** older default engine, different debug story.
2. **Bundler vs runtime.**
3. **Engine vs** renderer/module system. Independent flags in principle.
4. **Debug:** extra checks, often no full AOT. **Release:** bytecode, the numbers that matter.
5. **Parse** = engine starting the program. **Render** = React walking components — Hermes on doesn’t shrink a 2000-node first screen by itself.
6. Smaller **typical** heap vs **your** retained objects/leaks still grow.

## Predict the output

1. **Little/no parse-time TTI win** — you didn’t ship the compilation model you enabled in YAML.
2. **No.** Debug is the wrong benchmark. Compare **release** builds.
3. **Jank remains** (or barely moves). Need **virtualization**, not a new engine.
4. **Debugger/tooling mismatch** — expected; update the Hermes/RN DevTools path, don’t assume JSC Safari.

## Debugging

1. Ask **which metric**; profile. Keep/enable Hermes as a **good default**; don’t sell it as the fix for unmeasured FPS. Lists/native/render still exist.
2. **Release-only / Hermes-incompatible path**, ProGuard + engine, Crashlytics **release** stack — not debug JSC behavior.
3. **Synchronous JS work** — still on the JS thread. Split/defer parse.
4. Hermes isn’t a leak detector. **Allocation/retention** still yours.

## Application

1. TS/JS → **Metro bundle** → **Hermes bytecode (release)** → **Hermes runtime** on JS thread.
2. Startup, ANRs/crashes, memory, debugger/tooling.
3. “Hermes is our JS engine because AOT bytecode and mobile memory/TTI beat parse-on-device. We still measure release TTI and don’t treat it as New Architecture.”
4. “Hermes is the right default for startup/memory; we still profile the actual jank.”

## Interview questions

1. **Spoken:** JS engine for RN; bytecode; tuned for startup and memory; usually better TTI vs older engines — matters for cold start.  
   **Follow-ups:** TTI, ANRs/crashes, memory, debugger. Not Fabric/JSI.

2. **Spoken:** Less parse/compile on device at launch by loading **precompiled bytecode** in release.

3. **Spoken:** Which FPS/TTI? Measure. Hermes won’t fix FlatList/`ScrollView` maps. Enable it anyway if missing; don’t stop there.

4. **Spoken:** Inspect the **release artifact** (bytecode present), not only config; measure TTI on a **release** device build.

5. **Spoken:** Crashes/ANRs, memory, that the team can still **debug/profile** on Hermes.

## Connections

1. Hermes **is** what executes on the JS thread; its pauses **are** JS-blocked symptoms.
2. Metro **emits**; Hermes **executes** (and AOT-compiles in release).
3. Different layers; Hermes default ≠ New Arch on.
4. Eager native SDKs, blocking network, huge first **React** tree.
5. GC pause ≈ JS stall: taps/React late, native scroll may continue.
