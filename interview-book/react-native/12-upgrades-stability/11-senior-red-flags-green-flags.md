# 11. Senior red flags / green flags

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Green flags interviewers love
- Describes crash reduction as a *repeatable process*, not a single fix.
- Prioritizes by user impact, not by which bug looks interesting.
- Distinguishes point fixes from "preventing a whole class of bug."
- Has real numbers memorized and can explain *how* they were achieved, not just that they happened.
- Treats PII/logging safety as a hard rule in fintech, unprompted.

### Red flags
- "I just kept fixing crashes until Crashlytics looked better" (no system, no prioritization).
- Confusing ANR with a generic crash.
- No answer for "how do you know a fix actually worked" (should mention re-measuring crash-free % after staged rollout).
- Logging raw API responses/objects without a redaction strategy.
- Treating an RN upgrade as "just bump the version number."

---
