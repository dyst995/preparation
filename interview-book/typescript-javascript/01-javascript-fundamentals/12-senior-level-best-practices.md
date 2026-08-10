# 12. Senior-Level Best Practices

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Decision frameworks & tradeoffs

**When to reach for a closure-based abstraction vs. a class.** Closures are the right call for small, single-purpose encapsulation (memoization caches, debounce/throttle, one-off private counters) where you need exactly one hidden piece of state and one or two operations on it. Once you need multiple methods sharing several pieces of state, inheritance, or `instanceof` checks, a class communicates intent better and is easier for a team to extend consistently - the tradeoff is closures are cheaper to write and reason about in isolation, but don't scale to "many related operations on shared state" as cleanly as a class's explicit method surface.

**`var`/legacy code migration tradeoff.** Blanket find-and-replacing `var` with `let`/`const` in a large legacy file is not free - it can silently change behavior if code relied on `var`'s function-scoping/hoisting (e.g., a variable declared inside an `if` and read after it). The senior move is to run the change through a linter (`no-var`, `prefer-const`) plus full test coverage, and treat every flagged case as "read the surrounding code," not a mechanical rewrite.

### Production checklists

- [ ] `===`/`!==` used everywhere except the deliberate `== null` shorthand - enforced via `eslint eqeqeq` rule, not manual review.
- [ ] No implicit globals - `"use strict"` (or ES module context) enabled everywhere, so a missing `var`/`let`/`const` throws instead of silently creating a global.
- [ ] Closures that capture loop variables or mutable outer state are reviewed for the classic `var` capture bug - `let` per-iteration binding used by default in loops with async callbacks.
- [ ] Class fields that don't need per-instance `this` binding are plain prototype methods, not arrow class fields, to avoid unnecessary per-instance allocation at scale (large lists of instances, e.g., parsed API rows wrapped in a class).
- [ ] `NaN`/nullish checks use `Number.isNaN`/`?? `/`== null`, never bare `isNaN()` or `===` against `NaN`.
- [ ] Module boundaries are consistent - a single package doesn't mix ad hoc CommonJS `require()` and ESM `import` without a documented interop reason (e.g., `esModuleInterop` behavior understood, not stumbled into).

### Anti-patterns

- **"Just use `any` semantics via loose equality"** - relying on `==` to "smooth over" inconsistent API response types (`"0"` vs `0` vs `false`) instead of normalizing the data once at the boundary. This hides a data-quality bug behind a language quirk.
- **Deeply nested closures for state that outlives the closure's natural scope** - e.g., a closure-based cache that grows unbounded because nothing ever evicts entries; if the cached data has real lifetime/memory concerns, it belongs in a proper cache structure (`Map` with an eviction policy, or a class with a `clear()` method), not an anonymous closure nobody can inspect or reset.
- **Silent prototype pollution** - directly mutating `Object.prototype` or built-in prototypes (`Array.prototype.customMethod = ...`) to "add a convenience method." This affects every object/array in the process, including third-party code, and is a well-known source of hard-to-trace bugs and security issues (prototype pollution CVEs in real npm packages followed exactly this pattern).
- **Overusing `bind`/`.call`/`.apply` where a plain arrow function would do** - explicit binding utilities are powerful but verbose; in modern code, an arrow function class field or an inline arrow at the call site is usually clearer than `this.method = this.method.bind(this)` boilerplate repeated across a constructor.

### Failure modes

- **Memory leaks from closures holding onto large objects.** A `setInterval`/event listener callback that closes over a large object (e.g., a full API response) keeps that object alive for as long as the interval/listener is registered, even if the rest of the code no longer needs it. Diagnosed via heap snapshots in Chrome DevTools/Node's `--inspect`, looking for retained closures in the "Detached" or "Closure" categories.
- **`this` becoming `undefined` in production but not in dev** - happens when code paths differ between a dev server's module wrapping and a production bundle's strict-mode behavior, or when a method is passed as a callback to a third-party library that calls it unbound. Always verify `this`-sensitive code with an explicit test that calls the method detached from its object, not just through normal usage.
- **TDZ errors surfacing only in specific bundler/minifier configurations** - some older transpilation targets can reorder or hoist code in ways that change TDZ timing subtly; if a TDZ error appears only in a production build, suspect the build's target/minification settings before assuming a logic bug.

### Observability

- Wrap risky coercion-heavy legacy logic (`==` chains, mixed-type math) with assertions or runtime type checks (`console.assert`, or a lightweight schema check) during a migration, so violations surface in logs/error tracking (Sentry, Datadog) before they cause silent data corruption in production.
- When debugging a "stale closure" bug in production, add a log line inside the closure printing the captured variable's value at call time - this is often faster than reasoning about it statically, especially across several nested scopes.

### Team/scale practices

