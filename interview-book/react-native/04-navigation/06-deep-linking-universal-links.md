# 06. Deep linking & universal links

> Source: `interview-prep/react-native/04-navigation.md`

### Topics to learn
- [ ] URL schemes vs universal links / app links
- [ ] React Navigation `linking` config
- [ ] Mapping path ? screen hierarchy
- [ ] Waiting for auth hydration before resolving private links
- [ ] Fallback when link target is invalid
- [ ] Testing on iOS/Android
- [ ] Security: don�t trust link params blindly

### Example mental map

```text
myapp://transfers/123        ? AppTabs ? TransfersStack ? TransferDetails(id=123)
https://app.example.com/qr   ? QR payment flow
```

### Auth + deep link sequence

1. App opens via link
2. Parse URL
3. If not hydrated: wait
4. If not authenticated: store intended URL / redirect to login, then continue
5. If authenticated: navigate to target
6. Validate permissions for target resource

### Interview questions

**Q: How do deep links work in RN?**

> �The OS opens the app with a URL. React Navigation�s linking config maps path patterns to screens in the navigator tree. I configure prefixes, screen paths, and parse params. For private screens I ensure auth hydration and authorization before navigating.�

**Q: How do you test deep links?**

> �On Android via `adb shell am start` with an intent URI; on iOS via `xcrun simctl openurl` or universal link setup. I also test cold start, warm start, and logged-out scenarios.�

---
