# `useFocusEffect` — Answers

## Core recall

1. **Tabs keep screens mounted. `useEffect` won’t re-run on focus. Use `useFocusEffect` for refetch/logging.**
2. **Same:** visit ≠ remount, so mount effects **miss** return visits.
3. **Mount:** component **created**. **Focus:** user is **looking at** it.
4. **On focus** / **on blur** (and unmount).
5. **Stable identity** — otherwise the effect **restarts every render**.
6. **Boolean + re-render** vs **subscribe/cleanup** on visit.
7. **No** (default). Next unit: lazy/detach **can** unmount.
8. **Unmount may never run**; inactive tabs would **keep** listeners.
9. **No.** `staleTime` is **cache freshness**. **Focus** is **visit**. You **choose** both.
10. **Tabs stay mounted; useEffect misses comeback; useFocusEffect + useCallback; cleanup on blur.**

## Explain why

1. The instance **never unmounted**; `[]` already **committed**.
2. **Native stack** often **keeps** the previous screen **mounted** under the push.
3. RN Navigation **compares** the callback; **new fn** = **cleanup + setup**.
4. **Work while invisible**; **two** handlers when both tabs **listen**.
5. If Wallet **wasn’t** observing, or you need **“on look”** even when cache is **fresh**.
6. **App** foreground vs **this** screen. You can be **active** on **Home**.
7. **Two** focus pipelines.
8. **Remount** only. Tab **revisit** isn’t a mount.
9. First open **only**.
10. Dev double-invoke **still** needs **stable** callback + **correct** cleanup in **prod**.

## Compare and contrast

1. **Create / looking / not looking / destroy.**
2. **React tree** vs **navigation visit**.
3. **Render flag** vs **effect with cleanup**.
4. **Both blur** the left screen; **tab** usually **doesn’t unmount**; **stack** often **doesn’t** either.
5. **Time since fetch** vs **user returned**.
6. **Process** vs **screen**.
7. **API name** vs **when it matters**.
8. **Assume mounted** vs **opt-in unmount**.

## Predict the output

1. **No second refetch** (mount effect already ran).
2. **Refetch** on second visit (and first focus).
3. **On/off 10 times** — **duplicate** risk if `off` isn’t perfect; **refetch-like** churn.
4. **Updates** if Wallet’s **useQuery** is **still subscribed** (mounted). Focus refetch **not required** for that **invalidate**. (Focus still needed for **analytics** / **fresh look** with **long staleTime**.)
5. **Fetch on first mount** (empty cache).
6. **Both can pause.** `useIsFocused` **hides** on re-render; **focus effect cleanup** **stops** work **without** necessarily **re-rendering** the whole tree the same way. **Subscriptions → useFocusEffect.**

## Debugging

1. **`useFocusEffect`** log on focus.
2. **Unstable** callback → **effect loop**. **`useCallback` + deps**.
3. **Unsubscribe on blur** (move to **focus effect**).
4. **Remove one** listener path.
5. **Reset remounted** that screen. **Tab switch** still **won’t**. Don’t generalize.
6. **Put `refetch` in the dep array** (or **`queryClient.invalidateQueries`** stable).

## Application

1. Gotcha + bank Q + spoken paragraph.
2. `useFocusEffect(useCallback(() => { refetch(); const s = AppState.addEventListener(...); return () => s.remove(); }, [refetch]));`
3. **…use `useFocusEffect` + `useCallback`, not `useEffect([])`.**
4. First paint: **mount+focus**. Away: **blur**. Back: **focus**. Push: **blur** (still **mounted**). Pop: **focus**.
5. **Static** content; **just** invalidated; **costly** and **staleTime** is enough.
6. **Blur** is the **visit** end; **unmount** may **never** happen.

## Interview questions

1. **Spoken:** Screens **stay mounted**; **`useEffect` won’t re-run** when they **return**.  
   **Follow-up:** **`useFocusEffect`**. **`useCallback`** so we **don’t** resubscribe every render.

2. **Spoken:** **`useFocusEffect` → refetch/invalidate**. Mutation **invalidate** **also** helps if the query **stayed subscribed**.

3. **Spoken:** **Cleanup** of the focus effect: **listeners, polling**. Inactive tabs **mustn’t** keep them.

4. **Spoken:** Open Home then Wallet: Home **mounted, blurred**. Back to Home: **focus**, **no remount**.

5. **Spoken:** **One** pipeline; **`useCallback`**; **cleanup on blur**; don’t **also** `addListener('focus')` in `useEffect`.

## Connections

1. **Tabs keep section screens alive** → mount effects **once**.
2. **Mounted observer** **refetches** on **invalidate** even **unfocused**. **Focus** is for **visit** and **unsubscribed** cases.
3. **§1** named the hook; **this** is **tabs + refetch + cleanup**.
4. **Yes** if that screen was **dropped** from `routes`. **Tab switch** still **isn’t** that.
5. **Lazy / freeze / detach** can **unmount** — then **`useEffect` might** run again; **don’t** assume until that unit.
