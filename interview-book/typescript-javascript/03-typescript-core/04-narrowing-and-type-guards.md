# 04. Narrowing and type guards

> Source: `interview-prep/typescript-javascript/03-typescript-core.md`

### Topics to learn
- [ ] `typeof` narrowing (primitives)
- [ ] `instanceof` narrowing (classes)
- [ ] `in` operator narrowing (property existence)
- [ ] Truthiness narrowing (`if (value)`)
- [ ] Equality narrowing (`if (x === 'foo')`, discriminant checks)
- [ ] Custom type predicates (`function isX(v): v is X`)
- [ ] Assertion functions (`function assert(cond): asserts cond`)
- [ ] Control flow analysis - TS tracks narrowing through the function body, including after early returns

### The narrowing toolkit

```ts
function process(value: string | number | Date | null) {
  if (value === null) return;                 // equality narrowing
  if (typeof value === 'string') { /* string */ }
  else if (typeof value === 'number') { /* number */ }
  else if (value instanceof Date) { /* Date */ }
}
```

`typeof` only distinguishes JS primitive tags (`'string' | 'number' | 'boolean' | 'undefined' | 'object' | 'function' | 'symbol' | 'bigint'`) - notably `typeof null === 'object'`, a well-known JS wart that TypeScript still has to account for, which is why explicit `=== null` checks are common before a `typeof` chain.

### Custom type predicates

```ts
interface Cat { meow(): void; }
interface Dog { bark(): void; }

function isCat(animal: Cat | Dog): animal is Cat {
  return (animal as Cat).meow !== undefined;
}

function speak(animal: Cat | Dog) {
  if (isCat(animal)) {
    animal.meow(); // narrowed to Cat
  } else {
    animal.bark();  // narrowed to Dog
  }
}
```

The `animal is Cat` return type is a **type predicate** - it tells the compiler "if this function returns `true`, treat the argument as `Cat` from this point forward in the calling scope." This is essential when the `in` operator or `typeof`/`instanceof` aren't expressive enough (e.g. checking a discriminant deep in a nested object, or validating an external API response shape).

### `in` operator narrowing

```ts
type Admin = { role: 'admin'; permissions: string[] };
type Guest = { role: 'guest' };

function describe(user: Admin | Guest) {
  if ('permissions' in user) {
    console.log(user.permissions); // narrowed to Admin
  }
}
```

### Interview question

**Q: Why is `typeof null === 'object'` a trap, and how does it affect narrowing code?**

**Strong answer:**
> "It's a long-standing bug baked into the language from JS's earliest days that can never be fixed without breaking the web. Practically, it means a `typeof value === 'object'` check will also be true for `null`, so any code branch relying on 'object' meaning 'has properties I can safely access' will throw if `value` is actually `null`. I always check `value === null` (or `value == null` to also catch `undefined`) explicitly before or alongside a `typeof` narrowing chain, and TypeScript's control flow analysis will correctly exclude `null` from the type in later branches once that check is in place."

---
