# 12. Deep links, universal links, and deferred deep links

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] Custom URL schemes (`myapp://...`) � simple but spoofable/hijackable by other apps
- [ ] iOS Universal Links (`applinks:` associated domain, `apple-app-site-association` file hosted on your domain)
- [ ] Android App Links (`autoVerify` intent filter, `assetlinks.json` hosted on your domain)
- [ ] Why Universal/App Links are preferred for security-sensitive flows � they're domain-verified, so a malicious app can't claim your scheme
- [ ] React Navigation linking config mapping URL patterns to screens/params
- [ ] Validating deep link parameters before navigating (never trust the URL blindly)
- [ ] Deferred deep linking (install ? open ? still land on the intended content) � high-level awareness, usually via a third-party attribution SDK

### Custom scheme vs Universal/App Links

| Aspect | Custom scheme (`myapp://`) | Universal Link / App Link |
|---|---|---|
| Setup complexity | Low | Higher (domain file hosting + verification) |
| Security | Any app can register the same scheme � spoofable | Domain-verified; OS confirms your app owns the domain |
| Fallback if app not installed | Fails / does nothing | Opens a normal web URL (great fallback UX) |
| Fintech suitability | Risky for sensitive actions (e.g. auth callbacks, payment confirmations) | Preferred for anything security-sensitive |

### Interview question

**Q: How do deep links work in React Native, and how do you test them?**

> "There are two flavors: custom URL schemes, which are simple but can technically be claimed by other apps since they're not domain-verified, and Universal Links (iOS) / App Links (Android), which are tied to a domain via a hosted verification file so the OS confirms only my app can handle them. I use React Navigation's linking config to map URL patterns to screens and params, and I always validate params before navigating � a malformed or malicious URL shouldn't be trusted blindly. To test, I use `npx uri-scheme open` or `adb shell am start` with an intent for the URL on Android, and `xcrun simctl openurl` on iOS simulators, plus real-device testing for Universal/App Link domain verification since simulators don't always exercise that path faithfully."

**Q: How do you validate deep links so they can't open unauthorized flows?**

> "I whitelist expected URL patterns and params server-side/client-side, reject anything that doesn't match a known route shape, require re-authentication for sensitive destinations even if the link itself doesn't carry credentials, and never let a deep link directly trigger a state-changing action (like confirming a payment) without an explicit in-app confirmation step."

---
