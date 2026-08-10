# 13. Senior-Level Best Practices

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Decision frameworks & tradeoffs

**When to hand-write a type vs. derive it vs. validate at runtime.** Three layers, each answering a different question: a hand-written type/interface documents intent for humans and the compiler when there's no existing source of truth; a derived type (`Omit`/`Pick`/`ReturnType`) keeps one source of truth in sync automatically and should be preferred whenever a "real" type already exists to derive from; a runtime validator (`zod`, `class-validator`) is required the moment data crosses a trust boundary (network, user input, `JSON.parse`), because compile-time types provide zero runtime guarantee. The common senior mistake is treating a derived compile-time type as if it were also a runtime guarantee - it isn't.

**`unknown` + narrowing vs. a runtime schema library, at a boundary.** For low-stakes, simple shapes (a single string/number from a query param), manual narrowing (`typeof`, custom type predicate) is proportionate. For anything with more than a couple of fields, nested objects, or where a bad shape would cause a silent data-corruption bug rather than an obvious crash, a schema library (`zod`) pays for itself: it gives you the runtime check *and* the derived static type in one declaration, instead of maintaining a hand-written type and a hand-written guard that can drift apart.

**Discriminated unions vs. class hierarchies for modeling variants.** Both express "one of several shapes." Discriminated unions are preferable when the variants are pure data with no shared behavior beyond a `switch`, are exhaustively checked in a small number of places, and serialize cleanly (e.g., over JSON/API boundaries). Class hierarchies (with a shared base class/interface and polymorphic methods) are preferable when each variant has meaningfully different *behavior*, not just different *shape*, and you want to add a new operation across all variants without touching a central `switch` (the classic OOP vs. functional-style "expression problem" tradeoff) - but classes don't serialize/deserialize over JSON boundaries without extra work, which matters for NestJS DTOs and Redux state.

### Production checklists

- [ ] `strict: true` (or the individual flags it implies) is enabled in every `tsconfig.json` in the codebase, including test and tooling configs - not just the main app config.
- [ ] Every external API response is validated at the boundary (`zod`/`class-validator`) before being trusted as the typed shape the rest of the code assumes - "the API contract says X" is not a runtime guarantee.
- [ ] No `// @ts-ignore` or `// @ts-expect-error` without an inline comment explaining *why* and, ideally, a linked ticket to remove it - unexplained suppressions accumulate silently and hide real regressions later.
- [ ] `@typescript-eslint/no-explicit-any` is enabled (at least as a warning, ideally an error) with any existing violations tracked, not left as an infinite unaddressed backlog.
- [ ] Discriminated unions modeling async/UI state include exhaustiveness checking (`never` in the `default` branch) everywhere they're consumed, not just in the "main" render function.
- [ ] Public-facing types (exported from a shared package, or DTOs crossing a frontend/backend boundary) are reviewed for structural typing footguns - e.g., an overly permissive object type that accidentally accepts more than intended due to structural compatibility.

### Anti-patterns

- **"Type assertion as a compile-error eraser"** - using `as SomeType` (or worse, `as any as SomeType`) to silence a type error without verifying the assertion is actually true at runtime. This is strictly more dangerous than `any` in one respect: it looks type-safe in code review, hiding the fact that no real guarantee exists.
- **All-optional DTOs "to be safe"** - marking every field on a request/response type as optional because "sometimes it's there, sometimes it isn't," instead of modeling the actual valid combinations with a discriminated union or separate types per state. This defers a real design decision (what are the actually valid shapes?) into runtime `if` checks scattered everywhere the type is used.
- **Exporting `interface`/`type` definitions that mirror a specific ORM/library's internal shape 1:1** as your DTO/domain type, coupling your entire application's type surface to a third-party library's schema. Changing ORMs or upgrading a major version can then silently ripple through the whole codebase; an explicit mapping layer (even a thin one) at the boundary is worth the extra code.
- **Generic type parameters with no constraint (`<T>`) where a constraint (`<T extends SomeShape>`) would catch real misuse** - an unconstrained generic often means "I didn't think about what's actually valid here," not "this is maximally flexible by design."

### Failure modes

- **A "typed" API client that silently returns wrong data shapes** because the type was hand-written once from documentation and the API changed without anyone updating the type - since TypeScript can't verify runtime data against a type, this compiles fine and fails at the point of use (e.g., `undefined.toUpperCase()`), often far from the actual root cause.
- **`enum` reverse-mapping bugs surfacing after a refactor** - reordering or inserting a numeric enum member shifts every subsequent member's numeric value, silently breaking any code that persisted the numeric value (database column, serialized cache, external API contract) before the enum change, since the *name* is unchanged but the *underlying number* is not.
- **Overly narrow generic inference causing confusing errors far from the actual mistake** - a generic function called with slightly wrong argument types can produce an error deep inside the generic's internals rather than at the call site, which is disproportionately confusing for less experienced team members and worth flagging in code review with a suggested more specific overload or a clearer constraint.
- **Silent widening defeating an intended literal-type guarantee** - assigning a literal-typed variable to a plain `let`/inferred-`string` variable elsewhere widens it, and any downstream code relying on the narrow literal type no longer gets a compile error for invalid values, even though "it compiled" gives false confidence that the constraint still holds.

### Observability

