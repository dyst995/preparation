# 04 — Navigation

> Goal: Design robust React Navigation flows for auth, nested apps, deep links, and notification-driven routing — without back-stack bugs.

---

## Learning objectives

1. Choose the right navigator types and nest them correctly.
2. Implement auth-gated navigation without flicker or back-to-login bugs.
3. Type routes and params properly with TypeScript.
4. Design deep linking that is secure and testable.
5. Route users from push notifications to the right screen.
6. Know when data should be route params vs fetched state.
7. Reset stacks cleanly on logout / flow completion.

---

## 1. React Navigation building blocks

### Topics to learn
- [ ] Native Stack vs JS Stack
- [ ] Bottom Tabs
- [ ] Drawer (if used)
- [ ] Nested navigators
- [ ] NavigationContainer + linking config
- [ ] Common hooks: `useNavigation`, `useRoute`, `useFocusEffect`
- [ ] Screen options, headers, presentation modes (modal/card)

### Native Stack vs Stack

- **Native Stack**: uses platform native navigation primitives; generally better transitions/performance/feel.
- **JS Stack**: more flexible in some edge cases, but native stack is the usual default today.

### Interview answer

> “I default to native stack for platform-feel and performance, nest tab navigators for primary sections, and push feature stacks for flows like transfers or KYC. Nesting is deliberate — each navigator has a clear responsibility.”

---

## 2. Nested navigation architecture

### Typical production shape

```text
NavigationContainer
  RootStack
    Bootstrap
    AuthStack
      Login
      Register
      ForgotPassword
    AppTabs
      HomeStack
      WalletStack
      PaymentsStack
      ProfileStack
    ModalStack (optional)
      Receipt
      Help
```

### Rules of nesting

- Tabs own top-level sections
- Each tab often has its own stack for hierarchy
- Cross-tab jumps need care (navigate to tab first, then screen)
- Don’t put every screen in one giant flat stack if the product has clear sections

### Common gotcha

Navigating to a screen in another tab without targeting the right nested navigator ? “action not handled” / unexpected back behavior.

---

## 3. Auth flow patterns

### Topics to learn
- [ ] Hydration gate (don’t decide auth route before rehydration)
- [ ] Conditional trees vs imperative redirects
- [ ] Preventing back navigation to auth after login
- [ ] Handling forced logout (401) mid-session
- [ ] Session expiry UX

### Recommended pattern

1. On launch, show bootstrap/splash while reading secure storage.
2. Set auth state once.
3. Render either `AuthStack` or `AppStack`.
4. On login success, auth state change swaps trees (no `navigate('Home')` hacks required).
5. On logout, reset auth state and clear app state; auth tree mounts fresh.

### Why conditional trees beat redirect soup

- Harder to “back” into Login after entering app
- Single source of truth
- Deep links can wait until hydrated

### Interview question

**Q: How do you structure logged-out vs logged-in navigation?**

> “I gate on hydrated auth state. Unauthenticated users get an Auth stack; authenticated users get the App stack. Switching is driven by state, not by manually navigating between login and home. That prevents back-stack leaks and simplifies deep linking.”

---

## 4. Type-safe navigation (TypeScript)

### Topics to learn
- [ ] Param lists per navigator
- [ ] Composite navigation types for nested navigators
- [ ] `NativeStackScreenProps` / `BottomTabScreenProps`
- [ ] Avoiding `any` on `route.params`
- [ ] Central route name constants

### Why interviewers care

It shows production discipline and reduces runtime route bugs.

### Be ready to explain

- How params are declared
- How a screen reads typed params
- How nested navigators complicate typing and how you handle it

---

## 5. Params vs global/fetched state

### Use route params for
- IDs (`transferId`, `accountId`)
- Flow flags for this journey (`fromQr: true`)
- Small, serializable handoff data

### Do not put in params
- Huge objects / full API models (stale risk)
- Sensitive secrets
- Data that can change while the screen is open (prefer fetch by ID)

### Interview answer

> “I pass identifiers and flow context as params, then fetch authoritative data on the screen with React Query. That avoids stale param objects and keeps deep links simple.”

---

## 6. Deep linking & universal links

### Topics to learn
- [ ] URL schemes vs universal links / app links
- [ ] React Navigation `linking` config
- [ ] Mapping path ? screen hierarchy
- [ ] Waiting for auth hydration before resolving private links
- [ ] Fallback when link target is invalid
- [ ] Testing on iOS/Android
- [ ] Security: don’t trust link params blindly

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

