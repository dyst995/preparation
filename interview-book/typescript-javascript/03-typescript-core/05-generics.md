# 05. Generics

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] Generic functions - type parameters inferred from arguments
- [ ] Generic interfaces/types
- [ ] Generic constraints (`<T extends SomeShape>`)
- [ ] Default generic parameters (`<T = string>`)
- [ ] `keyof`, indexed access types (`T[K]`) combined with generics
- [ ] Generic React components/hooks and generic NestJS services/repositories

### Why generics exist

Generics let you write a function or type that's **reusable across many types** while still preserving the specific type information at each call site - the alternative is either duplicating code per type, or using `any`, which throws away all type safety.

```ts
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

firstElement([1, 2, 3]);       // inferred T = number, returns number | undefined
firstElement(['a', 'b']);      // inferred T = string, returns string | undefined
```

Without the generic, you'd either write `firstElement(arr: any[]): any` (loses all safety) or write one overload per type (doesn't scale).

### Constraints

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'nika', age: 30 };
getProp(user, 'name'); // string
getProp(user, 'age');  // number
getProp(user, 'nope'); // compile error - 'nope' is not a key of user
```

`K extends keyof T` constrains `K` to only the actual property names of `T`, and the return type `T[K]` (an **indexed access type**) resolves to the exact type of that property - this combination is how you get fully type-safe generic property access without casting.

### Generic React hook example (ties to your stack)

```ts
function useAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<
    { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: unknown }
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

// Usage - T is inferred per call site
const { state } = useAsync(() => fetchUser(id)); // state.data (when success) is typed User
```

This is exactly why a hand-rolled `useAsync`/`useFetch` hook is a common interview take-home or whiteboard exercise - it exercises generics, discriminated unions, and closures all at once.

### Generic NestJS repository/service example

```ts
interface Repository<T, ID> {
  findById(id: ID): Promise<T | null>;
  save(entity: T): Promise<T>;
}

class UserRepository implements Repository<User, string> {
  async findById(id: string): Promise<User | null> { /* ... */ }
  async save(entity: User): Promise<User> { /* ... */ }
}
```

### Interview question

**Q: Why is `getProp<T, K extends keyof T>` better than `getProp(obj: any, key: string): any`?**

**Strong answer:**
> "The generic-constrained version gives you two things `any` can't: the `key` argument is restricted at compile time to actual property names of `obj`, so typos are caught before running the code, and the return type is inferred exactly as the type of that specific property, not a black-box `any` that silently allows any subsequent misuse. It's more code up front but eliminates an entire category of 'accessed the wrong/misspelled property and only found out at runtime' bugs."

---
