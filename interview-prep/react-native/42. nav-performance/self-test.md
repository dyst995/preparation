# Navigation performance and UX — Self-test

## Core recall

1. Recite the interview point (jank / profile).
2. Recite the four topics to learn.
3. What does **`lazy`** defer?
4. After a lazy tab is **visited**, does it **unmount** when you leave (by default)?
5. **`freezeOnBlur`** vs **`unmountOnBlur`** — one line each.
6. **`detachInactiveScreens`** — what gets detached?
7. Why is **`lazy: false`** with four heavy tabs bad for **first paint**?
8. Native header vs **custom JS header** — which is cheaper **by default**?
9. Recite the spoken 30–60s perf answer.
10. Does switching to **JS stack** usually fix push jank?

## Explain why

1. Why lazy **first visit** still needs **`useFocusEffect`** for **return** visits?
2. Why **unmountOnBlur** makes **`useEffect([])`** look “fixed” — and why that’s **costly**?
3. Why **freeze** is often better than **unmount** for a **scrollable Wallet**?
4. Why **first tab paint** should not mount **Profile + Wallet + Payments** trees?
5. Why a **fat custom header** janks **push** animations?
6. Why **profile the screen** before **rewriting** navigators?
7. Why prefetching **all** tab queries at **bootstrap** fights this unit?
8. Why **lazy: false** can make **tab switch** feel snappier **after** a **slow** login?
9. Why **detach** is **native-view** memory, not the same as **unmounting** React state?
10. Why **design-system headers** on **every** stack screen are a **perf** decision?

## Compare and contrast

1. `lazy` vs `unmountOnBlur`.
2. `freezeOnBlur` vs `unmountOnBlur`.
3. Native header vs custom `header` component.
4. First-paint cost vs **tab-switch** cost.
5. Navigator cost vs **screen render** cost.
6. This unit vs [useFocusEffect](../41.%20use-focus-effect/notes.md).
7. This unit vs [native vs JS stack](../33.%20nav-building-blocks/notes.md).
8. This unit vs [lists](../10.%20lists/notes.md) windowing.

## Predict the output

1. Four tabs, `lazy: false`. Login → AppTabs. How many tab **roots** mount immediately?

2. `lazy: true`. Open App on Home. Wallet `useEffect([])`. Has it run?

3. User opens Wallet once, goes Home, back to Wallet. `lazy: true`, no unmountOnBlur. Wallet `useEffect([])` on **return**?

4. `unmountOnBlur` on Wallet. Leave and return. `useEffect([])`?

5. Custom header with a **live balance** on every native-stack push. Where is JS work during the **transition**?

6. You switch to **JS stack** “for performance”; Wallet is still a **500-row ScrollView**. Jank?

## Debugging

1. TTI after login is **4s**. All four tabs **`lazy: false`**. First fix?

2. Tab switch **janks**; Home is **light**. Wallet is **unfrozen**, **mounted**, **re-rendering** from a **global** store. Tool?

3. Scroll position **lost** every tab switch. They set **`unmountOnBlur`**. Diagnose.

4. Push **Confirm** janks; Confirm is **tiny**. **Search header** is a **custom** React tree. Where do you look first?

5. Review: “Replace native stack with JS stack to fix jank.” What do you require **before** that?

6. `freezeOnBlur` on Wallet; they **only** `useEffect([])` to refetch. Return to Wallet: data **stale**. Why? (lifecycle)

## Application

1. Recite interview point, four topics, spoken answer.

2. PR rule for **AppTabs** `lazy` + **don’t** mount all tab roots at login.

3. Choose **freeze** vs **unmount** for Wallet (scroll + filters).

4. Classify: lazy; freeze; detach; unmountOnBlur; custom header — **first paint / inactive CPU / memory / remount / JS bar**.

5. One-line: when a **custom header** is **worth it**.

6. Profile **checklist** before touching navigators (two items).

## Interview questions

1. Navigation feels janky — is it the navigator?  
   **Follow-up:** What do you actually profile?

2. How do you keep first paint fast with many tabs?

3. Freeze vs unmount inactive tabs?

4. Custom headers — when do they hurt?

5. `lazy` vs “screens stay mounted” — reconcile with [§9](../41.%20use-focus-effect/notes.md).

## Connections

1. How does **lazy** **change** when **`useEffect([])`** first runs vs [§9](../41.%20use-focus-effect/notes.md) **return** visits?
2. How does [native stack](../33.%20nav-building-blocks/notes.md) **header** advice **land** here?
3. How do [lists](../10.%20lists/notes.md) **dominate** “navigation” jank?
4. How does [shell boot](../16.%20app-shell/notes.md) **defer** relate to **not** mounting every tab?
5. Why the **question bank** is **not** this unit?
