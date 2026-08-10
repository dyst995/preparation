# 07. Avoiding waterfalls

> Source: `interview-prep/react/04-performance-patterns.md`

### Request waterfalls

A waterfall happens when requests that *could* run in parallel instead run **sequentially**, because each one only starts after a previous one resolves - usually because a component only fetches its own data *after* mounting, and it only mounts after a parent's fetch resolves and renders it.

```jsx
// BAD: waterfall - Profile fetches after User resolves, Posts fetches after Profile resolves,
// even though none of these actually depend on each other's DATA, just on render order.
function Page({ userId }) {
  const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  if (!user) return <Spinner />;
  return <Profile userId={userId} />;   // Profile's own query only starts once Page re-renders past this point
}

function Profile({ userId }) {
  const { data: profile } = useQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  if (!profile) return <Spinner />;
  return <Posts userId={userId} />;   // same problem again
}
```

Each query key only needs `userId`, which is known from the very first render - there's no real data dependency forcing sequential fetches, just an *accidental* one from component structure.

**Fix - fetch in parallel at a common ancestor, or let each independent query fire immediately regardless of nesting:**

```jsx
// GOOD: all three queries fire immediately in parallel since none actually depend on
// another's *response data* - only render composition was accidentally serializing them before.
function Page({ userId }) {
  const userQuery = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  const profileQuery = useQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  const postsQuery = useQuery({ queryKey: ['posts', userId], queryFn: () => fetchPosts(userId) });

  if (userQuery.isLoading || profileQuery.isLoading || postsQuery.isLoading) return <Spinner />;
  return <PageContent user={userQuery.data} profile={profileQuery.data} posts={postsQuery.data} />;
}
```

If one query *genuinely* depends on another's result (e.g., you need `user.organizationId` to fetch the organization), that's a **real** dependency and sequential fetching (React Query's `enabled` option gating the dependent query) is correct - the key skill is telling apart *accidental* waterfalls (structural) from *necessary* ones (data-dependent).

```jsx
const { data: user } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
const { data: org } = useQuery({
  queryKey: ['org', user?.organizationId],
  queryFn: () => fetchOrg(user.organizationId),
  enabled: !!user?.organizationId,   // correctly gated - this IS a real data dependency
});
```

### Render waterfalls

A related but distinct issue: a component renders, discovers it needs more data, fetches, re-renders, discovers it needs *more* data based on the first fetch's result, fetches again, etc. - multiple round trips of render-fetch-render instead of fetching everything needed for a view up front (or in parallel where possible).

### Interview question

**Q: What's a request waterfall, and how do you spot/fix one?**

> "It's when requests that could run in parallel run sequentially instead, usually because of how components are nested rather than because of a real data dependency - a child component's query doesn't start until its parent's query resolves and the child mounts. I'd spot it in the Network tab as requests starting one after another instead of together. The fix is either fetching in parallel at a shared point using the params already available up front, or, if one query *does* genuinely need another's result, explicitly gating it with something like React Query's `enabled` option rather than accidentally serializing everything through component mount order."

---
