# 12 - Upgrades, Stability & Production Debugging — Introduction

> Source: `interview-prep/react-native/12-upgrades-stability.md`

> Goal: Own the story of taking real production apps from double-digit crash rates down to near-zero (MyCreditInfo ~20% -> 0.03%, Wizer ~15% -> 0.09%, Online School ~28% -> 0.15%), and speak with total confidence about RN upgrades, dependency conflicts, and systematic production debugging.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Run a React Native version upgrade methodically, including native project regeneration and conflict resolution.
2. Diagnose and resolve dependency/peer-dependency conflicts without guessing.
3. Read a Crashlytics stack trace and correctly classify JS vs native, and know what's needed to symbolicate each.
4. Distinguish ANR, crash, and freeze precisely, with detection strategy for each.
5. Execute a systematic, repeatable crash-reduction playbook - not one-off fixes.
6. Use feature flags/remote config to de-risk releases and stop bleeding without a new binary.
7. Log safely in production without leaking PII.
8. Reproduce device-specific bugs (OEM, OS version, screen density) systematically.
9. Tell your three flagship crash-reduction stories fluently, with numbers, in interview format.

---
