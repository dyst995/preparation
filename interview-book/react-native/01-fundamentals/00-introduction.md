# 01  React Native Fundamentals — Introduction

> Source: `interview-prep/react-native/01-fundamentals.md`

> Goal: Explain how React Native works under the hood, how UI is rendered, how threads interact, and how you debug day-to-day issues � at a depth that survives senior follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Contrast React Native rendering with React DOM.
2. Explain the old Bridge architecture and its bottlenecks.
3. Explain New Architecture pieces: JSI, Fabric, Turbo Modules, Codegen.
4. Describe what runs on JS thread, UI/main thread, and native module threads.
5. Defend Hermes as a default choice with concrete benefits.
6. Write and justify platform-specific code correctly.
7. Reason about Flexbox/layout differences vs web CSS.
8. Tune lists and explain why virtualization matters.
9. Choose the right debugging tool for JS vs native vs production issues.

---
