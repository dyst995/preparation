# 08  Push Notifications, Firebase & Device Features — Introduction

> Source: `interview-prep/react-native/08-push-firebase-device.md`

> Goal: Be able to explain the full push notification pipeline end-to-end (backend ? FCM ? device ? UI), justify Notifee usage, handle every app-lifecycle state correctly, run a real Crashlytics triage workflow, and defend your secure-storage and deep-linking decisions � all backed by concrete stories from EasyPay, Wizer, and Clean House.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Draw the full push notification pipeline from your backend to a rendered notification on a locked device.
2. Explain the difference between FCM (delivery transport) and Notifee (notification presentation/local scheduling).
3. Correctly wire notification handling for foreground, background, and killed app states on both platforms.
4. Route a tapped notification to the correct screen, including on cold start.
5. Run a Crashlytics-driven crash-rate reduction workflow and narrate it like you did at MyCreditInfo, Wizer, and Online School.
6. Justify Keychain/Keystore over AsyncStorage for sensitive data.
7. Explain `AppState`, background execution limits, and why mobile OSes throttle background work.
8. Set up and validate deep links and universal/app links, and explain deferred deep linking at a high level.

---
