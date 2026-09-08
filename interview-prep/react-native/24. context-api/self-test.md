# Context API — Self-test

## Core recall

1. What is Context **for** in this curriculum (one phrase: DI vs store)?
2. List the four **Use Context for** bullets.
3. List the two **Avoid Context for** bullets.
4. Recite the spoken answer sketch (Context / Zustand / RQ).
5. What happens to `useContext` consumers when Provider `value` changes (`Object.is`)?
6. Does Context have selectors?
7. What does **split contexts** prevent?
8. What does **auth presence at a coarse grain** mean (what is **not** in that Context)?
9. Why `useMemo` the Provider `value` object?
10. Does `React.memo` skip Context-driven re-renders?

## Explain why

1. Why is QueryClientProvider a **good** Context use?
2. Why is scroll position a **bad** Context value?
3. Why does a **fat** `{ theme, user, t }` context fan out re-renders?
4. Why split Theme vs Auth vs I18n?
5. Why is a **new** `value={{ mode, setMode }}` every render a bug even if `mode` is unchanged?
6. Why doesn’t `useMemo(() => ({ y }), [y])` fix scroll-in-Context?
7. Why can **coarse** `isAuthenticated` still be Context, but **full profile** should not?
8. Why is Context a poor **large business store**?
9. Why “Context is faster than Redux” is the wrong comparison?
10. Why `memo` on a consumer **doesn’t** make hot Context cheap?

## Compare and contrast

1. Context as DI vs Context as global store.
2. Context vs Zustand (what Zustand adds).
3. Context vs React Query.
4. Coarse auth presence vs session store + secure storage (taxonomy).
5. Theme in Context vs `selectedAccountId` in Zustand.
6. Split contexts vs one `AppContext`.
7. Stabilizing `value` with `useMemo` vs memoizing **children**.
8. This unit vs [taxonomy](../23.%20state-taxonomy/notes.md) (home vs **frequency**).

## Predict the output

1.

```tsx
<Foo.Provider value={{ theme }}>
```

Parent re-renders; `theme` string unchanged. Do consumers re-render? Why?

2. Same, but `value={useMemo(() => ({ theme }), [theme])}`. Parent re-renders. Consumers?

3. `ScrollCtx` value is `y` updated every frame. A `ThemeButton` uses **only** `useTheme()` (separate context). Does ThemeButton re-render on scroll? Why?

4. `ThemeButton` **also** `useContext(AppCtx)` where `AppCtx` includes `y`. Scroll?

5. `AuthCtx` value is `user` from `useQuery(['me'])`. Profile refetch every 30s. What happens to **all** auth consumers?

6. `QueryClientProvider client={queryClient}` and `queryClient` is `useState(() => new QueryClient())[0]` or a module singleton. Do screens re-render because of the Provider on every parent tick **if client identity is stable**?

## Debugging

1. Typing in a search box (state in Context) janks the whole tab bar. Diagnose.

2. Dark mode toggle re-renders **every** wallet row. `AppContext` holds `theme` + `transactions`. Fix direction?

3. Review: `value={{ isAuthenticated, login, logout }}` without `useMemo`. Parent is `App` with frequent setState. Symptom?

4. Someone `React.memo`s `WalletScreen`; it still re-renders on theme change. They think memo is broken. Explain.

5. i18n `t` is inline `value={{ t: (k) => dict[k] }}`. Locale never changes. Why do consumers still re-render every provider parent render?

6. Auth Context holds the **token string** and updates on every refresh. What’s the taxonomy + Context problem?

## Application

1. Recite Use / Avoid lists and the spoken sketch.

2. Sketch `app/providers` with QueryClient, Theme, I18n (no business store).

3. Write a `ThemeProvider` with `useMemo`’d `{ mode, setMode }`.

4. Classify: theme; scrollY; balances; QueryClient; `isAuthenticated`; `user` profile.

5. One-line PR: “Context value must …”

6. Split a fat `value={{ theme, isAuthenticated, selectedAccountId }}` into the right tools.

## Interview questions

1. Where does the Context API fit, and where does it fail?  
   **Follow-up:** Why not use it as the global store?

2. Redux vs Zustand vs Context — without dogma (include RQ in one clause).

3. How do you avoid rerender fan-out with Context?

4. Why isn’t `React.memo` enough?

5. Can you put auth in Context? When?

## Connections

1. How does this **refine** “theme = global client” from the taxonomy?
2. How do [app shell](../16.%20app-shell/notes.md) providers **use** this unit?
3. How does coarse auth Context relate to [nav `isAuthenticated`](../17.%20nav-architecture/notes.md) without duplicating the token?
4. What will **Zustand selectors** ([§3](../03-state-management.md)) give you that Context **cannot**?
5. Why must **server lists** never move into Context just to “share” them?
