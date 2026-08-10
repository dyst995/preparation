# 02. Mapped types

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] Basic syntax: `{ [K in keyof T]: ... }`
- [ ] Modifiers: adding/removing `readonly` and `?` with `+`/`-` prefixes
- [ ] Key remapping with `as` (TS 4.1+) - renaming or filtering keys during mapping
- [ ] How `Partial`, `Required`, `Readonly`, `Pick`, `Record` are implemented as mapped types
- [ ] Combining mapped types with conditional types for advanced derivations

### Basic mapped type

```ts
type Flags<T> = {
  [K in keyof T]: boolean;
};

interface FeatureSet { darkMode: boolean; betaAccess: boolean; }
type FeatureFlags = Flags<FeatureSet>;
// { darkMode: boolean; betaAccess: boolean } - same keys, all values forced to boolean
```

### How the built-ins actually work

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };          // adds '?'
type MyRequired<T> = { [K in keyof T]-?: T[K] };         // removes '?'
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };  // adds 'readonly'
type MyMutable<T> = { -readonly [K in keyof T]: T[K] };  // removes 'readonly'
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };  // maps over a subset of keys
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V };
```

Seeing these definitions is genuinely clarifying: `Partial<T>` isn't a special compiler builtin with magic behavior - it's a small, readable mapped type you could write yourself in one line.

### Key remapping with `as`

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

The `as` clause combined with template literal types lets you programmatically transform property names, not just their value types - this is how libraries generate typed getter/setter APIs or event-handler-name maps (`onClick`, `onChange`, etc.) from a base shape.

### Interview question

**Q: How would you implement `Readonly<T>` yourself, and what does the `readonly` modifier actually prevent?**

**Strong answer:**
> "`type MyReadonly<T> = { readonly [K in keyof T]: T[K] }` - it's a mapped type that iterates every key of `T` and re-declares it with a `readonly` modifier attached, keeping the same value type. At the type level, this prevents reassignment through that specific type reference - `obj.prop = x` becomes a compile error - but it's purely a compile-time guarantee; it does not freeze the object at runtime the way `Object.freeze` does. If you need actual runtime immutability, you need `Object.freeze` in addition to, or aligned with, the `readonly` type."

---
