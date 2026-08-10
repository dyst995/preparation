# 15 - The React Native Bridge (Legacy Architecture) — Introduction

> Source: `interview-prep/react-native/15-bridge.md`

> Goal: Explain the classic RN Bridge like a senior who has debugged bridge congestion, serialization cost, and migration to the New Architecture - not like someone who only memorized "async JSON bridge."

Your CV lists native Android/iOS integrations and Turbo Modules. Interviewers will often start with the Bridge so they can see whether you understand *why* Turbo Modules exist.

Mark progress with `[x]`.

---

## Learning objectives

1. Draw the Bridge architecture (JS thread <-> MessageQueue <-> Native modules / UI manager).
2. Explain serialization, batching, and asynchrony precisely.
3. Diagnose bridge congestion symptoms in production apps.
4. Contrast Bridge-era Native Modules with JSI/Turbo Modules.
5. Explain what still uses Bridge concepts during New Architecture migration (interop).
6. Tell a CV-ready story: when bridge limitations forced native/Turbo Module work.

---