- Track `any`/`ts-ignore`/`ts-expect-error` counts over time in CI (a simple `grep`-based metric or an ESLint report artifact) as a codebase-health signal - a rising trend is an early warning that type discipline is eroding faster than it's being enforced in review.
- For runtime-validated boundaries (`zod`), log validation failures with the actual invalid payload (redacted for sensitive fields) to error tracking - a spike in validation failures for a specific field is often the first signal that an upstream API/service changed its contract.
- When investigating a "the type says X but the runtime value is Y" production bug, treat it as a missing-runtime-validation gap first, not a one-off bug to patch - fix the boundary, not just the symptom.

### Team/scale practices

- Maintain a single shared types package (or generate types from an OpenAPI/GraphQL schema) for anything crossing the frontend/backend boundary, so "the API changed" is a compile error on the consuming side instead of a silent runtime mismatch discovered by a user.
- Require a brief justification comment for any new `enum` in code review, given the team's general preference for union-of-literals - this keeps the choice deliberate rather than habitual, without banning enums outright for the cases where they're genuinely useful (numeric ordering, namespacing many related constants).
- Periodically audit and reduce `strict`-flag suppressions/exceptions (`ts-ignore` counts, `any` counts) as a scheduled tech-debt task, not something that only happens reactively after a bug traced back to one.

### Senior follow-up Q&A

**Q1: Your team's `UserDto` type is manually kept in sync between the frontend and a NestJS backend, and they've drifted out of sync twice this quarter, causing runtime bugs. How do you fix this structurally, not just "be more careful"?**
> "Manual duplication across a network boundary is a process problem, not a discipline problem - relying on people remembering to update both sides doesn't scale. I'd move to a single source of truth: either a shared types package both frontend and backend import from (works well in a monorepo), or codegen from a schema - OpenAPI spec generated from the NestJS decorators (via `@nestjs/swagger`) feeding a generated TypeScript client, or a GraphQL schema with codegen on both sides. Either way, a contract change becomes a build-time compile error on the consuming side instead of a runtime surprise discovered in production."

**Q2: When is `unknown` not actually safe enough, and you need a real runtime validator instead of just narrowing?**
> "`unknown` plus manual narrowing (`typeof`, `in`, custom predicates) is fine for simple, shallow, low-stakes shapes. It stops being enough once the shape is nested, has many fields, or a subtly wrong shape would cause silent data corruption rather than an obvious crash - manual narrowing code for a 10-field nested DTO is itself a place bugs hide, and nobody keeps it in sync with the type as fields are added. At that point a schema library like `zod` is better: one declaration gives you both the runtime check and the derived static type, and it fails loudly and specifically (telling you exactly which field was wrong) instead of a generic downstream crash."

**Q3: Why might two senior engineers disagree about whether a set of related states (e.g., a multi-step checkout flow) should be a discriminated union or a class hierarchy?**
> "It comes down to whether the variants are primarily *data* or primarily *behavior*. If each step is just a different shape of data consumed by one central renderer/handler via a `switch`, a discriminated union is simpler, serializes cleanly to/from JSON or Redux state, and gets free exhaustiveness checking. If each step has meaningfully different *behavior* - different validation logic, different side effects, different methods you'd want to call polymorphically without a big `switch` - a class hierarchy with a shared interface avoids a growing central `switch` statement every time you add an operation. Neither is universally correct; I'd ask 'am I adding new *variants* more often, or new *operations* on existing variants more often' - unions scale better for the former, class hierarchies for the latter (the classic expression problem)."

**Q4: A generic utility function you wrote produces a confusing, deeply nested type error at a call site, several layers removed from the actual mistake. How do you approach fixing the *type*, not just the caller's code?**
> "First I'd reproduce the minimal failing case in isolation to see exactly which type parameter TypeScript is struggling to infer or check. Often the fix is adding a tighter constraint (`<T extends SomeShape>` instead of `<T>`) so invalid usage fails at the constraint boundary with a clear message, rather than deep inside the generic's implementation. Sometimes it's providing an explicit overload for the common case so TypeScript doesn't have to infer through the fully generic path at all. The goal is making the *type* fail close to the *mistake*, since a technically-correct-but-confusing error message is a real cost to the team, not just a cosmetic issue."

**Q5: How would you audit an existing large codebase for `any` usage and prioritize what to fix first?**
> "I'd start by turning on `noImplicitAny` if it's off and `@typescript-eslint/no-explicit-any` as a lint warning, then get a total count as a baseline metric. For prioritization, I'd rank by risk and blast radius: function parameters and return types on widely-called utilities first (a bad type there propagates everywhere), then anything touching money, auth, or user input validation, then API response boundaries. I'd explicitly deprioritize `any` used only in test files or one-off scripts, since the ROI on fixing those is much lower. I'd also add the lint rule as a CI gate for *new* code immediately, so the backlog stops growing while it's being paid down."

**Q6: Your `enum Status { Active, Inactive, Pending }` has values persisted as raw numbers in a database. A new requirement needs a `Suspended` status inserted logically between `Active` and `Inactive`. What's the risk, and what do you do?**
> "Inserting a new numeric enum member in the middle shifts every subsequent member's underlying number - `Inactive` was `1`, now `Suspended` is `1` and `Inactive` becomes `2`. Any already-persisted row with the old numeric value for `Inactive` would now be silently misread as `Suspended` after deploy, which is a serious, silent data-correctness bug, not a compile error. The safe fix is always appending new enum members at the end (`Suspended` gets the next unused number), regardless of what feels 'logically ordered' in the source code, or migrating away from numeric enums to string enums / string-literal unions specifically so the persisted representation is the human-readable string, immune to member-ordering changes."

---
