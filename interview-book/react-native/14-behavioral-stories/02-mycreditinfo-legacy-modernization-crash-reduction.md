# 02. MyCreditInfo - legacy modernization + crash reduction

> Source: `interview-prep/react-native/14-behavioral-stories.md`

### STAR breakdown

- **Situation**: An existing production app with a legacy codebase and a high crash rate (~20% on Play Store, i.e. roughly 1 in 5 users experiencing a crash).
- **Task**: Modernize the codebase incrementally while operating a live app, and bring the crash rate down without a rewrite-and-pray approach.
- **Action**: Established real crash visibility (proper Crashlytics symbolication), ranked crash clusters by user impact, fixed the highest-impact issues first, added defensive validation at API boundaries to prevent whole classes of null/undefined crashes recurring, and modernized architecture/dependencies incrementally alongside the ongoing fixes.
- **Result**: Crash rate dropped from ~20% to ~0.03% - essentially eliminating crashes as a user-facing problem - while the app kept shipping features throughout.

### Spoken script (60-90s)

> "MyCreditInfo was a legacy app with a crash rate around 20 percent - a huge portion of users were hitting crashes. Rather than proposing a rewrite, which would've stalled feature delivery, I focused on making the problem measurable first: making sure Crashlytics was properly wired with mapping file uploads so the stack traces were actually readable, since a lot of legacy crash data before that was closer to noise. Once I had real visibility, I ranked the crash clusters by how many users they actually affected, not by which looked easiest, and started fixing top offenders. A recurring pattern was legacy code making unsafe assumptions about API response shape, so instead of patching each occurrence individually, I added validation at the API boundary so entire categories of that crash stopped happening, not just the one instance I'd found. I repeated that loop release after release, alongside incrementally modernizing the surrounding architecture, and brought the crash rate down to about 0.03 percent - essentially production-stable - without ever pausing feature work to do a big-bang rewrite."

### Likely follow-ups
- "How did you convince stakeholders to prioritize crash fixes over new features?" - have a real answer about framing crash rate in terms of user trust/business impact, not just "engineering hygiene."
- "What was the single worst crash you found?" - have one specific, memorable example ready (pick a real one: e.g. a native module null crash, or a widescale JSON-parsing assumption).
- "How long did the full reduction take?" - be honest about the timeline; frame it as a sustained effort across multiple releases, not an overnight fix.

---
