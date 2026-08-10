# 15. Senior-Level Best Practices

> Source: `interview-prep/react-native/06-performance.md`

### Decision framework: which optimization is actually worth doing right now?

| Question | If yes -> | If no -> |
|---|---|---|
| Have I measured which thread/subsystem is actually the bottleneck? | Proceed to targeted fix | Stop - profile first, any "optimization" here is a guess |
| Does the fix address the specific measured hot path? | Ship it, then re-measure | Don't ship a plausible-sounding but unmeasured change |
| Is this a list with more than a few hundred rows or frequent updates? | `getItemLayout` + memoized rows + tuned windowing is worth the effort | A short static list doesn't need FlatList tuning beyond the basics |
| Is the list extremely large/high-churn (feed, chat) and FlatList is measurably the bottleneck after tuning? | Consider FlashList migration | Stay on FlatList - fewer, more battle-tested dependencies especially in a fintech app |
| Is the animation gesture-driven or does it depend on other animated values per frame? | Reanimated + Gesture Handler | `Animated` + `useNativeDriver` is likely sufficient |
| Is startup time the complaint? | Instrument real TTI first (native launch to interactive), then attack the biggest bucket (bundle/parse, root-tree init, network waterfall) | Don't guess which of the three buckets is the problem |

### Production checklist (performance, ship-ready)

- [ ] Every "we fixed performance" claim in a PR description has a before/after measurement attached (FPS, TTI, memory), not just "should be faster"
- [ ] Every FlatList/FlashList in the app has a stable `keyExtractor`, memoized row component, and `getItemLayout` where row height is fixed/predictable
- [ ] TTI is instrumented from native launch to first interactive frame in production (not just "bundle loaded"), with alerting on regression
- [ ] Root component tree before first paint is audited - no unnecessary providers or synchronous heavy storage reads blocking first render
- [ ] Image-heavy screens serve appropriately-sized thumbnails from the backend/CDN, not client-side-downscaled full-resolution images
- [ ] A memory-leak sweep (repeated navigate in/out of heavy screens while watching native memory profilers) has been run on at least the top 5 highest-traffic screens
- [ ] Native module calls that could be batched are batched - no per-item loops calling into native hundreds of times
- [ ] Release-build profiling has actually happened on a real low-end/min-spec Android device, not only on a simulator or a flagship test phone

### Anti-patterns seniors reject in code review

- **"Just wrap it in `useMemo`/`React.memo`" as a reflexive response with no profiler evidence** - sometimes the bookkeeping cost exceeds the recompute cost, and memoization is not free.
- **Optimizing based on emulator/simulator performance alone** - min-spec real Android devices routinely reveal problems invisible on a dev machine or flagship test phone.
- **Claiming Reanimated is "always better" than `Animated`** without being able to explain the worklet/UI-thread reasoning - signals memorized talking points, not understanding.
- **Adopting FlashList by default "because it's faster"** without first confirming FlatList, properly tuned, is actually the bottleneck - adds a dependency and migration cost for an unmeasured gain.
- **Fixing five things at once after one bug report** instead of isolating and fixing the single measured top offender, then re-measuring - makes it impossible to know what actually helped, and risks new regressions from unrelated changes.
- **Treating "the app feels slow" as a single ticket** instead of demanding specifics (which screen, which action, which device tier, release vs dev build) before writing any code.
- **Ignoring `extraData` on a FlatList that depends on external state**, then "fixing" the resulting stale-UI bug by forcing a full remount or key-changing the whole list - masks the real issue and defeats virtualization's benefits.

### Failure modes & how seniors debug them

