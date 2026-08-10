# 08. Reproducing device-specific bugs

> Source: `interview-prep/react-native/12-upgrades-stability.md`

### Topics to learn
- [ ] OEM Android skins affecting behavior (notifications, background task killing, permission dialogs)
- [ ] Screen size/density edge cases
- [ ] OS-version-specific API behavior changes
- [ ] Low-end device performance/memory constraints
- [ ] Using Play Console/Crashlytics device segmentation to spot patterns
- [ ] Remote debugging / requesting logs from affected users when you can't reproduce locally

### Practical approach

1. Check Crashlytics/Play vitals device and OS-version breakdown for the crash - patterns often jump out immediately (e.g. 90% on one manufacturer, or all on one specific OS version).
2. Check that manufacturer's known quirks (many Android OEMs aggressively kill background apps/services, affecting things like background location or notification delivery).
3. If it's a screen-density/layout bug, test against the actual reported density/resolution rather than the nearest emulator default.
4. If it's OS-version-specific, check platform release notes for the exact version - permission model changes, background execution limits, and API deprecations are common culprits.
5. If local reproduction fails entirely, add targeted non-PII breadcrumbs/logging around the suspected area and wait for the next occurrence with richer data, rather than guessing indefinitely.

### Interview question

**Q: A crash only happens on a specific Android manufacturer's devices. How do you approach it?**

> "I start with the Crashlytics/Play vitals device breakdown to confirm the pattern is real and not just where our user base happens to be concentrated. Then I check that manufacturer's known OS behavior quirks - many Android OEMs have custom background-process killing or permission dialog behavior that differs from stock Android. If I can't reproduce locally on a similar device/emulator profile, I add targeted, non-PII breadcrumbs around the suspected code path so the next occurrence gives me the context I need, rather than shipping speculative fixes."

---