> “The OS opens the app with a URL. React Navigation’s linking config maps path patterns to screens in the navigator tree. I configure prefixes, screen paths, and parse params. For private screens I ensure auth hydration and authorization before navigating.”

**Q: How do you test deep links?**

> “On Android via `adb shell am start` with an intent URI; on iOS via `xcrun simctl openurl` or universal link setup. I also test cold start, warm start, and logged-out scenarios.”

---

## 7. Push notification ? screen routing

### Topics to learn
- [ ] Notification payload conventions (`type`, `entityId`)
- [ ] Handling taps in foreground/background/killed states
- [ ] Deduplicating navigation actions
- [ ] Combining with deep link infrastructure
- [ ] Notifee / FCM interaction points

### Robust approach

- Define a small router: `notification.type ? navigation action`
- Centralize it (don’t scatter navigation in every push handler)
- Ensure NavigationContainer is ready before navigating
- Queue navigation intents if app still bootstrapping

### Interview question

**Q: How do you open a specific screen from a notification?**

> “The notification payload carries a type and entity id. A central handler waits until navigation and auth are ready, maps that payload to a typed navigation action, and routes into the correct nested screen. I reuse the same validation rules as deep links.”

---

## 8. Navigation resets & common flow completions

### When to reset

- Logout
- Finished onboarding
- Completed payment flow that shouldn’t back into intermediate confirm pages
- Switching organizations/accounts (if multi-tenant)

### Tools/concepts

- `CommonActions.reset`
- Replacing screens instead of endless pushes
- Nested reset when needed

### Example: payment success

After success, reset to `Receipt` with params, or replace confirm screens so back goes to wallet home, not amount entry.

---

## 9. `useFocusEffect`, lifecycle, and data refresh

### Topics to learn
- [ ] Difference between mount and focus in nested tabs
- [ ] Refreshing data when a tab becomes focused
- [ ] Cleanup on blur
- [ ] Avoiding duplicate event subscriptions

### Gotcha

In tabs, screens may stay mounted. `useEffect` won’t re-run on focus. Use `useFocusEffect` for focus-driven refetch/logging.

---

## 10. Performance & UX considerations

### Topics to learn
- [ ] Lazy tab screens if appropriate
- [ ] Heavy screen detach options / freeze (where used)
- [ ] Avoid mounting enormous trees on first tab paint
- [ ] Header mode and custom headers cost

### Interview point

Navigation jank is often from screen render weight, not the navigator itself. Profile the screen first.

---

## Interview question bank

1. Native stack vs stack — which and why?
2. How do you structure auth vs app navigation?
3. How do you prevent returning to Login after authentication?
4. How do you type route params?
5. Params vs React Query fetch — what goes where?
6. How do deep links map to nested navigators?
7. How do you handle deep links when logged out?
8. How do notifications route into screens?
9. How do you reset navigation after logout?
10. Why might `useEffect` be insufficient in tab navigators?
11. How do you navigate to a screen inside another tab?
12. What security concerns exist with deep links?

---

## Model end-to-end answer (EasyPay-like)

> “Root navigation waits for auth hydration. Auth stack handles login/biometrics. App uses tabs for Home/Wallet/Payments/Profile, each with a native stack. Transfer is a nested flow with amount ? review ? success; on success I reset so back doesn’t reopen the wizard. Deep links and notification payloads share a central router that validates IDs and auth before navigating. Tokens never travel in URLs.”

---

## Hands-on drills

- [ ] Draw auth-gated navigation tree from memory.
- [ ] Write a linking config for: login, wallet, transfer details, profile.
- [ ] Implement a notification payload router table on paper.
- [ ] Practice explaining logout reset + cache clear together.
- [ ] List 5 deep-link edge cases (logged out, invalid id, expired session, unknown type, cold start).

---

## Green flags / red flags

**Green**
- Hydration-aware auth gating
- Centralized link/notification routing
- Typed params
- Intentional resets after irreversible flow steps

**Red**
- `navigate('Home')` as the auth strategy
- Passing full objects in params as a habit
- Deep links that ignore auth
- Notification handlers calling navigate everywhere ad hoc

---

## Tie to your CV

- EasyPay: auth, QR payments, transfers, deep links, push notifications
- Be ready to walk through one concrete flow: notification tap ? transfer details ? user action

---

## Mastery checklist

- [ ] I can whiteboard a production navigator tree quickly
- [ ] I can explain auth gating and deep link timing
- [ ] I can design notification routing safely
- [ ] I know when to reset vs push vs replace
- [ ] I can discuss TypeScript typing for nested navigators
