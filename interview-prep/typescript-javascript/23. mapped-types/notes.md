# Mapped Types

## What you need to know

A **mapped type** builds a new object type by iterating keys:

```ts
{ [K in keyof T]: ... }
```

You transform **every property** (or a remapped set of keys): change value types, add/remove `?` / `readonly`, or rename keys with `as`.

This is how `Partial`, `Required`, `Readonly`, `Pick`, and `Record` are implemented — not magic builtins.

Curriculum checklist:

- `{ [K in keyof T]: … }`
- Modifiers `+`/`-` for `readonly` and `?`
- Key remapping `as` (TS 4.1+)
- Homemade `Partial` / `Required` / `Readonly` / `Pick` / `Record`
- Combining with conditional types

Prerequisites: [Generics](../18.%20generics/notes.md) (`keyof`, `T[K]`), [Utility types](../19.%20utility-types/notes.md), [Conditional types](../22.%20conditional-types/notes.md).

---

## Basic mapped type

```ts
type Flags<T> = {
  [K in keyof T]: boolean;
};

interface FeatureSet {
  darkMode: boolean;
  betaAccess: boolean;
}
type FeatureFlags = Flags<FeatureSet>;
// { darkMode: boolean; betaAccess: boolean }
```

### Mental model

For each key `K` in `keyof T`, emit a property `K` with a computed type (often `T[K]` or a transform of it).

```ts
type Mirror<T> = { [K in keyof T]: T[K] }; // identity map
```

---

## Why mapped types exist

Object shapes repeat with systematic changes: “same keys, all optional,” “same keys, readonly,” “getters for each field.” Mapped types express that **once** instead of re-listing fields.

They are **erased** — no runtime loop; only a compile-time type.

---

## Modifiers: `readonly` and `?`

### Add optional / readonly

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
```

### Remove with `-`

```ts
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyMutable<T> = { -readonly [K in keyof T]: T[K] };
```

`+?` / `+readonly` exist for symmetry; usually written as `?` / `readonly` without `+`.

### What `readonly` prevents (preserved interview answer)

> `type MyReadonly<T> = { readonly [K in keyof T]: T[K] }` re-declares each key with `readonly`, same value type. Compile-time: `obj.prop = x` errors through that type. It does **not** `Object.freeze` at runtime — use freeze (or immutable libs) if you need runtime immutability.

Shallow: nested objects aren’t recursively readonly unless you write a deep mapped type.

---

## `Pick` and `Record` as maps (preserved)

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
type MyRecord<K extends string | number | symbol, V> = { [P in K]: V };
```

`Pick` maps over a **subset** of keys (`K`), not necessarily all of `keyof T`.  
`Record` maps over an arbitrary key union `K` with uniform value type `V`.

`Omit` is typically `Pick` + `Exclude` on keys (conditional + mapped), e.g.:

```ts
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

---

## Key remapping with `as`

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### What `as` does

After `in`, `as NewKey` **renames** (or filters) the emitted key:

- Template literals build names (`on${Capitalize<…>}`)
- Map to `never` to **drop** keys:

```ts
type PublicOnly<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};
```

`string & K` (or `Exclude<K, symbol>` patterns) helps when `keyof` includes `symbol`/`number` and template types expect `string`.

---

## Combining with conditional types

```ts
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type NonFunctionProps<T> = Pick<T, NonFunctionPropertyNames<T>>;
```

Or remap:

```ts
type NonFunctionProps2<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
```

Pattern: **filter keys** with conditionals, **map values** with `T[K]` transforms.

Deep partial sketch (awareness):

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

(Edge cases with arrays/`Date`/functions — keep simple in interviews unless asked.)

---

## Homomorphic mapped types (awareness)

When you write `{ [K in keyof T]: … }` over `keyof T`, TypeScript often preserves optional/readonly modifiers from `T` in subtle “homomorphic” ways unless you override with `+/-`. That’s why `Partial` explicitly adds `?` and `Required` uses `-?`.

You don’t need the full theory — know that **modifiers on the map** are how you force optional/required/readonly.

---

## Common mistakes and misconceptions

1. Thinking `Partial`/`Readonly` are compiler magic — they’re mapped types.  
2. Expecting deep immutability/optionality from shallow maps.  
3. Believing `readonly` freezes at runtime.  
4. Forgetting `K extends keyof T` on `Pick`-like helpers.  
5. Template remapping without handling `symbol` keys (`string & K`).  
6. Overbuilding deep recursive maps for a one-off DTO.

---

## Connections to other concepts

```
keyof T + T[K]
  → mapped type over properties
    → Partial / Readonly / Pick / Record

+/- ? / readonly
  → force modifiers

as NewKey | never
  → rename or filter keys

T[K] extends … ?
  → conditional filter inside maps
    → advanced derivations

utility-types unit
  → consumers of this machinery
```

---

## Interview perspective

You should be able to:

1. Write `{ [K in keyof T]: T[K] }` and explain it.  
2. Implement `Readonly` / `Partial` / `Required` with modifiers.  
3. Contrast compile-time `readonly` vs `Object.freeze`.  
4. Show a simple `as` remapping example.  
5. Sketch how `Omit` uses `Exclude` + `Pick`.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
