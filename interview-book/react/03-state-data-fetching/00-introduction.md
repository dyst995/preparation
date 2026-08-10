# 03 - State & Data Fetching — Introduction

> Source: `interview-prep/react/03-state-data-fetching.md`

# 03 - State & Data Fetching

> Goal: Build a precise, defensible mental model for local state, Context, Redux Toolkit, Zustand, and React Query/TanStack Query - and a decision framework for "which one, when" that matches your actual production stack.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this chapter you should be able to:

1. Classify any piece of state into one of: local UI state, shared client state, global app state, or server state.
2. Explain why "server state" is fundamentally different from client state and why treating it like client state causes bugs.
3. Explain Context's re-render pitfall precisely and know 3+ mitigations.
4. Explain Redux Toolkit's core concepts: store, slice, reducer, `createSlice`, immutability via Immer, `createAsyncThunk`, selectors, and normalization.
5. Explain Zustand's model: no provider, selector-based subscriptions, middleware (persist, devtools), and why it avoids Redux boilerplate.
6. Explain React Query's core concepts: query keys, cache, staleness vs garbage collection, background refetching, mutations, invalidation, optimistic updates.
7. Justify, with concrete tradeoffs, why a modern stack splits server state (React Query) from client state (Redux/Zustand) instead of putting API data in Redux.
8. Answer "why three state tools" without sounding like over-engineering - articulate the boundaries precisely.
9. Recognize and fix common anti-patterns: prop drilling, over-using Context for frequently-changing values, duplicating server data into client stores, redundant `useEffect` + `fetch` when React Query already solves it.

---
