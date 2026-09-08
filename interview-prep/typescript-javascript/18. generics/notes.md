# Generics

## What you need to know

**Generics** parameterize types the way functions parameterize values. You write one implementation; each call site keeps **specific** type information instead of collapsing to `any` or duplicating overloads.

Curriculum checklist this unit completes:

- Generic functions (inference from arguments)
- Generic interfaces / type aliases
- Constraints (`T extends …`)
- Default type parameters
- `keyof` + indexed access `T[K]` with generics
- Stack examples: React hooks/components, Nest repositories

Prerequisites: [structural typing/erasure](../14.%20typescript-structural-erased/notes.md), [unions](../16.%20unions-intersections-discriminated/notes.md). Generics are erased at runtime — `T` is not a value you can `instanceof`.

---

## Why generics exist (preserved)

Alternatives without generics:

1. **`any`** — lose safety downstream  
2. **Copy-paste / overloads per type** — doesn’t scale  

```ts
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

firstElement([1, 2, 3]); // T = number → number | undefined
firstElement(['a', 'b']); // T = string → string | undefined
```

The function is shared; the **relationship** “element type in ⇒ same type out” is preserved per call.

---

## Generic functions and inference

### Declaring type parameters

```ts
function identity<T>(x: T): T {
  return x;
}

identity(1); // T inferred as 1 or number (contextual)
identity<string>('a'); // explicit
```

Inference usually comes from **arguments**. Return type is often inferred too; annotate when it clarifies.

### Multiple type parameters

```ts
function mapPair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}
```

### When inference fails

- No arguments to infer from (`const x = identity()` — need explicit `<T>` or a default)
- Conflicting inferences from multiple args
- Too-wide contextual types

Then pass explicit type arguments: `fn<User>(…)`.

---

## Generic types and interfaces

```ts
type ApiResponse<T> = {
  data: T;
  status: number;
};

interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}

type UserResponse = ApiResponse<User>;
```

Generic types are factories for concrete types. Instantiating (`Repository<User, string>`) fixes the parameters.

Classes can be generic too:

```ts
class Box<T> {
  constructor(public value: T) {}
}
```

---

## Constraints (`extends`)

### What they are

Limits what `T` may be so you can use known properties/methods:

```ts
function label<T extends { name: string }>(x: T): string {
  return x.name; // OK — guaranteed by constraint
}
```

Without `extends { name: string }`, `x.name` is an error.

### `keyof` + indexed access (preserved)

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'nika', age: 30 };
getProp(user, 'name'); // string
getProp(user, 'age'); // number
getProp(user, 'nope'); // Error
```

Causal chain:

1. `keyof T` → union of property names  
2. `K extends keyof T` → only those names allowed  
3. `T[K]` → type of that property (indexed access)  

**Interview answer (preserved):** better than `(obj: any, key: string): any` because keys are checked and the return type is exact — typos and misuse fail at compile time.

### Constraints vs intersections

`T extends Foo` means “`T` must be assignable to `Foo`” (can be richer). Returning `T` keeps the **richer** type; annotating the param as `Foo` alone would widen.

```ts
function withName<T extends { name: string }>(x: T): T {
  return x; // still full T, not only { name: string }
}
```

---

## Default type parameters

```ts
type Page<T = unknown> = {
  items: T[];
  total: number;
};

type AnyPage = Page; // Page<unknown>
type UserPage = Page<User>;
```

Defaults help when a parameter is often a common choice (`useState`-style APIs, optional config types).

```ts
function createSet<T = string>(): Set<T> {
  return new Set();
}
```

---

## Generics and erasure (important)

```ts
function make<T>(): T {
  return {} as T; // smell — no runtime T
}
```

You cannot:

- `new T()`
- `instanceof T`
- inspect `T` at runtime  

Factories that need constructors take a **runtime value**:

```ts
function factory<T>(Ctor: new () => T): T {
  return new Ctor();
}
```

---

## React: generic hooks and components

### Hook example (preserved, slightly clarified)

```ts
function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: unknown }
  >({ status: 'idle' });

  const run = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await fn();
      setState({ status: 'success', data });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [fn]);

  return { state, run };
}

const { state } = useAsync(() => fetchUser(id));
// on success, state.data is User — T inferred from Promise<User>
```

Combines **generics + discriminated unions + closures**. Common whiteboard exercise.

### Generic components

```tsx
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

function List<T>({ items, renderItem }: ListProps<T>) {
  return <>{items.map(renderItem)}</>;
}
```

Inference flows from `items` to `renderItem`’s parameter.

---

## Nest: generic repositories / services (preserved)

```ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}

class UserRepository implements Repository<User, string> {
  async findById(id: string): Promise<User | null> {
    /* ... */
  }
  async save(entity: User): Promise<User> {
    /* ... */
  }
}
```

Same pattern as TypeORM-style `Repository<Entity>`: one abstraction, many entities, typed IDs and returns.

DI note: runtime still needs concrete classes/tokens — generics don’t exist at runtime for Nest to inject “`T`”.

---

## Common patterns (interview toolkit)

| Pattern | Sketch |
|---|---|
| Identity / pair | `<T>(x: T): T` |
| Container | `ApiResponse<T>`, `Box<T>` |
| Keyof accessor | `<T, K extends keyof T>(o: T, k: K): T[K]` |
| Constrained field | `<T extends { id: string }>(x: T)` |
| Promise unwrap | `Awaited<T>` (utility; advanced chapter) |
| Constructor | `<T>(c: new () => T): T` |

---

## Common mistakes and misconceptions

1. **Using `any` instead of `T`** “to make it compile.”  
2. **Expecting `T` at runtime.**  
3. **Over-constraining** so inference breaks, or **under-constraining** so you can’t use properties.  
4. **`T extends any`** / pointless constraints.  
5. Forcing explicit type args everywhere when inference would work.  
6. Generic React component written as `React.FC<Props<T>>` awkwardly — prefer `function Comp<T>(props: Props<T>)`.  
7. Thinking Nest can inject an open generic without a concrete class.

---

## Connections to other concepts

```
reuse + preserve call-site types
  → generics
    → not any, not N overloads

T extends keyof U
  → safe keys
    → T[K] precise return

T in success state of useAsync
  → generic + discriminated union

Repository<T, ID>
  → same abstraction, many entities

erasure
  → pass constructors/tokens for runtime behavior
```

---

## Interview perspective

You should be able to:

1. Explain generics vs `any` vs overloads in one breath.  
2. Show inference on `firstElement`.  
3. Write and justify `getProp` with `keyof` / `T[K]`.  
4. Sketch `useAsync<T>` or `Repository<T, ID>`.  
5. State that generics erase and constructors must be passed as values when needed.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