- Adopt `eslint-config-airbnb`/`@typescript-eslint/recommended`-style rule sets (`no-var`, `eqeqeq`, `prefer-const`) as CI gates, not style suggestions - at scale, relying on code review alone to catch `==` or `var` regressions doesn't hold up across a growing team.
- Document the team's stance on `class` vs. factory-function/closure patterns in a short ADR (architecture decision record) once the codebase is large enough that new hires ask "why do some modules use classes and others use plain functions with closures" - consistency reduces cognitive load more than either choice being objectively superior.
- For NestJS teams specifically: agree on one pattern for exposing "private" helper logic on a service (a real private class field/method vs. a module-level unexported closure) so code review doesn't re-litigate this choice per PR.

### Senior follow-up Q&A

**Q1: You inherit a codebase where a shared closure-based cache (a `Map` created once at module load, used by an exported `getCached(key)` function) is suspected of causing a slow memory leak in a long-running Node process. How would you confirm it, and what would you change?**
> "I'd take heap snapshots at two points in time under sustained load and diff them, looking specifically at the retained size of that `Map` and what's keeping its entries alive - if the cache has no eviction policy, retained size grows monotonically with unique keys seen. To confirm it's the actual leak (not something else), I'd also check whether removing/clearing the cache periodically stabilizes memory in a load test. The fix depends on the access pattern: an LRU cache with a max size bound, a TTL per entry, or a `WeakMap` if the keys are objects that should be collectible once nothing else references them - a closure-based cache is fine as a *mechanism*, but it needs an explicit eviction strategy the moment it's process-lifetime shared state, not per-request state."

**Q2: A teammate insists `class` fields should always be arrow functions "to avoid `this` bugs, just to be safe." What's your pushback, if any?**
> "It's a real fix for a real problem, but 'always' has a cost: every arrow-function class field is a new function allocated per instance instead of one shared prototype method, and it also makes the method impossible to override cleanly via subclassing (since it's an instance property, not a prototype method, so `super.method()` semantics and normal override patterns don't apply the same way). I'd reserve arrow field methods specifically for cases where the method is genuinely passed around detached from the instance as a callback - event handlers being the classic case - and use regular prototype methods everywhere else, especially for anything performance-sensitive at scale (thousands of instances) or anything meant to be overridden by subclasses."

**Q3: How would you explain to a junior engineer why a `for...of` loop with `await` inside behaves differently from `.forEach` with an `async` callback - tying it back to closures and the event loop?**
> "`.forEach` calls its callback synchronously for every item and completely ignores whatever the callback returns - including a Promise - so all the `async` callbacks are invoked essentially back-to-back, each starting its own closure over that iteration's item, but none of them are ever awaited by `forEach` itself. `for...of` with `await` inside literally pauses the surrounding function at each `await`, so the loop genuinely waits before moving to the next iteration. The 'closure per iteration' behavior is identical in both cases if using `let` - the difference is entirely about whether the *loop construct* respects the returned Promise, not about scoping."

**Q4: Can you write a version of the module pattern using closures that exposes a `get`/`set`/`subscribe` API for a single reactive value, without any external library? What are its limitations compared to a real state library?**
> Sketch: a closure holding a value and an array of subscriber callbacks; `set` updates the value and synchronously calls each subscriber; `get` returns the current value; `subscribe` pushes a callback and returns an unsubscribe closure that splices it back out. "This is legitimately how many simple reactive primitives start. The limitations versus something like Zustand: no batching of multiple synchronous `set` calls, no built-in equality check to skip redundant notifications, no support for derived/computed values without hand-rolling them, and no React-specific concurrent-rendering safety (`useSyncExternalStore` semantics) - which is exactly the gap purpose-built state libraries fill."

**Q5: Why might `Object.freeze` not be enough to make an object "fully immutable," and how does this connect to what `class`/closures give you for encapsulation?**
> "`Object.freeze` is shallow - it prevents adding, removing, or reassigning top-level properties, but any nested object/array referenced by a frozen object's property is still fully mutable unless it's also frozen (recursively, `deepFreeze` has to be written by hand or via a library). This is a common gotcha when someone assumes 'I froze the config object, it's safe to share' but a nested `settings.filters` array is still pushed into elsewhere in the codebase. Closures give you a *different* kind of protection - true privacy, since there's no reference to the internal variable available outside the closure at all, versus `Object.freeze`'s 'the reference is public but can't be reassigned' model. For genuinely private, tamper-proof internal state, closures (or ES2022 private class fields `#field`) are stronger guarantees than a frozen public object."

**Q6: In a NestJS service, why might reflecting on constructor parameter types (`reflect-metadata`) fail silently for a parameter typed as an interface or a union type, and how does this tie back to type erasure and prototypes?**
> "`reflect-metadata`'s `design:paramtypes` only captures information about *runtime-existing* constructs - concrete classes have a real constructor function TypeScript can emit a reference to. Interfaces, union types, and generic type parameters are erased entirely at compile time, so there's nothing for the emitted metadata to point to - TypeScript typically emits `Object` (or omits richer detail) for those parameters instead. This is exactly why NestJS's DI container requires classes (or explicit `@Inject('TOKEN')` tokens) for anything it needs to resolve by type - it's the same type-erasure boundary from chapter 3, just showing up as a dependency-injection failure mode instead of an `instanceof` check failing."

---
