# 02. type vs interface

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] Both can describe object shapes; large overlap in day-to-day use
- [ ] `interface` supports declaration merging (multiple declarations combine); `type` does not
- [ ] `interface` can `extends` other interfaces (and classes can `implements` interfaces); `type` uses intersections (`&`) for composition
- [ ] `type` can alias primitives, unions, tuples, mapped/conditional types; `interface` cannot
- [ ] Performance: TS's structural checking can be marginally faster for interfaces at large scale (rarely decisive)
- [ ] Excess property checks apply to object literals assigned directly, regardless of `type`/`interface`

### Side-by-side

| Capability | `interface` | `type` |
|---|---|---|
| Object shape | Yes | Yes |
| Extends/composition | `extends` (multiple) | `&` intersection |
| Declaration merging | Yes (auto-merges same name) | No (error on duplicate name) |
| Union types | No | Yes (`type A = B \| C`) |
| Tuple / primitive alias | No | Yes |
| Mapped / conditional types | No | Yes |
| Implements (by classes) | Yes | Yes (object-shaped types only) |

```ts
// declaration merging - interface-only feature
interface Window {
  myGlobal: string;
}
interface Window {
  anotherGlobal: number;
}
// Window now has both myGlobal and anotherGlobal - used heavily for
// augmenting third-party/global types (e.g. extending Express's Request in Nest)

// type cannot do this - duplicate declaration is a compile error
type Foo = { a: string };
type Foo = { b: number }; // Error: Duplicate identifier 'Foo'
```

### Practical default (what to say in an interview)

> "I default to `interface` for public object shapes - props, DTOs, API response shapes - because `extends` reads clearly and declaration merging is occasionally genuinely useful (augmenting Express's `Request` type in NestJS middleware is a real example). I reach for `type` when I need unions, tuples, mapped or conditional types, or when composing several things together with intersections reads better than a chain of `extends`. In practice, for a plain object shape with no unions involved, the two are close to interchangeable, and consistency within a codebase matters more than the specific choice."

### Interview question

**Q: Give a concrete, real reason to prefer `interface` over `type`, beyond "it's convention."**

**Strong answer:**
> "Declaration merging. If you're augmenting a third-party type - a very common NestJS example is adding a custom `user` property to Express's `Request` interface after an auth middleware attaches it - you declare a second `interface Request { user: User }` in the same module augmentation namespace, and TypeScript merges it automatically. You cannot do that with `type`; redeclaring a `type` alias with the same name is a hard compile error."

---
