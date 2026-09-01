# Server State / React Query — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] How does server state differ from client state? Why is a server copy “borrowed”?
- [ ] What is a query key, and why include `userId` in it?
- [ ] What is `staleTime` vs `gcTime`?
- [ ] `isLoading` vs `isFetching`? `useQuery` vs `useMutation`?
- [ ] What does `invalidateQueries` do, and why invalidate (or `setQueryData`) after a mutation?
- [ ] React Query vs Redux for API lists — why isn’t putting `users` in Redux enough?

## Predict / debug

- [ ] `staleTime: 60_000`; remount the same key after 10s. Network refetch? State the result and explain why.
- [ ] Two mounts with `['user', 1]` at once. How many network requests typically, and why?
- [ ] UI shows user A after fast navigation to user B (naive fetch). Diagnose the cause.
- [ ] Cache hit for wrong filters because the key was only `['products']`. Diagnose and fix.
- [ ] Profile edit saves but the header still shows the old name. What’s the missing piece?

## Say it out loud

- [ ] Explain server state vs client state and what React Query is for in 30–60 seconds as if an interviewer asked.
- [ ] Why not put API responses in Redux/Zustand? Follow-up: is using two libraries over-engineering?
- [ ] Walk through an optimistic update and the failure path.
