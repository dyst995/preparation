# Context API — where it fits and where it fails

## What you need to know

[State taxonomy](../23.%20state-taxonomy/notes.md) said **theme** can be global client and **Context** is a possible home for **low-frequency** values. This unit is **when Context is the right tool** (dependency injection) and **why it is a bad high-frequency store**.

**Use Context for:**

- Theme
- I18n
- Auth **“presence”** at a **coarse** grain (sometimes)
- Injecting a **query client** or **services**

**Avoid Context for:**

- Rapidly changing values (scroll position, per-keystroke state)
- Large global **business** stores **without selectors**

**Mechanism:** `useContext` subscribes to the **whole** Provider `value`. When that value changes by `Object.is`, **every** consumer re-renders. There is **no** selector. Split + memoize, or **don’t** put hot data here.

Zustand (next section) exists because **selectors**. React Query exists because **server cache**. Context exists because **stable dependencies**.

Preserve the spoken answer:

> Context is great for low-frequency app-wide dependencies. It’s not my default global data store because any value change re-renders consumers unless carefully split and memoized. For complex client state I prefer Zustand; for server state, React Query.

---

## What Context is: dependency injection, not a database

**React Context** lets a **Provider** publish a value that **any descendant** can `useContext` without prop drilling.

That is **DI**: “here is the **theme** / **i18n** / **QueryClient** / `http` factory.” The value should be **stable** or **change rarely**.

```tsx
// app/providers — shell composes DI
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <I18nProvider>
      <RootNavigator />
    </I18nProvider>
  </ThemeProvider>
</QueryClientProvider>
```

`QueryClientProvider` **is** Context. The **client instance** is created **once**. Screens don’t drill `queryClient`. That’s the **good** use.

It is **not** “put `balances` and `selectedAccountId` and `scrollY` in one `AppContext`.” That’s a **store without subscriptions**.

---

## Why Context is a poor high-frequency store

**Consumer contract:** any `useContext(Foo)` re-renders when `Foo`’s Provider **value** identity changes.

```tsx
function ScrollProvider({ children }) {
  const [y, setY] = useState(0);
  return (
    <ScrollCtx.Provider value={y}>
      {children}
    </ScrollCtx.Provider>
  );
}
```

Every scroll tick updates `y` → **every** `useContext(ScrollCtx)` re-renders, including a **footer** that only needed `theme`. On RN that’s **JS thread** work and dropped frames.

**Per-keystroke** in Context (search query global) re-renders **all** consumers on **each** character. That state is **local UI** or a Zustand store with a **selector**.

**No selectors:** you cannot subscribe to `state.theme` without also seeing `state.user`. If they’re **one object**, **both** fields notify **everyone**.

---

## Split contexts to avoid rerender fan-out

**One fat context:**

```tsx
<AppCtx.Provider value={{ theme, isAuthenticated, user, t }}>
```

Login flips `isAuthenticated` → **theme-only** buttons re-render. i18n `t` is a **new function** every render → **even worse** if you don’t memo.

**Split:**

```text
ThemeContext     — changes when user toggles dark mode (rare)
I18nContext      — changes when locale changes (rare)
AuthPresence     — boolean / userId, changes on login/logout (rare)
QueryClient      — instance never changes
```

A **theme** leaf does not subscribe to **auth**. Fan-out is **scoped**.

**Auth “presence” coarse grain:** Context (or a tiny store) with **`isAuthenticated` / `userId`**, not the **full profile** that RQ **refetches**. Profile is **server state**. Putting `user` in Context and updating it on every `me` query **turns Context into a high-frequency store**.

---

## Context + memoization realities

**Myth:** “I’ll `React.memo` the screen and Context is free.” **`memo` does not skip Context updates.** If the component calls `useContext`, a value change **re-renders it**.

**What memoization *does* help:**

1. **Stabilize the Provider `value`** so you don’t notify consumers **by accident**:

```tsx
function ThemeProvider({ children }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
```

Without `useMemo`, `value={{ mode, setMode }}` is a **new object every parent render** → consumers re-render even when `mode` is unchanged.

2. **Memoize children** of a Provider whose **parent** re-renders often, **if** those children **don’t** consume the hot context — so the parent’s render doesn’t **also** walk a huge tree. That’s **separate** from Context subscription.

**Realities:** splitting + **stable values** is the real fix. `memo` everywhere is **not** a substitute for “don’t put `scrollY` in Context.”

```tsx
// Still wrong even with useMemo — y changes every frame
const value = useMemo(() => ({ y }), [y]);
```

---

## How it appears vs Zustand vs RQ (one line each)

| Need | Tool |
| --- | --- |
| Theme / i18n / QueryClient | **Context** (DI) |
| `selectedAccountId`, filter UI | **Zustand** (selectors) — next unit |
| Balances | **React Query** |
| Modal open | **`useState`** |

**Redux vs Context vs Zustand** without dogma: Context = **DI**. Zustand = **client store with selectors**. Redux = **complex client**. RQ = **server**. Taxonomy **first**.

---

## Common mistakes and misconceptions

- **AppContext holding everything** “to avoid prop drilling.”
- **New object every render** on `value`.
- Believing **`React.memo`** blocks Context.
- **Auth user object** in Context updated from **every** profile refetch.
- **Scroll / search / cursor** in Context.
- **“Context is faster than Redux.”** Wrong question — **subscription granularity**.
- Using Context **instead of** RQ for server lists.

---

## Connections to other concepts

`taxonomy (kind) → Context if low-frequency DI → Zustand if hot client → RQ if server`

- **[State taxonomy](../23.%20state-taxonomy/notes.md):** theme = global client; **this unit** picks **Context vs Zustand** by **frequency**.
- **[App shell](../16.%20app-shell/notes.md):** Providers in `app/` **are** these Contexts + QueryClient.
- **[Session](../17.%20nav-architecture/notes.md):** coarse **presence** for the **tree**; not a dump of profile.
- **§3 Zustand:** **selectors** are what Context **lacks**.
- **Re-render vs commit** (React web track): Context is a **notify all consumers** bus.

---

## Interview perspective

They ask **Redux vs Zustand vs Context**. Sort by **frequency and kind**, then say the sketch.

If they ask “why not Context for everything?”: **no selectors**, **fan-out**, **Object.is** on the whole value, **memo myths**.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
