# 03. Unions, intersections, and discriminated unions

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] Union (`|`) - value can be one of several types
- [ ] Intersection (`&`) - value must satisfy all combined types simultaneously
- [ ] Literal types (`'success' | 'error'`) as the basis for discriminated unions
- [ ] Discriminated (tagged) unions - a shared literal "tag" property that lets TS narrow the whole shape
- [ ] Exhaustiveness checking with `never` in a `switch`'s `default` case

### Unions vs intersections

```ts
type StringOrNumber = string | number;         // union: either one
type NameAndAge = { name: string } & { age: number }; // intersection: both, combined
// NameAndAge is effectively { name: string; age: number }
```

A common trap: intersecting incompatible primitive types produces `never` (there's no value that is simultaneously `string` and `number`), while unions of object shapes give you access only to properties common to all members unless you narrow first.

### Discriminated unions - the single most useful TS pattern for real apps

```ts
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User };
type ErrorState = { status: 'error'; error: string };

type FetchState = LoadingState | SuccessState | ErrorState;

function render(state: FetchState) {
  switch (state.status) {
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.name; // TS knows state is SuccessState here - data exists
    case 'error':
      return state.error;     // TS knows state is ErrorState here - error exists
  }
}
```

The shared `status` literal property is the "discriminant." Once you check it (via `switch`, `if`, or destructuring), TypeScript narrows the *entire* union member's shape, giving you safe access to properties that only exist on that branch - with zero casting.

### Exhaustiveness checking

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function render(state: FetchState) {
  switch (state.status) {
    case 'loading': return 'Loading...';
    case 'success': return state.data.name;
    case 'error': return state.error;
    default: return assertNever(state); // compile error if a new state is added and unhandled
  }
}
```

If someone later adds `type CancelledState = { status: 'cancelled' }` to the union and forgets to handle it in the `switch`, `state` in the `default` branch is no longer `never` (it's now `CancelledState`), so passing it to `assertNever` fails to compile - catching a missed case *before* runtime.

### Interview question

**Q: Why are discriminated unions considered better than a single object with lots of optional fields, e.g. `{ status: string, data?: User, error?: string }`?**

**Strong answer:**
> "With all-optional fields, nothing stops you from constructing an invalid state like `{ status: 'success', error: 'oops' }` with both `data` missing and `error` present - the type doesn't encode the actual valid combinations, so you rely on discipline, not the compiler. With a discriminated union, each variant only carries the fields that are actually valid together, and TypeScript enforces that at construction time and narrows correctly on every read. It also unlocks exhaustiveness checking with `never`, so adding a new state and forgetting to handle it somewhere becomes a compile error instead of a runtime surprise."

---
