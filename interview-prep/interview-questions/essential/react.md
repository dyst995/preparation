# React — Essential (3-day)

Selected 90 of 500. Ordered by preparation priority within each tier.

## Must Know (40)

1. [REACT-015](../react/01-fundamentals.md#react-015) — Render describes, commit applies
   Why: Render vs commit is the core mental model every senior answer hangs on. Score: 4.85

2. [REACT-011](../react/01-fundamentals.md#react-011) — Reconciliation matches type at a position
   Why: Reconciliation by type and position explains remounts, lost state, and key bugs. Score: 4.80

3. [REACT-013](../react/01-fundamentals.md#react-013) — State stays where type and key stay
   Why: State preservation rules are the interview follow-up to keys and conditionals. Score: 4.75

4. [REACT-012](../react/01-fundamentals.md#react-012) — Index keys work while order is identity
   Why: Index keys are the classic production bug interviewers use to test list identity. Score: 4.72

5. [REACT-021](../react/01-fundamentals.md#react-021) — Hook identity is call order
   Why: Hook call-order identity underpins Rules of Hooks and custom-hook design. Score: 4.70

6. [REACT-101](../react/03-performance.md#react-101) — What actually triggers a re-render?
   Why: Knowing what actually triggers renders prevents cargo-cult memoization. Score: 4.68

7. [REACT-054](../react/02-hooks-state.md#react-054) — The interval keeps the first render's values
   Why: Stale closures in effects/timers are the most common senior debugging trap. Score: 4.65

8. [REACT-203](../react/05-async-data.md#react-203) — Race conditions in fetch effects
   Why: Fetch races are the must-pass async correctness question for production React. Score: 4.65

9. [REACT-005](../react/01-fundamentals.md#react-005) — setState schedules the next render
   Why: setState schedules; it does not mutate the current render—foundation for async UI. Score: 4.62

10. [REACT-020](../react/01-fundamentals.md#react-020) — A parent render runs child functions
   Why: Parent render running children explains why memo and composition matter. Score: 4.60

11. [REACT-110](../react/03-performance.md#react-110) — Why memo "doesn't work"
   Why: Unstable props defeating memo is the practical half of performance interviews. Score: 4.58

12. [REACT-106](../react/03-performance.md#react-106) — What does React.memo do?
   Why: React.memo’s shallow compare is the baseline optimization tool to explain. Score: 4.55

13. [REACT-071](../react/02-hooks-state.md#react-071) — Derived data is computed during render
   Why: Derive during render instead of syncing with effects—avoids flicker and loops. Score: 4.55

14. [REACT-056](../react/02-hooks-state.md#react-056) — Passive effects run after the paint opportunity
   Why: Passive effects after paint separates UX timing from layout-critical work. Score: 4.52

15. [REACT-130](../react/03-performance.md#react-130) — useLayoutEffect vs. useEffect
   Why: useLayoutEffect vs useEffect is the standard layout/flicker interview pair. Score: 4.50

16. [REACT-008](../react/01-fundamentals.md#react-008) — React 18 batches outside React events
   Why: React 18 automatic batching changes how many renders you expect after awaits. Score: 4.50

17. [REACT-083](../react/02-hooks-state.md#react-083) — A new key mounts a new copy of the state
   Why: Changing key to remount is the idiomatic reset pattern seniors must know. Score: 4.48

18. [REACT-251](../react/06-forms-accessibility.md#react-251) — Controlled vs uncontrolled inputs
   Why: Controlled vs uncontrolled is the forms foundation for APIs and libraries. Score: 4.48

19. [REACT-053](../react/02-hooks-state.md#react-053) — The updater reads the pending state
   Why: Functional updaters fix lost updates after concurrent or async handlers. Score: 4.45

20. [REACT-121](../react/03-performance.md#react-121) — startTransition
   Why: startTransition is the modern answer for keeping inputs snappy under heavy UI. Score: 4.45

21. [REACT-215](../react/05-async-data.md#react-215) — Server state vs client state
   Why: Server vs client state split drives caching, invalidation, and store choice. Score: 4.45

22. [REACT-168](../react/04-architecture.md#react-168) — Prop drilling vs context
   Why: Prop drilling vs context is the everyday architecture trade-off interview. Score: 4.42

23. [REACT-042](../react/01-fundamentals.md#react-042) — A render error is caught above; a handler error is not
   Why: Error boundaries catch render errors only—critical for correct reliability design. Score: 4.40

24. [REACT-201](../react/05-async-data.md#react-201) — Fetching in useEffect: the basic pattern and its pitfalls
   Why: Effect-based fetch pitfalls are still asked even when teams use a query library. Score: 4.40

25. [REACT-084](../react/02-hooks-state.md#react-084) — An async effect cannot return a cleanup
   Why: Async effect callbacks break cleanup—common source of race and leak bugs. Score: 4.38

26. [REACT-090](../react/02-hooks-state.md#react-090) — Hooks stay above any early return
   Why: Hooks above early returns is non-negotiable Rules of Hooks fluency. Score: 4.38

27. [REACT-031](../react/01-fundamentals.md#react-031) — Strict Mode's extra render stays in development
   Why: Strict Mode double-invoke is how seniors explain “why does this run twice?”. Score: 4.36

28. [REACT-209](../react/05-async-data.md#react-209) — Modeling loading, error, and success states
   Why: Loading/error/success modeling prevents impossible UI states in async screens. Score: 4.35

29. [REACT-068](../react/02-hooks-state.md#react-068) — Values that change at different rates need different providers
   Why: Splitting fast/slow context values is the fix for context re-render storms. Score: 4.35

30. [REACT-102](../react/03-performance.md#react-102) — State colocation
   Why: State colocation is the first performance/architecture move before memo. Score: 4.32

31. [REACT-036](../react/01-fundamentals.md#react-036) — The input shows the value from this render
   Why: Controlled inputs make React state the truth—explains frozen cursors and filters. Score: 4.32

32. [REACT-189](../react/04-architecture.md#react-189) — Error boundary placement
   Why: Where to place error boundaries is the architecture half of error handling. Score: 4.30

33. [REACT-306](../react/07-rendering-strategies.md#react-306) — Hydration
   Why: Hydration is the SSR bridge every full-stack React interview expects. Score: 4.30

34. [REACT-315](../react/07-rendering-strategies.md#react-315) — React Server Components
   Why: RSC basics reshape where data and JS live—core modern React literacy. Score: 4.28

35. [REACT-194](../react/04-architecture.md#react-194) — Server/client component boundary
   Why: Server/client boundary placement is the practical RSC architecture skill. Score: 4.28

36. [REACT-064](../react/02-hooks-state.md#react-064) — useMemo caches a result while dependencies compare equal
   Why: useMemo semantics (deps + Object.is) are required to discuss memoization honestly. Score: 4.25

37. [REACT-018](../react/01-fundamentals.md#react-018) — Transitions keep the keystroke urgent
   Why: Urgent input + deferred list is the textbook concurrent UX pattern. Score: 4.25

38. [REACT-351](../react/08-testing.md#react-351) — Testing the way a person uses the screen
   Why: User-centric testing philosophy is what seniors defend in test-strategy rounds. Score: 4.22

39. [REACT-289](../react/06-forms-accessibility.md#react-289) — Accessible modals
   Why: Accessible modals (focus trap, Escape, return focus) are table-stakes UI craft. Score: 4.20

40. [REACT-282](../react/06-forms-accessibility.md#react-282) — Button vs clickable div
   Why: Button vs clickable div is the highest-signal a11y/semantic HTML interview check. Score: 4.18

## Important (30)

1. [REACT-007](../react/01-fundamentals.md#react-007) — Updates in one batch run in order
   Why: Updater ordering inside a batch separates replace vs functional update mastery. Score: 4.15

2. [REACT-014](../react/01-fundamentals.md#react-014) — Two conditional slots are two positions
   Why: Conditional slot identity explains “wrong draft after toggle” bugs. Score: 4.12

3. [REACT-059](../react/02-hooks-state.md#react-059) — The in-flight request has to be dropped
   Why: Dropping stale in-flight results is the effect-level race remedy to verbalize. Score: 4.08

4. [REACT-002](../react/01-fundamentals.md#react-002) — Props are owned by the parent
   Why: Props ownership vs local state copies explains stale controlled/uncontrolled bugs. Score: 4.05

5. [REACT-063](../react/02-hooks-state.md#react-063) — A ref keeps the latest value for a later callback
   Why: Latest-value refs are the clean fix for effect deps without resubscribing. Score: 4.05

6. [REACT-085](../react/02-hooks-state.md#react-085) — Cleanup must remove the listener it added
   Why: Cleanup must remove the same listener—classic leak interview scenario. Score: 4.02

7. [REACT-104](../react/03-performance.md#react-104) — Children composition to skip renders
   Why: Children composition skips renders without memo—architecture over micro-opt. Score: 4.00

8. [REACT-109](../react/03-performance.md#react-109) — What useCallback really does
   Why: useCallback stabilizes identity; it does not make the function itself faster. Score: 3.98

9. [REACT-111](../react/03-performance.md#react-111) — Context fan-out
   Why: Context fan-out forces seniors to design providers and selectors carefully. Score: 3.95

10. [REACT-170](../react/04-architecture.md#react-170) — Context re-render design
   Why: Designing context to limit re-renders is the architecture follow-up to fan-out. Score: 3.92

11. [REACT-122](../react/03-performance.md#react-122) — useDeferredValue
   Why: useDeferredValue is the other concurrent knob for lagging expensive UI. Score: 3.90

12. [REACT-072](../react/02-hooks-state.md#react-072) — Reset the draft when the entity changes, without an effect
   Why: Resetting draft on entity change during render beats fragile sync effects. Score: 3.88

13. [REACT-204](../react/05-async-data.md#react-204) — Cancelling requests with AbortController
   Why: AbortController is the standard cancellation tool alongside ignore flags. Score: 3.85

14. [REACT-224](../react/05-async-data.md#react-224) — Optimistic updates
   Why: Optimistic updates are the senior mutation UX pattern interviewers probe. Score: 3.82

15. [REACT-164](../react/04-architecture.md#react-164) — Controlled vs uncontrolled ownership
   Why: Component API ownership (controlled/uncontrolled) is reusable-library literacy. Score: 3.80

16. [REACT-216](../react/05-async-data.md#react-216) — Why context is the wrong tool for server state
   Why: Context for server state is a common anti-pattern; query caches win instead. Score: 3.78

17. [REACT-228](../react/05-async-data.md#react-228) — Request waterfalls
   Why: Request waterfalls are the data-loading performance killer on both client and server. Score: 3.75

18. [REACT-185](../react/04-architecture.md#react-185) — Loaders vs component-level fetching
   Why: Route loaders vs component fetch is the modern data-boundary design choice. Score: 3.72

19. [REACT-191](../react/04-architecture.md#react-191) — Suspense boundaries as architecture
   Why: Suspense boundaries as architecture control loading UX and streaming shape. Score: 3.70

20. [REACT-162](../react/04-architecture.md#react-162) — Compound components
   Why: Compound components are a core composition pattern for flexible UI APIs. Score: 3.68

21. [REACT-308](../react/07-rendering-strategies.md#react-308) — Hydration mismatches
   Why: Hydration mismatches are the production SSR failure mode you must diagnose. Score: 3.65

22. [REACT-318](../react/07-rendering-strategies.md#react-318) — When to mark `use client`
   Why: When to mark use client controls bundle size and server capability. Score: 3.62

23. [REACT-302](../react/07-rendering-strategies.md#react-302) — Server-side rendering
   Why: SSR trade-offs (TTFB, SEO, hydration cost) are full-stack baseline knowledge. Score: 3.60

24. [REACT-125](../react/03-performance.md#react-125) — React.lazy and code splitting
   Why: React.lazy + Suspense is the default route/feature code-splitting tool. Score: 3.58

25. [REACT-260](../react/06-forms-accessibility.md#react-260) — Validation timing UX
   Why: Validation timing (blur vs submit vs change) is forms UX seniors must justify. Score: 3.55

26. [REACT-274](../react/06-forms-accessibility.md#react-274) — Labels and `useId`
   Why: Labels + useId is the accessible form wiring interviewers expect. Score: 3.52

27. [REACT-355](../react/08-testing.md#react-355) — getByRole and the accessible name
   Why: getByRole queries encode a11y and resilient RTL testing in one skill. Score: 3.50

28. [REACT-352](../react/08-testing.md#react-352) — Leaving implementation details out of the test
   Why: Avoiding implementation-detail tests keeps suites maintainable under refactors. Score: 3.48

29. [REACT-423](../react/09-typescript.md#react-423) — Discriminated unions for UI state
   Why: Discriminated unions for UI status are the TypeScript pattern that prevents bad states. Score: 3.45

30. [REACT-471](../react/10-production.md#react-471) — XSS via dangerouslySetInnerHTML
   Why: dangerouslySetInnerHTML XSS is the highest-risk client security question. Score: 3.42

## Advanced (20)

1. [REACT-017](../react/01-fundamentals.md#react-017) — Render can yield; commit runs through
   Why: Interruptible render vs atomic commit is the concurrent model depth question. Score: 3.55

2. [REACT-044](../react/01-fundamentals.md#react-044) — An urgent update and a transition are two passes
   Why: Urgent + transition as two passes explains why batching intuition fails. Score: 3.52

3. [REACT-095](../react/02-hooks-state.md#react-095) — startTransition does not follow an await
   Why: Transitions do not survive await—critical for correct concurrent async code. Score: 3.50

4. [REACT-134](../react/03-performance.md#react-134) — useSyncExternalStore
   Why: useSyncExternalStore is the correct bridge to non-React stores under concurrency. Score: 3.48

5. [REACT-135](../react/03-performance.md#react-135) — Tearing
   Why: Tearing is why external stores need sync subscription semantics. Score: 3.45

6. [REACT-149](../react/03-performance.md#react-149) — Streaming SSR and selective hydration
   Why: Streaming SSR + selective hydration is advanced rendering-strategy literacy. Score: 3.42

7. [REACT-196](../react/04-architecture.md#react-196) — Composing server into client
   Why: Passing server-rendered children into client components is the RSC composition pattern. Score: 3.40

8. [REACT-238](../react/05-async-data.md#react-238) — Server vs client data placement
   Why: Where to fetch (server vs client) is the staff-level data-placement judgment call. Score: 3.38

9. [REACT-234](../react/05-async-data.md#react-234) — Promises created during render
   Why: Promises created during render interact with Suspense and cache identity. Score: 3.35

10. [REACT-086](../react/02-hooks-state.md#react-086) — The aborted request's finally clears the next loading flag
   Why: Aborted finally clobbering the next request’s loading flag is a subtle race. Score: 3.32

11. [REACT-124](../react/03-performance.md#react-124) — Transitions and Suspense
   Why: Transitions + Suspense keep prior UI instead of flashing fallbacks. Score: 3.30

12. [REACT-047](../react/01-fundamentals.md#react-047) — A portal moves the DOM node, not the fiber
   Why: Portals move DOM, not React parentage—context and events still follow the fiber. Score: 3.28

13. [REACT-225](../react/05-async-data.md#react-225) — Rolling back failed optimistic updates
   Why: Rollback after failed optimistic updates separates solid mutation design. Score: 3.25

14. [REACT-319](../react/07-rendering-strategies.md#react-319) — How the client boundary spreads
   Why: Client boundary spread explains accidental client-bundle growth in RSC apps. Score: 3.22

15. [REACT-198](../react/04-architecture.md#react-198) — Custom hook design
   Why: Custom hook design (inputs/outputs/effects) is senior refactoring judgment. Score: 3.20

16. [REACT-050](../react/01-fundamentals.md#react-050) — The sort wrote through the state array
   Why: Mutating state during render (in-place sort) is a purity bug seniors must spot. Score: 3.18

17. [REACT-296](../react/06-forms-accessibility.md#react-296) — Custom widgets: combobox, select, tabs
   Why: Building ARIA widgets (combobox/tabs) is advanced a11y beyond semantics. Score: 3.15

18. [REACT-445](../react/09-typescript.md#react-445) — Mutually exclusive props
   Why: Mutually exclusive props typing is a high-signal React+TS API design skill. Score: 3.12

19. [REACT-473](../react/10-production.md#react-473) — Storing tokens: memory vs cookie
   Why: Token storage (memory vs HttpOnly cookie) is production auth security judgment. Score: 3.10

20. [REACT-493](../react/10-production.md#react-493) — Long tasks and INP in React UIs
   Why: Long tasks and INP tie React render strategy to real Core Web Vitals. Score: 3.08
