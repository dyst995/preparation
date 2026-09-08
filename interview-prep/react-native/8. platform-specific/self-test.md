# Platform-specific code — Self-test

## Core recall

1. What does `Platform.OS` return (typical RN app)?
2. What is `Platform.select` for?
3. When do you use `.ios.tsx` / `.android.tsx` vs `Platform.select`?
4. What is `.native.tsx` versus `.ios.tsx`?
5. When is a **native module** the right row in the table, not more `Platform.OS`?
6. What is “platform soup”?
7. Who actually **picks** `Button.ios.tsx` — React at runtime, or Metro?
8. Should payment **rounding** live behind `Platform.OS`? Why or why not?

## Explain why

1. Why isolate platform checks at the UI/native boundary?
2. Why is duplicating a whole screen for 8px padding a bad split?
3. Why can a large `Platform.OS` JSX fork be worse than two files?
4. Why doesn’t `Platform.OS` replace a Turbo Module for biometrics?
5. Why is `Platform.OS` the wrong tool for “tablet layout”?
6. Why mention `default` in `Platform.select`?

## Compare and contrast

1. `Platform.select` vs `if (Platform.OS === 'ios')`
2. Platform files vs runtime `Platform.OS`
3. `.ios.tsx` vs `.native.tsx`
4. Platform file vs native module
5. Platform.OS vs Platform.Version
6. UI-layer platform code vs domain-layer platform code

## Predict the output

1. `metro` iOS bundle, `import './Sheet'` with `Sheet.ios.tsx` and `Sheet.android.tsx`. Which module loads? Explain.

2.

```ts
Platform.select({ android: 8, default: 12 })
```

on iOS — value? Explain.

3. Domain function `calculateFee()` starts with `if (Platform.OS === 'android')`. What’s the design smell?

4. You add `Button.native.tsx` and `Button.web.tsx` (RN-web). iOS import `'./Button'` — which family of file? Explain.

## Debugging

1. Reviewer: 12 `Platform.OS` checks in `usePayment.ts`. What do you ask them to do?

2. Two 300-line files `Form.ios` / `Form.android` that differ by one shadow. What’s the fix?

3. iOS builds, Android redbox “Unable to resolve `./Camera`” — only `Camera.ios.tsx` exists. What’s missing?

4. Tests fail on Jest `ios` because a file imported `something.android` via a deep relative path. What’s the lesson?

## Application

1. Recite the four-row decision table from memory.

2. Write a `Platform.select` for iOS shadow vs Android elevation (values dummy).

3. When would you split `ShareReceipt.ios.tsx` / `.android.tsx`?

4. Draw a mini folder: `model/` vs `ui/` — where may `Platform` live?

## Interview questions

1. `Platform.OS` vs separate files?  
   **Follow-ups:** `select` vs `if`? When native module? Platform in domain?

2. How do `.ios` files get chosen?

3. How do you keep a feature testable across platforms?

4. What’s an example of platform soup you’ve seen (or would reject in review)?

5. `.native` vs `.ios` — when?

## Connections

1. How does Metro make file splits possible?
2. How does architecture “domain vs UI vs native” use this table?
3. How do core components (shadows, Pressable) often stay on `select`?
4. How does New Architecture change the **native module** row, not `Platform.select`?
5. How is this different from flavors/environments (`dev` vs `prod`)?
