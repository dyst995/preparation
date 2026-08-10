# 06. Bridge congestion - how seniors debug it

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] Identify chatty modules with logging/profiling
- [ ] Reduce event frequency (throttle/debounce/coalesce at native side)
- [ ] Move work off JS reactions to scroll
- [ ] Avoid sending full state blobs; send IDs + fetch
- [ ] Prefer native UI updates for animations

### Production checklist
- [ ] No per-frame JS bridge writes for animation
- [ ] Native events coalesced when possible
- [ ] Large payloads not shuttled through module methods
- [ ] Startup does not touch unused native modules eagerly (legacy limitation - motivates Turbo Modules lazy load)
- [ ] Perf markers around suspect crossings

### Anti-patterns seniors reject
- Blaming "RN is slow" without measuring bridge vs JS vs UI
- Fixing congestion by micro-memoizing React while still blasting scroll events into JS
- Base64 round-tripping files through the bridge when native file URIs exist

---