| Symptom | Likely root cause | First tool | Fix |
|---|---|---|---|
| Jank only on Android, only on older devices | Heavy view hierarchy / lack of `removeClippedSubviews` / large image memory pressure | Android Studio Profiler on a min-spec test device | Trim view tree, tune list props, right-size images |
| App freezes for ~1 second randomly, no correlation to user action | GC pause (Hermes) triggered by memory pressure, or a large synchronous JSON parse on a timer/push event | Native memory profiler + Hermes sampling profiler correlated with timing of the freeze | Reduce allocation churn, move heavy parsing off the critical path, batch/debounce triggering events |
| Memory climbs steadily every time a user navigates into and out of one specific screen | Uncleaned listener/subscription/timer in that screen's `useEffect` | Repro loop (nav in/out x10) + Instruments Allocations or Android memory profiler heap dump | Add the missing cleanup function, audit all native module listeners on that screen |
| List scroll suddenly jumps or shows blank cells during fast scroll | `getItemLayout` values wrong for actual (non-fixed) row heights, or `windowSize` too low for the scroll speed | Visually reproduce + check row height assumptions vs actual measured heights | Fix `getItemLayout` formula or remove it if heights are genuinely variable; raise `windowSize` if memory allows |
| Cold start regresses after adding a new SDK | New SDK doing synchronous/eager init on the startup path | Compare TTI instrumentation before/after the SDK was added, bisect if needed | Defer SDK init to after first paint if it's not startup-critical |

### Observability / metrics you'd watch in production

- **JS FPS / UI FPS distributions** on top 3-5 highest-traffic screens, sampled continuously, not just spot-checked during QA.
- **TTI (native launch to interactive)**, p50/p95, tracked per release - a creeping p95 regression is often invisible in p50 averages.
- **Memory high-water mark per session** on image-heavy or long-list-heavy screens, segmented by device tier.
- **ANR rate (Android)** as a distinct signal from JS-exception crash rate - points specifically at UI-thread/native blocking.
- **Crash-free users % segmented by device tier and OS version**, since perf-driven crashes (OOM-adjacent) cluster on specific low-end device classes.
- **Bundle size over time** and **native app size over time** - both quietly affect download conversion and startup cost if unmonitored.

### Scalability & team practices

- **A written performance budget per screen type** (e.g. "list screens must hit X JS FPS on a min-spec test device") makes "is this fast enough" an objective code-review question instead of a subjective debate.
- **A designated min-spec Android test device (or device farm profile) is part of the QA process**, not an afterthought - most perf regressions that reach production were invisible on the engineer's own flagship phone.
- **Code review checklist includes**: "does this new list have a stable key, memoized row, and appropriate `getItemLayout`?" and "does this new `useEffect` with a subscription/timer have a cleanup?" - the two highest-yield, cheapest-to-catch review items in RN.
- **Every performance PR requires a before/after measurement in the description** (screenshot of Perf Monitor, profiler trace, or a TTI number) - this is a lightweight but powerful team norm that prevents "should be faster" from shipping unverified.
- **Regressions get a lightweight guard**, even if just a comment ("this list must stay virtualized - do not wrap in ScrollView") near the risky code, since perf regressions are otherwise silent until a client complains.
- **Post-incident performance write-ups** (what was slow, how it was found, what fixed it) get added to a team knowledge base - this is exactly how a 20%->0.03% or 28%->0.15% crash-rate story becomes a repeatable team capability instead of one person's tribal knowledge.

### Tradeoffs table

| Choice | Pro | Con |
|---|---|---|
| Lower `windowSize` | Less memory/CPU | More blank-cell flicker on fast scroll |
| Higher `windowSize` | Smoother fast scroll | More memory held, worse on low-end devices |
| `removeClippedSubviews: true` | Real memory win on Android, especially long lists | Occasional rendering glitches with overlays/sticky headers - must test |
| FlashList over FlatList | Lower mount/unmount overhead on very large/high-churn lists | Extra dependency, `estimatedItemSize` tuning, less battle-tested in a risk-averse fintech context |
| Aggressive memoization everywhere | Prevents some real re-render costs | Adds comparison/bookkeeping overhead and cognitive load where the win doesn't exist |
| Deferring SDK init post-first-paint | Faster perceived TTI | Slightly delayed availability of that SDK's data/features immediately at launch |

