# Avoiding Waterfalls — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What is a request waterfall, and why do nested `useQuery` + early `return <Spinner />` patterns cause them?
- [ ] What is a render waterfall? Accidental vs necessary sequential requests.
- [ ] What is the usual fix when all queries only need URL/`userId`? What does React Query `enabled: !!user?.organizationId` express?
- [ ] Why is total time roughly a **sum** under a waterfall but a **max** when parallel? Parallel queries at parent vs mount-gated child queries.
- [ ] Why can `React.lazy` nesting create a similar waterfall? How can prefetch help without flattening the component tree?

## Predict / debug

- [ ] Network: three GETs start at the same timestamp for user/profile/posts. Waterfall? State the result and explain why.
- [ ] Network: posts starts only after profile ends; both keys use only `userId`. Accidental or necessary? Why?
- [ ] Org GET starts after user JSON returns `organizationId`. Accidental or necessary? Why?
- [ ] Parent returns null until user loads; child Profile never mounts meanwhile. When does the profile fetch start, and why?
- [ ] Page feels slow; Network shows a staircase of independent resources. First code smell to search for? Diagnose.

## Say it out loud

- [ ] Explain request waterfalls in 30–60 seconds as if an interviewer asked.
- [ ] What's a request waterfall, and how do you spot/fix one? Follow-up: when is sequential OK? Follow-up: what’s a render waterfall?
- [ ] Parent spinner until data then render children — what’s the risk?
