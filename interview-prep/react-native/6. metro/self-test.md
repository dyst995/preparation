# Metro bundler — Self-test

## Core recall

1. What is Metro’s job in one or two sentences?
2. Name the four verbs: resolve, transform, bundle, serve/package — what does each mean?
3. What is Fast Refresh vs a full reload?
4. What file might `import './Button'` load on iOS vs Android?
5. What is `.native.tsx` for, versus `.ios.tsx`?
6. How do you include a local image in RN (Metro-shaped API)?
7. Dev vs release: how does the JS reach the device?
8. Name two classic Metro incident classes (cache, monorepo, symlinks, case).

## Explain why

1. Why does RN need a bundler at all (phones don’t run your `src/` tree)?
2. Why can Fast Refresh leave a **module-scope** `let cache = new Map()` stale?
3. Why doesn’t Fast Refresh pick up a Kotlin native-module change?
4. Why can `Button.ios.tsx` work locally and fail in Linux CI?
5. Why is “clear Metro cache” a reasonable first step without being a personality?
6. Why isn’t Metro the right answer to “why is scroll janky?”

## Compare and contrast

1. Metro vs Hermes
2. Metro vs Gradle/Xcode
3. Fast Refresh vs full reload
4. Dev Metro server vs release bundle in the binary
5. `.ios.tsx` vs `Platform.OS === 'ios'` inside one file
6. `require('./logo.png')` vs `source={{ uri: 'https://...' }}`

## Predict the output

1. You have `Button.ios.tsx` and `Button.tsx`. iOS import `'./Button'` — which file? Explain.

2. You edit a component’s JSX. Fast Refresh succeeds. Does `useState` in that component typically reset? Explain.

3. You change `let id = 0` at module top that increments in a helper. Fast Refresh, then you test. What’s a likely footgun?

4. Monorepo: app imports `@repo/ui`, Metro never watched that package. What error class?

## Debugging

1. Redbox: “Unable to resolve module `./Foo`.” It exists as `foo.tsx` on a case-insensitive Mac. What do you check for CI?

2. After many Fast Refresh cycles the screen is nonsense. First action?

3. Yarn link to a local library; Metro resolves an empty package. What’s the usual Metro story?

4. Release has no Fast Refresh; a junior says Metro is “broken in prod.” Correct them.

## Application

1. Write the pipeline from TS file to Hermes on a release device.

2. List the platform cascade in words for `import './Button'` (iOS).

3. Write a one-liner you’d put in the team README for Metro ghosts.

4. When would you add `watchFolders` in `metro.config.js`?

## Interview questions

1. What does Metro do?  
   **Follow-ups:** Fast Refresh vs reload? Platform files? Dev vs release?

2. How do platform-specific files get picked?

3. How do you debug “works on my machine, Metro fails in CI”?

4. What’s the difference between Metro and Hermes?

5. How are images bundled?

## Connections

1. How does Metro feed Hermes without being the engine?
2. How does this unit enable the “platform files vs Platform.select” section?
3. How does `__DEV__` differ between Metro-served debug and a store build?
4. Why is Metro irrelevant to naming JS vs UI thread jank?
5. How do Fast Refresh and a module singleton interact with “I didn’t change state but the bug remains”?
