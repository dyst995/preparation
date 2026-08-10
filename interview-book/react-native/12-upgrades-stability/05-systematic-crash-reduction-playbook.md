# 05. Systematic crash reduction playbook

> Source: `interview-prep/react-native/12-upgrades-stability.md`

This is the playbook you actually ran to get MyCreditInfo, Wizer, and Online School from double-digit crash rates down to fractions of a percent. Learn it as a repeatable process, not a one-time fix, because that's what makes the story credible to a senior interviewer.

### The playbook

1. **Baseline and instrument.** Confirm Crashlytics is correctly wired with symbolication (mapping files/dSYMs) for the current release - you cannot fix what you can't read. Establish the actual crash-free users % baseline, not a guess.
2. **Rank by impact, not by ease.** Sort crash clusters by number of affected users/sessions, not by which is easiest to fix. A rare-but-easy fix is a distraction if a top-3 crash affects 40% of crashing sessions.
3. **Bucket each top crash: JS or native, and by root cause category** (null/undefined access, bad API response shape, native module misuse, OS/device-specific, memory pressure, third-party SDK bug).
4. **Fix the top offenders first, ship behind staged rollout, and re-measure** - don't batch 20 unrelated fixes into one release where you can't tell which fix worked.
5. **Add defensive guards, not just point fixes.** If a crash was "accessing `.length` on an undefined API field," the real fix is validating/normalizing API responses at the boundary (schema validation or defensive parsing), not just one null check in one screen - so a whole class of similar future crashes is prevented.
6. **Add breadcrumbs/non-fatal logging** around risky flows so that if a similar crash appears again, you have context (last screen, last action, feature flag state) instead of a bare stack trace.
7. **Repeat the loop** - re-baseline crash-free % after each release, and keep working down the ranked list until you hit a healthy floor (fractions of a percent, matching your CV numbers).
8. **Lock in prevention**: add TypeScript strictness/schema validation at API boundaries, add ErrorBoundaries around risky feature areas so one screen's failure doesn't kill the whole app, and keep dependency versions current so you're not accumulating known-fixed bugs from stale native SDKs.

### Why this reads as senior in an interview

Most candidates say "I fixed some crashes." You can say you ran a **measurement -> triage-by-impact -> fix -> defend-the-class-of-bug -> re-measure** loop across three different apps with different tech debt profiles, and quote the before/after numbers each time. That is a process story, which is what distinguishes senior engineers from "I closed some Jira tickets."

### Interview question (core STAR prompt - also see Chapter 14)

**Q: Walk me through how you reduced crash rate from ~20% to ~0.03% on MyCreditInfo.**

> "The app was a legacy codebase with essentially no crash visibility beyond raw Play Console numbers, so step one was making sure Crashlytics was correctly wired with proper mapping file uploads so stacks were actually readable. Once I had real data, I ranked crash clusters by how many users/sessions they affected, not by how easy each looked. The top clusters were a mix of unguarded assumptions about API response shape and a few native module calls receiving unexpected null values from legacy JS code. I fixed the highest-impact clusters first, added defensive validation at the API boundary so entire categories of 'undefined property access' crashes stopped recurring, and shipped each batch through a staged rollout while watching the crash-free rate. I repeated that loop release after release until crash-free users landed around 99.97%, then kept it there by adding ErrorBoundaries around risky screens and keeping the crash triage habit going for every future release."

---
