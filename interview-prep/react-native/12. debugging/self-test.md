# Debugging toolkit — Self-test

## Core recall

1. Recite the six-row “problem → start here” table (short).
2. What is React Native DevTools vs Flipper in 2026-shaped interviews?
3. What is React DevTools for vs LogBox?
4. Android native crash — first two tools?
5. iOS native crash — why “symbolicated”?
6. Where do you start for FPS / JS lag (not LogBox)?
7. What does “prod-only” force you to reproduce on?
8. Why upload dSYMs / R8 mapping in CI?

## Explain why

1. Why classify JS vs native **before** picking Xcode vs React DevTools?
2. Why is a debug repro insufficient for a TestFlight crash?
3. Why can remote Chrome JS debugging lie about performance?
4. Why segment Crashlytics by OEM/OS, not only global crash-free %?
5. Why is why-did-you-render dangerous if left on?
6. Why doesn’t LogBox exist as the user’s prod UI?

## Compare and contrast

1. React DevTools vs RN DevTools vs LogBox
2. Flipper vs RN DevTools
3. Logcat vs Crashlytics
4. JS exception vs native crash vs ANR
5. Dev `__DEV__` debugging vs release
6. Perf Monitor vs React Profiler vs Instruments

## Predict the output

1. Crashlytics stack is `libsomething.so` + `abort`, no `src/`. JS or native first hypothesis? Explain.

2. Stack shows `FooScreen.tsx` after source maps. Which world? Next reproduce step?

3. Works in Metro debug, dies on Play internal track. Name two release-only causes.

4. Client “frozen”; Perf Monitor JS FPS ~0, UI FPS high, native scroll still moves. Which unit’s diagnosis, which tool next?

## Debugging

1. Interviewer: “I always open Flipper.” How do you answer without insulting a Flipper shop?

2. Native iOS crash is `0x102ab…` only. What’s missing?

3. “Can’t reproduce” from support. What four facts do you collect before writing code?

4. They profiled FPS in debug and shipped `memo` everywhere. What’s wrong with the process?

## Application

1. Fill: wrong props → ? ; Android native crash → ?

2. Write the first four steps of a prod crash (classify → …).

3. When do you add a Crashlytics breadcrumb vs `console.log`?

4. One sentence: staged rollout after a crash fix.

## Interview questions

1. How do you debug a production-only crash?  
   **Follow-ups:** JS vs native? Why release build? Flipper?

2. Walk the tool table for “wrong UI” vs “Android crash” vs “jank.”

3. How do you investigate “the app feels slow”?

4. What’s your playbook for a crash that only happens on one OEM?

5. How do you debug without a redbox in production?

## Connections

1. How does the threads unit tell you whether Perf Monitor is the right first pane?
2. How does Hermes/source maps change a “JS” Crashlytics frame?
3. How is Metro `__DEV__` a prod-only footgun?
4. How do native modules show up as Logcat vs JS?
5. What must CI upload for this toolkit to work in prod?
