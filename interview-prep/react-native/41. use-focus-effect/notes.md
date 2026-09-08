# `useFocusEffect`, lifecycle, and data refresh

## What you need to know

[Building blocks](../33.%20nav-building-blocks/notes.md) introduced **`useFocusEffect`**. This unit is **why tabs break `useEffect`**, **refetch on visit**, **blur cleanup**, and **duplicate subscriptions**.

**Learn:**

- **Mount vs focus** in nested tabs
- Refreshing data when a tab **becomes focused**
- **Cleanup on blur**
- Avoiding **duplicate** event subscriptions

**Gotcha (preserve):**

> In tabs, screens may stay mounted. `useEffect` won’t re-run on focus. Use `useFocusEffect` for focus-driven refetch/logging.

**Interview bank Q:** *Why might `useEffect` be insufficient in tab navigators?* — **same gotcha.**

**Lazy / freeze / detach** (whether a tab **unmounts**) is **next**. Default mental model: **stay mounted**.

---

## Mount ≠ focus

**Mount:** React **created** the screen component (effects with `[]` ran). **Unmount:** it **left the tree**.

**Focus:** this screen is the **one the user is looking at** (active tab, top of the **visible** stack). **Blur:** another screen **took** that.

In **bottom tabs**, switching Home → Wallet **does not unmount** Home (unless **lazy** first visit, or **detach** — next unit). **`useEffect([])` already ran** on first open. Coming **back** to Home: **no remount** → **no** second `useEffect`.

**Stacks:** Amount → Confirm often **keeps Amount mounted** underneath. Amount’s `useEffect([])` **does not** re-run when you **pop** back. If you needed **“every time they see Amount”**, that’s **focus**, not mount.

**Mental model:** **lifecycle of the component** vs **lifecycle of the visit**.

---

## `useFocusEffect`

From `@react-navigation/native`. Runs the callback when the screen **gains focus**; **cleanup** when it **blurs** (or **unmounts**).

```ts
useFocusEffect(
  useCallback(() => {
    refetch(); // or analytics('wallet_view')
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
    };
  }, [refetch]),
);
```

**`useCallback` is required.** An **inline** function is a **new** identity every render → React Navigation **tears down and re-runs** the effect **every render** → **duplicate listeners**, **refetch storms**, **blur cleanup** flapping.

**`useIsFocused()`:** boolean; **re-renders** on focus/blur. Useful for **pausing** a heavy UI. **Not** a substitute for **subscribe/cleanup** (you’d still need an effect **on that boolean**). Prefer **`useFocusEffect`** for **subscriptions**.

---

## Refetch when the tab is focused

**Wallet** with **stale balances** after a transfer on **Payments** tab: Wallet **never remounted**, so **`useQuery`** may still show **cached** data depending on **`staleTime`**.

**Options:**

| Approach | When |
| --- | --- |
| **`useFocusEffect` → `queryClient.invalidateQueries` / `refetch()`** | **Every visit** must **hit** (or **mark stale**) — fintech **Wallet** |
| **RQ `staleTime: 0`** + **refetchOnMount** | Helps **remount**, **not** tab **refocus** |
| **Invalidate on mutation settle** | Transfer **already** invalidates `walletKeys.all` — Wallet **observers** **if mounted** **refetch in background**. **Still** use focus if they **weren’t** subscribed or you need **analytics** |

**Don’t** refetch **the world** on every focus if **`staleTime`** already matches the **product**. **Do** refetch **balances** on Wallet **focus** if the product **promises** fresh money **when they look**.

**AppState `active`:** process **foreground** ≠ **this tab focused**. Combine **both** only if you need **“look at Wallet after returning from banking app.”**

---

## Cleanup on blur

Focus effect **return** runs on **blur**:

- Remove **AppState** / **event** listeners
- Stop **polling** / **WebSocket** for **this** screen
- Cancel **in-flight** **non-RQ** work if it’s **visit-scoped**

If you **subscribe** in `useEffect([])` and **never** clean up on **blur**, **inactive tabs** keep **listening** (battery, **duplicate** toasts). **Cleanup on unmount only** is **too late** in tabs — **unmount may never happen**.

---

## Duplicate subscriptions

| Cause | What you see |
| --- | --- |
| **`useFocusEffect` without `useCallback`** | Subscribe **every render** |
| **`useEffect` + `useFocusEffect` both** `addListener('focus')` | **Double** refetch |
| **Screen + parent** both listen | **Two** analytics events |
| **Strict Mode** double-mount in **dev** | Know it; **cleanup** still must be **idempotent** |

```ts
// Wrong — new function every render
useFocusEffect(() => {
  const s = eventBus.on('tick', handler);
  return () => s.off();
});
```

---

## Common mistakes and misconceptions

- **`useEffect` = every time I open this tab.**
- **`useFocusEffect` without `useCallback`.**
- **Refetch on focus** **and** `staleTime: 0` **and** invalidate on mutation — **triple** network without thinking.
- **AppState** confused with **tab focus**.
- **`useIsFocused()`** wrapping a **subscription** **without** cleanup.
- Thinking **native stack pop** **always remounts** the previous screen.

---

## Connections to other concepts

`tabs keep mounted → useEffect([]) already ran → useFocusEffect (useCallback) → refetch / cleanup on blur`

- **[Building blocks](../33.%20nav-building-blocks/notes.md):** **hook exists**; this unit **lifecycle**.
- **[React Query](../27.%20react-query/notes.md):** **staleTime** ≠ **tab refocus**.
- **[Nested tabs](../34.%20nested-nav-architecture/notes.md):** **why** they stay mounted.
- **[Nav resets](../40.%20nav-resets/notes.md):** **reset** may **remount**; **tab switch** **won’t**.
- Next: **lazy / freeze** **change** whether **unmount** happens.

---

## Interview perspective

They want the **gotcha** in one breath. Follow-up: **`useCallback`**; **blur cleanup**; **RQ**.

Spoken:

> In tab navigators screens often stay mounted, so useEffect on mount won’t run when the user comes back. I use useFocusEffect — with useCallback — to refetch or log on focus and unsubscribe on blur. That’s why useEffect is insufficient for “every time they visit Wallet.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
