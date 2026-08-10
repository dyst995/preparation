# 08. Memory leaks in React Native

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] Uncleaned event listeners / subscriptions (Firebase listeners, event emitters, WebSocket connections)
- [ ] Uncleaned timers (`setInterval`/`setTimeout`) surviving unmount
- [ ] Stale closures holding references to large objects
- [ ] Native module listeners that must be explicitly removed (common with Notifee, Firebase Messaging, camera/barcode SDKs)
- [ ] Image caches growing unbounded without eviction
- [ ] Navigation stacks retaining unmounted screen state improperly (memory-heavy screens kept alive)
- [ ] Detecting leaks: memory graphs in Xcode Instruments (Leaks/Allocations) and Android Studio Profiler heap dumps

### The universal fix pattern

```jsx
useEffect(() => {
  const sub = SomeNativeModule.addListener('event', handler);
  const id = setInterval(tick, 1000);

  return () => {
    sub.remove();       // or unsubscribe(), depending on API
    clearInterval(id);
  };
}, []);
```

Every subscription/timer/listener created in an effect needs a matching cleanup � this is the single most common source of RN memory leaks and a very common interview probe.

### Interview question

**Q: How would you find and fix a memory leak in a React Native screen?**

**Strong answer:**
> "I'd reproduce by navigating in and out of the screen repeatedly and watch memory in Xcode Instruments (Allocations/Leaks) or Android Studio's memory profiler � if memory climbs and doesn't come back down after garbage collection, something is being retained. Then I audit the screen's `useEffect`s for subscriptions, listeners (native module event listeners are a common culprit � Firebase, push notification SDKs, barcode scanner SDKs), and timers that aren't cleaned up in the return function. I also check for closures capturing large objects unnecessarily. This kind of leak hunting was part of the production-issue investigation work behind the crash-rate reductions on Wizer and Online School � some 'crashes' were actually OOM kills traceable to unreleased native listeners after repeated navigation."

---
