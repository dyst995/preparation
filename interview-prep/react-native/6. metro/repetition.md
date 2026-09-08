# Metro bundler — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Metro’s job (resolve, transform, bundle, serve/package). Metro vs Hermes vs Gradle/Xcode.
- [ ] Fast Refresh vs full reload. `.ios` / `.android` / `.native` — what each is for.
- [ ] Dev server vs release bundle in the binary. How a local image is included.
- [ ] Why Fast Refresh can leave a module-scope `Map` stale. Why it won’t pick up Kotlin changes.
- [ ] Two Metro incident classes: cache, monorepo, symlinks, or case.

## Predict / debug

- [ ] `Button.ios.tsx` and `Button.tsx`; iOS `import './Button'` — which file? Explain why.
- [ ] Fast Refresh after a JSX edit — does `useState` typically reset? Module-top `let id = 0` footgun?
- [ ] “Unable to resolve `./Foo`”; file is `foo.tsx` on a Mac. CI fails. What do you check?
- [ ] Junior: “Metro is broken in prod, no Fast Refresh.” Correct them. Yarn-linked lib resolves empty — usual story?

## Say it out loud

- [ ] Explain Metro in 30–60 seconds as if an interviewer asked.
- [ ] What does Metro do? Follow-ups: Fast Refresh vs reload? Platform files? Dev vs release?
- [ ] What’s the difference between Metro and Hermes?
