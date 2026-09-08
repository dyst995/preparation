# `useFocusEffect` — Self-test

## Core recall

1. Recite the tab **gotcha** (`useEffect` vs focus).
2. Recite why `useEffect` is **insufficient** in tab navigators (interview bank).
3. Mount vs **focus** in one sentence each.
4. When does `useFocusEffect` **run**, and when does **cleanup** run?
5. Why **`useCallback`** around the focus callback?
6. `useIsFocused` vs `useFocusEffect` — what is each for?
7. Does switching tabs **unmount** Wallet by default?
8. Why **blur cleanup** matters in tabs more than “cleanup on unmount”?
9. `staleTime` vs **refetch on tab focus** — do they replace each other?
10. Recite the spoken 30–60s answer.

## Explain why

1. Why doesn’t `useEffect([])` re-run when you **return** to a tab?
2. Why can a **stack** previous screen also miss `useEffect` on **pop**?
3. Why an **unstable** focus callback **re-subscribes** every render?
4. Why **inactive** tab listeners are a **bug** (battery / duplicate toasts)?
5. Why **invalidate on transfer settle** might **still** need focus refetch on Wallet?
6. Why **AppState 'active'** is not the same as **Wallet focused**?
7. Why **double** `addListener('focus')` (effect + focus effect) double-fetches?
8. Why **RQ `refetchOnMount`** doesn’t fix **tab revisit**?
9. Why **analytics “screen view”** on `useEffect([])` **under-counts** in tabs?
10. Why **Strict Mode** doesn’t mean you can **skip** `useCallback`?

## Compare and contrast

1. Mount vs focus vs blur vs unmount.
2. `useEffect` vs `useFocusEffect`.
3. `useIsFocused()` vs `useFocusEffect`.
4. Tab switch vs **push** on a stack (focus of the **left** screen).
5. RQ `staleTime` vs focus `refetch`.
6. AppState vs navigation focus.
7. This unit vs [building blocks](../33.%20nav-building-blocks/notes.md) (intro vs **lifecycle**).
8. This unit vs next **lazy/freeze** (default **stay mounted**).

## Predict the output

1. Wallet `useEffect(() => { refetch(); }, [])`. User: Wallet → Home → Wallet. Network on second Wallet?

2. Same with `useFocusEffect(useCallback(() => { refetch(); }, [refetch]))`. Second visit?

3. `useFocusEffect(() => { bus.on('x', h); return () => bus.off('x', h); })` **without** `useCallback`. Parent re-renders 10 times while **focused**. What happens to listeners?

4. `useQuery` `staleTime: 60_000`, no focus refetch. Transfer on other tab **invalidated** `walletKeys` while Wallet **mounted**. Wallet UI?

5. Same query, Wallet **unmounted** (lazy never visited). Transfer invalidates. User opens Wallet first time. Fetch?

6. `useIsFocused()` gates a video. User switches tab. Video should **pause** — does `useFocusEffect` **cleanup** also work? What’s the difference?

## Debugging

1. Analytics fires **once per session** for Wallet. They used `useEffect`. Fix?

2. Focus refetch **loops** (network spam) while sitting on Wallet. `useFocusEffect` **missing** `useCallback`. Diagnose.

3. Two toasts per event on Home (even when on Wallet). `eventBus` in `useEffect([])` **no** blur cleanup. Diagnose.

4. They wrap `useFocusEffect` correctly but **also** `navigation.addListener('focus')` in `useEffect`. Symptom?

5. After [reset](../40.%20nav-resets/notes.md) to WalletHome, `useEffect([])` **does** run. They conclude **tabs remount on every visit**. What’s the confusion?

6. `refetch` **not** in the `useCallback` dep array; always refetches **stale closure**. What’s the fix (without dropping `useCallback`)?

## Application

1. Recite gotcha, interview Q answer, spoken paragraph.

2. Write `useFocusEffect` + `useCallback` that **refetches** on focus and **removes** an AppState listener on blur.

3. PR rule: “Tab screens that must run on every visit …”

4. Classify: first paint Wallet; switch away; switch back; push TxDetails; pop. Mount vs focus for Wallet.

5. When would you **not** refetch on every focus?

6. One-line: cleanup on **blur** vs unmount in tabs.

## Interview questions

1. Why might `useEffect` be insufficient in tab navigators?  
   **Follow-up:** What do you use instead? `useCallback`?

2. How do you refresh Wallet when the user comes back to the tab?

3. What runs on **blur**? Why clean up there?

4. Mount vs focus — example with Home / Wallet.

5. How do you avoid duplicate subscriptions?

## Connections

1. How does [tab mounting](../34.%20nested-nav-architecture/notes.md) **cause** this bug?
2. How does [RQ invalidation](../27.%20react-query/notes.md) **interact** with a **mounted** Wallet?
3. How did [§1](../33.%20nav-building-blocks/notes.md) **preview** this hook?
4. After a [nested reset](../40.%20nav-resets/notes.md), might **mount** fire again?
5. What will [§10](../04-navigation.md) **change** about “screens stay mounted”?
