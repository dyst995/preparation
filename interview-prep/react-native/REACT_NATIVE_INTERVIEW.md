# React Native Interview Prep - Index

Detailed study guides split by topic. Built around your stack and CV: React Native, React Navigation, Redux, React Query, Zustand, **Bridge**, **Native Modules**, **Turbo Modules**, Firebase, Fastlane, and production crash reduction.

Mark progress in each file with `[ ]` -> `[x]`.

---

## Chapters

| # | File | Focus |
|---|---|---|
| 01 | [Fundamentals](./01-fundamentals.md) | Bridge vs New Architecture overview, threads, Hermes, Metro, Flexbox, lists, debugging |
| 02 | [Architecture](./02-architecture.md) | Feature-based structure, layering, app shell, design system, environments, legacy modernization |
| 03 | [State Management](./03-state-management.md) | Local vs server vs global state, Zustand, Redux/RTK, React Query, persistence, optimistic UI |
| 04 | [Navigation](./04-navigation.md) | Native stack/tabs, auth gating, typed params, deep links, notification routing, resets |
| 05 | [Networking & Data](./05-networking.md) | HTTP client, JWT refresh races, pagination, ETags, WebSockets vs FCM, idempotency, offline |
| 06 | [Performance](./06-performance.md) | JS/UI threads, FlatList tuning, FlashList, startup/TTI, memory leaks, profiling methodology |
| 07 | [Native Integrations](./07-native-modules.md) | When to go native, biometrics, DataWedge, iOS preview, native patches, upgrade compatibility |
| 08 | [Push, Firebase & Device](./08-push-firebase-device.md) | FCM, Notifee, Crashlytics, secure storage, AppState, deep/universal links |
| 09 | [Forms, UX & Fintech](./09-forms-ux-fintech.md) | Keyboards, money precision, QR/transfers/loans flows, session re-auth, accessibility |
| 10 | [Testing](./10-testing.md) | Jest, RNTL, mocking native modules, integration tests, Detox/Maestro, fintech test priorities |
| 11 | [CI/CD & Releases](./11-cicd-releases.md) | Signing, Fastlane, GitLab Runner, store ops, staged rollouts, hotfixes, OTA tradeoffs |
| 12 | [Upgrades & Stability](./12-upgrades-stability.md) | RN upgrades, Crashlytics triage, ANRs, crash-reduction playbook, feature flags |
| 13 | [Security](./13-security.md) | Keychain/Keystore, pinning, deep-link validation, secrets, bridge risks, fintech hardening |
| 14 | [Behavioral Stories](./14-behavioral-stories.md) | STAR scripts for EasyPay, MyCreditInfo, Wizer, Online School, Clean House, CI/CD |
| **15** | **[Bridge](./15-bridge.md)** | **Legacy Bridge architecture, serialization, batching, congestion, migration context** |
| **16** | **[Native Modules](./16-native-modules.md)** | **Legacy Android/iOS modules, promises/events, threading, packaging, debugging** |
| **17** | **[Turbo Modules](./17-turbo-modules.md)** | **JSI, Codegen specs, lazy loading, sync vs async, New Arch migration** |

---

## Native boundary track (CV differentiator)

Study these three together - they map directly to CV keywords:

1. [15 - Bridge](./15-bridge.md) - why the old model hurts
2. [16 - Native Modules](./16-native-modules.md) - classic Android/iOS integrations
3. [17 - Turbo Modules](./17-turbo-modules.md) - modern New Architecture modules
4. Then review [07 - Native Integrations](./07-native-modules.md) for DataWedge / Wizer / patches / biometrics stories
5. Host OS literacy (Gradle / Xcode / permissions / signing): [native-developement](../native-developement/INDEX.md)

---

## Suggested study order (8-10h / day)

1. **01 Fundamentals** + **15/16/17 Bridge-Native-Turbo** - your differentiator
2. **06 Performance** + **12 Upgrades & Stability** - crash-rate stories
3. **03 State** + **04 Navigation** + **05 Networking** - daily RN interview core
4. **08 Push/Firebase** + **09 Fintech UX** - EasyPay / Wizer / Clean House
5. **11 CI/CD** + **13 Security** - senior/fintech expectations
6. **02 Architecture** + **07 Integrations** + **10 Testing**
7. **14 Behavioral** - rehearse daily 30-45 minutes

---

## Daily drill (any day)

1. Pick one chapter
2. Read topics + check off what you can already teach
3. Answer 5 interview questions out loud (no notes)
4. If studying native boundary: draw Bridge vs JSI/Turbo from memory
5. Rehearse one STAR story from chapter 14

---

## Progress tracker

- [ ] 01 Fundamentals
- [ ] 02 Architecture
- [ ] 03 State Management
- [ ] 04 Navigation
- [ ] 05 Networking & Data
- [ ] 06 Performance
- [ ] 07 Native Integrations
- [ ] 08 Push, Firebase & Device
- [ ] 09 Forms, UX & Fintech
- [ ] 10 Testing
- [ ] 11 CI/CD & Releases
- [ ] 12 Upgrades & Stability
- [ ] 13 Security
- [ ] 14 Behavioral Stories
- [ ] 15 Bridge
- [ ] 16 Native Modules
- [ ] 17 Turbo Modules
