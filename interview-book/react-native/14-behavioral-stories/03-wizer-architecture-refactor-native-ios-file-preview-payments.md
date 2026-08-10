# 03. Wizer - architecture refactor + native iOS file preview + payments

> Source: `interview-prep/react-native/14-behavioral-stories.md`

### STAR breakdown

- **Situation**: Wizer needed both an architectural refactor (crash rate ~15%, plus maintainability issues) and new native capability - a native iOS file preview feature - alongside payment functionality.
- **Task**: Simultaneously improve stability/architecture and ship new native-touching features without regressing the payment flows users depended on.
- **Action**: Applied the same systematic crash-reduction approach as MyCreditInfo (measure, rank by impact, fix, prevent the class of bug, re-measure), refactored problematic architecture incrementally, and built a native iOS module for file preview where no adequate JS-only solution existed, all while keeping payment flows carefully regression-tested given their sensitivity.
- **Result**: Crash rate dropped from ~15% to ~0.09%, the app gained a smooth native file preview experience on iOS, and payment flows remained stable and trustworthy throughout the changes.

### Spoken script (60-90s)

> "Wizer had two problems at once: a crash rate around 15 percent and an architecture that was getting harder to extend safely, especially around payments, where regressions are the most costly kind of bug. I used the same disciplined approach I'd used on MyCreditInfo - proper crash visibility, ranking by impact, fixing the worst offenders first, and hardening the pattern that caused each cluster so it wouldn't recur - and got the crash rate down to about 0.09 percent. In parallel, the product needed a native file preview experience on iOS that didn't have a good JS-only equivalent, so I built a native iOS module for that specifically, which meant working directly with platform APIs rather than staying purely in JavaScript. Because payments were involved, I was deliberately conservative there - anything touching that flow got extra manual testing and staged rollout before going wide, since a payment bug is a very different severity of problem than a UI bug. The result was a materially more stable app, a genuinely native-feeling file preview feature, and payment flows that never regressed during the whole effort."

### Likely follow-ups
- "Why native instead of a JS library for file preview?" - have a specific technical reason ready (performance, platform-native UX expectations, or a capability gap in available JS libraries).
- "How did you make sure payments didn't regress while refactoring architecture around them?" - mention staged rollout, focused manual test passes, and possibly feature-flagging the refactor.
- "What's a specific bug you found in the old architecture?" - have one concrete, specific example.

---
