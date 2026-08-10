# 09. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Upgrades
1. **How do you approach a major RN version upgrade?** - dependency audit first, incremental hops, native diff, clean rebuild, full test matrix, staged rollout.
2. **What usually breaks during an RN upgrade?** - native-touching libraries, not RN's JS APIs themselves.
3. **How do you resolve a peer dependency conflict?** - `yarn why`, distinguish warning vs real native mismatch, `resolutions`/`overrides` with documented reasoning.

### Crashlytics & classification
4. **How do you tell JS vs native crashes apart?** - stack shape + which symbolication artifact you need.
5. **Why do you need mapping files/dSYMs?** - without them, stacks are unreadable memory addresses/minified names.
6. **ANR vs crash vs freeze?** - see Section 4 table.

### The crash reduction story
7. **Walk through your MyCreditInfo crash reduction (~20% -> 0.03%).**
8. **Walk through Wizer (~15% -> 0.09%).**
9. **Walk through Online School (~28% -> 0.15%), and how CI/CD/deadline pressure factored in.**
10. **How do you prioritize which crash to fix first?** - impact (affected users/sessions), not ease.
11. **How do you prevent a whole class of crash, not just one instance?** - defensive validation at boundaries, ErrorBoundaries, schema checks.

### Safety mechanisms
12. **How do feature flags help stability independent of releases?** - instant kill switch without a new build.
13. **How do you log safely in a fintech app?** - centralized redaction wrapper, allow-listed fields, opaque IDs.
14. **How do you debug a device-specific bug you can't reproduce locally?** - segmentation data, OEM quirks, targeted breadcrumbs.

---
