# Strict Mode, Unpacked — Answers

## Core recall

1. A **bundle** of individual compiler flags, not one monolithic check.
2. Roughly: `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, `useUnknownInCatchVariables`, `alwaysStrict`, `noImplicitThis`, `strictBindCallApply`.
3. `null`/`undefined` are **not** assignable to other types unless included in the type (or narrowed away).
4. **Implicit** `any` on untyped parameters/vars that would otherwise be inferred as `any`.
5. Fields must be initialized (declaration/constructor), optional/`| undefined`, or asserted with `!`.
6. **`unknown`**, not `any`.
7. **`noImplicitThis`:** bare `this` isn’t implicit `any`. **`strictBindCallApply`:** `call`/`bind`/`apply` args must match the function.
8. **`strictNullChecks`**, then **`noImplicitAny`**.

## Explain why

1. Null/undefined crashes are extremely common; without the flag, types lie (`string` may be null) and TS won’t catch them.
2. Implicit `any` turns off checking for that value and anything derived from it — silent holes in the type system.
3. Without null checks, `null` is allowed where `string` is declared; runtime still throws on `.length`.
4. Parameter properties assign in the constructor, satisfying initialization while wiring DI.
5. `!` tells the compiler “trust me” — if init is wrong, you get runtime undefined with no compile error.
6. Thrown values aren’t guaranteed `Error`; `unknown` forces narrowing before property access.

## Compare and contrast

1. **`strict`:** TS type-checking bundle (+ `alwaysStrict` emit). **`"use strict"`:** JS runtime language mode. Related but not the same thing.
2. **Off:** assignment often allowed. **On:** compile error unless type includes `null`.
3. **Implicit:** banned by the flag. **Explicit `any`:** still allowed if you write `: any`.
4. **`= []`:** real init. **`!`:** assertion without providing a value — only when something else assigns first.
5. **Function types:** unsafe callback/parameter assignability. **Null checks:** presence/absence of nullish values.
6. **Flag:** default catch type is `unknown` everywhere. **Manual:** easy to forget and leave `any`-like usage.

## Predict compile vs runtime

1. **Compile error** — `null` not assignable to `string`.
2. **Compile error** — parameter `x` implicitly `any`.
3. **Compile error** — `x` not initialized.
4. **Compile error** (typically) — `e` is `unknown`, no `.message` without narrowing.
5. **Yes** — constructor parameter property initializes `repo`.

## Debugging

1. Fix in layers: enable strict, prioritize null/`any` hotspots, use `| null` + narrowing, avoid mass `!` / `as any`.
2. `= undefined`/`| undefined` if optional; default value; inject via constructor param property; rare `!` if framework sets it.
3. A function with **narrower parameters** used where a **wider** parameter type is required — potential unsafe call.
4. Keep methods on the object, bind/`=>` lexical this, or type a `this` parameter — don’t detach unbound `function`.
5. Argue that disabling null checks removes most of TS’s crash-prevention value; migrate with unions/narrowing instead.

## Application

1.
```ts
function getLength(s: string | null) {
  if (s === null) return 0;
  return s.length;
}
```

2.
```ts
function f(x: string) {
  return x;
}
```

3.
```ts
class A {
  x: number = 0;
  // or y!: number;
  // or constructor(public z: number) {}
}
```

4.
```ts
try {
  /* … */
} catch (e) {
  if (e instanceof Error) console.error(e.message);
  else console.error(e);
}
```

5.
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## Interview questions

1. **Spoken:** `strict` enables ~eight flags. Biggest impact: `strictNullChecks` (null not assignable everywhere). Second: `noImplicitAny`.  
   **Follow-ups:** Nest: defaults, `!` sparingly, constructor param properties for DI.

2. **Spoken:** Before: `getLength(null)` compiles and crashes. After: compile error unless `string | null` + narrow.

3. **Spoken:** Errors on implicit `any` so untyped params can’t silently disable checking; annotate or rely on contextual inference.

4. **Spoken:** Uninitialized fields error; Nest uses constructor injection properties, defaults, or careful `!`.

5. **Spoken:** `catch (e)` is `unknown` — must narrow before use; aligns with treating failures as untrusted data.

## Connections

1. Once null is explicit in types, you **must** narrow (`=== null`, guards) before use.
2. Both push “untrusted/untyped → `unknown` or explicit types, not silent `any`.”
3. DI constructor fields satisfy init; DTO class fields often get defaults or definite assignment when framework assigns.
4. `strict` checks your TS; HTTP JSON still needs pipes/validators — erasure and untrusted input remain.
5. Optional props/`T | null` state must be handled before render/access — same null-safety discipline.
