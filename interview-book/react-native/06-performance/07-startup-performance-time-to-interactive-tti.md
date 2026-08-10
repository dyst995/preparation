# 07. Startup performance & Time-To-Interactive (TTI)

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] What counts toward startup time: native app launch ? JS bundle load/parse ? first meaningful render ? interactive
- [ ] Hermes bytecode precompilation reducing parse/compile time (recap, applied to TTI)
- [ ] Lazy loading / code-splitting screens and heavy libraries not needed at launch
- [ ] Deferring non-critical initialization (analytics, non-blocking SDK inits) until after first paint
- [ ] Reducing work in the root component tree before first render
- [ ] Splash screen strategy � matching perceived vs actual load time
- [ ] Avoiding synchronous heavy storage reads (e.g. large AsyncStorage blobs) on the startup path
- [ ] Network waterfall on startup (auth check, config fetch) � parallelize instead of serializing

### Practical techniques

1. **Lazy-load screens** not needed on first paint (`React.lazy`/dynamic import patterns adapted for RN, or simply deferring heavy provider setup).
2. **Defer non-critical SDK init** (crash reporting can init early since you want to catch startup crashes, but heavy analytics batching, feature-flag fetches, etc. can be deferred slightly).
3. **Cache warm data**: if a "logged in" screen needs data, consider showing cached/last-known data immediately while refetching, rather than blocking the first render on a network round trip.
4. **Trim root-level Context/Provider nesting** � every provider mounted before first render adds cost; only mount what's truly needed immediately.
5. **Use Hermes** (assume default now) and confirm bytecode precompilation is actually enabled for release builds.
6. **Measure real TTI** with a timestamp from native launch to "first interactive frame," not just "JS bundle loaded."

### Interview question

**Q: How do you reduce app startup time?**

**Strong answer:**
> "I first measure � instrument a timestamp from native process start to first interactive frame, not just bundle-load time, so I know the real budget. Then I look at three buckets: bundle/parse cost (Hermes bytecode helps here), root-tree initialization cost before first paint (trim unnecessary providers, defer non-critical SDK init), and network-on-the-critical-path (don't block first render on a sequential chain of auth-check ? config-fetch ? data-fetch; parallelize or show cached data first). On the apps I modernized � MyCreditInfo especially � startup performance was one of the concrete wins I delivered through lazy loading and reducing the initial rendering/network path, alongside HTTP caching with ETags so repeat loads didn't re-fetch unchanged data."

---