### Harder follow-up interview questions (with model answers)

**Q: You fixed a jank issue by adding `React.memo` and the profiler shows fewer re-renders, but users still report the screen "feels slow." What do you check next?**

> "Fewer re-renders isn't the same as 'fast enough' - I'd check whether the remaining renders are still expensive (heavy computation inside the memoized component itself), whether the bottleneck actually moved to the UI thread now (native view complexity, image decode cost), or whether the real complaint is about something else entirely, like network latency perceived as UI slowness. I don't declare victory on one metric moving; I go back to Perf Monitor and re-isolate JS vs UI thread for the specific reported interaction."

**Q: How do you performance-test a screen before it ships, given you probably don't have every device tier in your test lab?**

> "I prioritize testing on at least one genuinely low-end/min-spec Android device, since that's where most real-world regressions surface first and iOS device fragmentation is far smaller. If I truly can't get physical device coverage, I use Android's CPU/memory throttling in the profiler to simulate a weaker device, but I treat that as a fallback, not a substitute - throttled emulators don't perfectly replicate real thermal throttling and memory pressure patterns."

**Q: A teammate wants to add `useMemo` to every derived value in a component 'to be safe.' How do you push back constructively?**

> "I'd explain that `useMemo` has a real cost - the dependency comparison and cache storage - and for cheap computations that cost can exceed just recomputing on every render. I'd ask them to point at a specific measured cost (via the profiler) before adding memoization, and frame it as 'memoize what's proven expensive,' not 'memoize everything defensively,' because the latter adds both runtime overhead and reviewer cognitive load without a proven benefit."

**Q: Startup time regressed by 400ms after a recent release, but no single commit looks obviously heavy. How do you find the cause?**

> "I'd bisect using the TTI instrumentation itself rather than reading diffs - run the same instrumented build across the commit range (or use whatever CI perf tracking exists) to find exactly which commit introduced the regression, since 400ms is rarely one obviously 'heavy' line and is more often a new dependency doing eager init, an added provider in the root tree, or a newly-serial network call. Once bisected, I'd look specifically at what changed in the startup path around that commit rather than guessing across the whole diff."

**Q: How would you explain to a non-technical stakeholder why 'just add more `useMemo`' isn't a real performance strategy?**

> "I'd frame it as: performance work is diagnosis before treatment, the same way a doctor wouldn't prescribe medication before finding out what's actually wrong. Sprinkling `useMemo` everywhere is like taking medicine for a symptom you haven't identified yet - it might do nothing, or occasionally make things worse, and it costs engineering time we could spend on the actual bottleneck once we've measured it."

**Q: What's a performance optimization you'd actively avoid doing even if it would technically help, and why?**

> "Migrating every list in the app to FlashList preemptively, without evidence that FlatList's mount/unmount overhead is the measured bottleneck for that specific list's size and update frequency. In a fintech app I favor fewer, well-understood, battle-tested dependencies over a broad preemptive migration - the operational and QA cost of a sweeping dependency change across every list screen isn't justified unless the data shows FlatList is actually the constraint for that particular screen."

### What I'd say in a staff/senior interview

> "If there's one meta-skill I'd want an interviewer to walk away remembering, it's 'measure, isolate, fix the single biggest offender, re-measure, guard against regression' - not any specific FlatList prop or Reanimated API. I've applied that exact loop to get crash rates down from 15-28% to under 0.2% across three different legacy codebases, and the fixes were rarely exotic - unmemoized list rows, uncleaned native listeners, oversized images loaded into memory, unbounded re-renders from Context. The technical knowledge (what `getItemLayout` does, how Reanimated's worklet model works, why Context isn't a prop for `memo`) matters because it tells you where to look and what tool to reach for, but the discipline of never shipping an unmeasured 'optimization' is what actually prevents a team from chasing ghosts or introducing a regression while trying to fix a different one."

---
