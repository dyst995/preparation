# Avoiding Waterfalls

## What you need to know

A **waterfall** is work that **could overlap** but instead runs **strictly one after another**, stretching total wait time to roughly the **sum** of each step instead of the **max**.

Two related flavors in React apps:

1. **Request waterfall** — network fetches start only after prior fetches finish, often because of **component mount order**, not because of a real data dependency.  
2. **Render waterfall** — render → discover need → fetch → re-render → discover more → fetch again (multiple round trips for one view).

Skill: distinguish **accidental** (structural) serialization from **necessary** (data-dependent) sequencing (`enabled: !!id`).

Prerequisites: [server state / React Query](../21.%20server-state-react-query/notes.md), [code splitting](../30.%20code-splitting/notes.md) (lazy chunk waterfalls are cousins).

---

## Request waterfalls — the problem (preserved)

```text
Ideal (parallel):   |==== user ====|
                    |=== profile ===|
                    |==== posts ====|
                    total ≈ max(durations)

Waterfall:          |== user ==||== profile ==||== posts ==|
                    total ≈ sum(durations)
```

Classic cause: parent fetches, returns spinner until done, **then** mounts child; child’s `useQuery` only runs after mount.

```jsx
// BAD: accidental waterfall — all keys only need userId, known up front
function Page({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  if (!user) return <Spinner />;
  return <Profile userId={userId} />; // Profile's query starts only now
}

function Profile({ userId }) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });
  if (!profile) return <Spinner />;
  return <Posts userId={userId} />; // Posts starts only after profile
}
```

Nothing in the **data** requires waiting for `user` before `profile` — only **render gating** serialized them.

---

## Fix: parallel fetch when params are known (preserved)

```jsx
function Page({ userId }) {
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });
  const postsQuery = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchPosts(userId),
  });

  if (userQuery.isLoading || profileQuery.isLoading || postsQuery.isLoading) {
    return <Spinner />;
  }
  return (
    <PageContent
      user={userQuery.data}
      profile={profileQuery.data}
      posts={postsQuery.data}
    />
  );
}
```

All three hooks run on the **first** render → requests start **together**.

Other shapes of the same idea:

- Lift independent queries to a **common ancestor**.  
- Keep nested components but **don’t early-return** before children mount if those children should fetch independently (or prefetch).  
- `Promise.all` / parallel `fetch` in a single loader when not using RQ.  
- Router **loaders** / SSR prefetch that kick off all needed queries before paint.

Partial UI: show shell + each section’s own spinner so slow posts don’t block showing user header — still start all fetches in parallel.

---

## Real dependencies vs accidental ones (preserved)

If query B needs a field from A’s **response**, sequential is correct:

```jsx
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});

const { data: org } = useQuery({
  queryKey: ['org', user?.organizationId],
  queryFn: () => fetchOrg(user.organizationId),
  enabled: !!user?.organizationId, // real data dependency
});
```

| Kind | Test | Action |
| --- | --- | --- |
| **Accidental** | Could I start B with props/URL I already have? | Parallelize |
| **Necessary** | Does B need a value only A’s response provides? | Gate with `enabled` / await A |

Don’t “parallelize” org fetch with a fake `organizationId` — that’s a bug, not an optimization.

---

## How to spot request waterfalls

**Network tab:** request bars start **end-to-end** (staircase) instead of **aligned starts**.

```text
Waterfall:   [req1====]
                      [req2====]
                                [req3====]

Parallel:    [req1====]
             [req2====]
             [req3====]
```

Also: waterfalls of **lazy JS chunks** (parent chunk → then child lazy) look similar — fix with coarser boundaries or preload ([code splitting](../30.%20code-splitting/notes.md)).

---

## Render waterfalls (preserved)

Distinct but related:

```text
render → “need X” → fetch X → render → “need Y from X” → fetch Y → render …
```

Multiple **render–fetch–render** round trips for one screen when you could:

- Know required resources up front and fetch in parallel, or  
- Use one aggregated API / loader that returns the view model, or  
- Accept a **necessary** chain but avoid *extra* accidental hops (don’t nest three more mount-gated fetches on top).

Example smell: mount → fetch list → mount row → each row fetches details only after list paints, when detail ids were knowable from a bulk endpoint.

---

## Prefetching and cache (RQ-flavored)

Even with nested UI, you can **prefetch** at the parent so children hit warm cache:

```jsx
// on page entry or link hover
queryClient.prefetchQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
```

Child still “owns” the query hook; network already started. Useful when you want composition without mount-order waterfalls.

