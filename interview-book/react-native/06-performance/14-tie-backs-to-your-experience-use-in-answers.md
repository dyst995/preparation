# 14. Tie-backs to your experience (use in answers)

> Source: `interview-prep/react-native/06-performance.md`

- **MyCreditInfo**: crash rate 20% ? 0.03% via Firebase Crashlytics-driven investigation; startup performance, rendering efficiency, and network performance improved via lazy loading and HTTP caching (ETags) � a direct TTI + network-waterfall story.
- **Wizer**: crash rate 15% ? 0.09%; feature-based architecture refactor that reduced re-render blast radius and made performance regressions easier to isolate; native iOS file preview library work shows comfort optimizing at the native boundary, not just JS.
- **Online School**: crash rate 28% ? 0.15% on a high-traffic, nationwide app with heavy lists (grades, attendance, messaging) � strong FlatList/memory story.
- **EasyPay**: fintech app built from scratch � you made the *architectural* performance decisions upfront (state management choice, navigation structure) rather than retrofitting, and cared about memory/performance/security as explicit CV bullet points.
- **Clean House**: Zebra DataWedge barcode workflows are a good example of avoiding chatty native calls in a scan-heavy warehouse workflow � batch and debounce scan events rather than triggering heavy JS work per scan.

---
