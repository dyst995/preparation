# Avoiding Waterfalls — Self-test

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
