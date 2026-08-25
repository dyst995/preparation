# Mapped Types — Answers

## Core recall

1. **`{ [K in keyof T]: … }`** — for each key `K` of `T`, emit a property with a computed type.
2. **`{ [K in keyof T]?: T[K] }`** (`Partial`).
3. **`-?`**: `{ [K in keyof T]-?: T[K] }` (`Required`).
4. **Add:** `readonly [K in keyof T]`; **remove:** `-readonly [K in keyof T]`.
5. **`Pick`:** `{ [P in K]: T[P] }` with `K extends keyof T`. **`Record`:** `{ [P in K]: V }`.
6. Rename (or transform) emitted keys during the map — e.g. template literal names.
7. **`as (… ? never : K)`** — keys mapped to `never` are dropped.
8. **No** — compile-time only; not `Object.freeze`.

## Explain why

1. Interviewers want to see you understand the type system: `Partial` is a one-line mapped type. Shows you can derive utilities, not only name them.
2. Homomorphic maps may **preserve** optionality from `T`. `-?` **forces** required properties.
3. Types erase; JS objects stay mutable unless you freeze or use immutable APIs.
4. `keyof` can include `symbol`/`number`; `Capitalize` expects string-like input — `string & K` narrows for templates.
5. Conditionals classify `T[K]`; map (or remap to `never`) keeps only matching keys — derive a subset shape.
6. Mapped types exist only for checking; emit no runtime iteration.

## Compare and contrast

1. **Mapped:** iterate known keys (often from `keyof T`) with per-key types. **Index signature:** open-ended keys of a pattern (`string`/`number`) with uniform (or patterned) values — different openness.
2. **`Partial`:** top-level `?` only. **Deep partial:** recurse into nested objects.
3. **`Pick`:** keep listed keys. **`Omit`:** `Pick<T, Exclude<keyof T, K>>` — drop keys then pick rest.
4. **Value map:** same keys, new value types. **Key remap:** new key names (or filters), values often still `T[K]`.
5. **`Readonly`:** type checker blocks assignment through that type. **`freeze`:** runtime; still shallow unless deep-freeze.
6. **`keyof T` map:** tied to an existing shape (often preserves structure). **`Record`:** build from an arbitrary key union + value type.

## Predict the output / resulting type

1. `{ a: string; b: number }` — `-?` removes optionality from `b`.
2. `{ readonly a: string }`.
3. `{ a: boolean; b: boolean }`.
4. `{ getName: () => string }`.
5. `{ a: 1 }` — `_h` remapped to `never` and dropped.
6. `{ x: number; y: number }` — same idea as `Record<'x' | 'y', number>`.

## Debugging

1. **`Readonly` is shallow** — nested object properties aren’t recursively readonly.
2. Constrain/`Exclude` symbols, or use `string & K` (or map only string keys) before `Capitalize`.
3. Need `K extends PropertyKey` / `string | number | symbol` (or `keyof …`) — can’t freely use arbitrary `T` as key iterator without a key constraint.
4. Without `-?`, optionality from the source can remain; use `-?` for a true `Required`.

## Application

1.
```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };
```

2.
```ts
type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

3.
```ts
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
```

4.
```ts
type OptionalNullable<T> = { [K in keyof T]: T[K] | null };
```

5.
```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
// Arrays/Date/etc. need special cases in production.
```

## Interview questions

1. **Answer:** `type MyReadonly<T> = { readonly [K in keyof T]: T[K] }` — mapped type adding `readonly`. Prevents reassignment through that type at compile time.  
   **Follow-ups:** Not runtime freeze; nested objects need recursive map or freeze.

2. **Answer:** `Partial` adds `?`; `Required` uses `-?`. Same keys, forced modifiers.  
   **Follow-ups:** `?` optional; `-?` strips optional.

3. **Answer:** `[K in keyof T as NewKey]` renames keys (often templates).  
   **Follow-ups:** Map unwanted keys to `never` to filter.

4. **Answer:** `Pick`: `{ [P in K]: T[P] }`. `Record`: `{ [P in K]: V }`.

5. **Answer:** Filter or branch on `T[K]` (e.g. drop functions, deep partial) — conditionals decide; maps emit the shape.

## Connections

1. Utilities are thin wrappers over mapped (+ sometimes conditional) types — demystifies `Partial`/`Readonly`/`Pick`.
2. `keyof` supplies the key set; `T[K]` supplies value types inside the map body.
3. Conditional → `never` as remapped key drops properties — same filtering idea as `Exclude` on key unions.
4. Nested utilities compose maps/filters: omit keys, then make remaining optional, etc.
5. Erased types don’t validate payloads; runtime schemas still needed at boundaries.