---

## Interview answer (preserved)

**Q: What's a request waterfall, and how do you spot/fix one?**

> “It’s when requests that could run in parallel run sequentially instead, usually because of how components are nested rather than because of a real data dependency — a child component’s query doesn’t start until its parent’s query resolves and the child mounts. I’d spot it in the Network tab as requests starting one after another instead of together. The fix is either fetching in parallel at a shared point using the params already available up front, or, if one query *does* genuinely need another’s result, explicitly gating it with something like React Query’s `enabled` option rather than accidentally serializing everything through component mount order.”

---

## Common mistakes and misconceptions

1. Treating every sequential pair as a bug — some deps are real.  
2. Early-returning spinners that unmount/defer children that could fetch now.  
3. Parallelizing without the needed id (race / bad requests).  
4. Fixing only UI spinners while Network still staircases.  
5. Confusing render waterfalls with CSS layout thrashing.  
6. Ignoring JS chunk waterfalls from nested `React.lazy`.  
7. Assuming nested components *must* own fetches that only need URL params.

---

## Connections to other concepts

```
known params (userId from route)
  → independent queries should start together
  → accidental waterfall if gated on parent data arrival

user.organizationId from response
  → enabled: !!…
  → necessary sequence

Network staircase
  → diagnose waterfalls

code-splitting spinner chains
  → cousin: resource waterfall (JS instead of JSON)

React Query
  → parallel hooks / prefetch / enabled
```

---

## Interview perspective

Be ready to:

1. Define request vs render waterfall.  
2. Draw parallel vs sum timing.  
3. Accidental vs `enabled` necessary deps.  
4. Spot via Network tab.  
5. Fix patterns: lift queries, parallel hooks, prefetch, aggregate API.  
6. Mention lazy/chunk waterfalls briefly.

---

# Self-test

## Core recall

1. What is a request waterfall?
2. Why do nested `useQuery` + early `return <Spinner />` patterns cause them?
3. How do you spot one in DevTools?
4. What is the usual fix when all queries only need URL/`userId`?
5. When is sequential fetching correct?
6. What does React Query `enabled: !!user?.organizationId` express?
7. What is a render waterfall?
8. How can prefetch help without flattening the component tree?

## Explain why

1. Why is total time roughly a **sum** under a waterfall but a **max** when parallel?
2. Why is “Profile waits for User” often accidental if both only need `userId`?
3. Why is gating org fetch on `user.organizationId` not an accidental waterfall?
4. Why doesn’t showing three section spinners by itself fix a Network staircase?
5. Why can `React.lazy` nesting create a similar waterfall?
6. Why might an aggregate backend endpoint beat three parallel client fetches sometimes?

## Compare and contrast

1. Accidental vs necessary sequential requests  
2. Request waterfall vs render waterfall  
3. Parallel queries at parent vs mount-gated child queries  
4. `enabled` gating vs early-return before mounting children  
5. Network waterfall vs code-splitting chunk waterfall  

## Predict / interpret

1. Network: three GETs start at the same timestamp for user/profile/posts. Waterfall?  
2. Network: posts starts only after profile ends; both keys use only `userId`. Accidental or necessary?  
3. Org GET starts after user JSON returns `organizationId`. Accidental or necessary?  
4. Parent returns null until user loads; child Profile never mounts meanwhile. When does profile fetch start?

## Debugging

1. Page feels slow; Network shows staircase of independent resources. First code smell to search for?  
2. You parallelized org with user using `userId` as org key by mistake. What goes wrong?  
3. Children each fetch on mount; parent already had `userId`. Refactor options?  
4. List fetch then N detail fetches after rows mount; ids were in the list payload. Better approach?

## Application

1. Rewrite the BAD Page/Profile/Posts example to fire three queries in parallel.  
2. Write a dependent `org` query with correct `enabled`.  
3. Spoken: what is a request waterfall and how do you spot/fix it?  
4. Sketch prefetch on route entry for `['posts', userId]`.

## Interview questions

1. What's a request waterfall, and how do you spot/fix one?  
   - Follow-up: When is sequential OK?  
   - Follow-up: What’s a render waterfall?
2. How does React Query help avoid accidental waterfalls?  
3. Parent spinner until data then render children — what’s the risk?  
4. How do waterfalls relate to perceived performance?

## Connections

1. How does this connect to React Query as the server-state default?
2. How do code-splitting Suspense waterfalls rhyme with request waterfalls?
3. How does “params known from the route” drive the parallelization decision?
4. How might SSR/router loaders eliminate client waterfalls?
