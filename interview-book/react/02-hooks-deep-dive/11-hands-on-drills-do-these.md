# 11. Hands-on drills (do these)

> Source: `interview-prep/react/02-hooks-deep-dive.md`

- [ ] Build the buggy `setInterval` + `useEffect([])` stale-closure example; observe the bug; fix it with a functional updater; fix it a second way with a correct dependency array; explain the tradeoff between the two fixes out loud.
- [ ] Build `useDebouncedValue` from scratch and wire it into a search input with a fake async fetch; verify it doesn't fire a request per keystroke.
- [ ] Build `usePrevious` and use it to show a "+N" or "-N" delta indicator next to a changing counter.
- [ ] Take a `useEffect` that fires an analytics event based on a boolean flag set from a click handler; refactor it to call the analytics function directly in the handler; explain why this is strictly better.
- [ ] Build a tooltip/popover that measures a target element's `getBoundingClientRect()`; implement it first with `useEffect` (observe the flicker), then fix with `useLayoutEffect`.
- [ ] Intentionally write a component that calls a hook inside an `if` block; run it and read the actual React error message; explain what's happening under the hood.

---
