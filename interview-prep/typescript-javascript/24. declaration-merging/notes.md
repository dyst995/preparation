# Declaration Merging and Module Augmentation

## What you need to know

**Declaration merging** means TypeScript combines multiple declarations that share the **same name** into one definition. The most common case: two `interface` declarations with the same name in the same scope become one interface with all members.

**Augmentation** is using that rule on purpose to **extend types you don’t own** — Express `Request`, library `Config`, `Window` — without editing `node_modules`.

Curriculum checklist:

- Interface declaration merging (real use cases beyond chapter 3)
- Namespace merging with functions / classes / enums
- Module augmentation (`declare module '…'`)
- Global augmentation (`declare global { … }`)
- Nest/Express: typing `req.user` after auth

Prerequisites: [type vs interface](../15.%20type-vs-interface/notes.md) (merging is a main `interface` advantage), [modules](../7.%20modules/notes.md), structural typing / erasure.

---

## Interface declaration merging

```ts
interface User {
  id: string;
}
interface User {
  email: string;
}
// Effective: { id: string; email: string }
```

### Mental model

Same name + same kind (interface) + compatible members → **one** interface. Later declarations **add** properties (or methods). Conflicting property types with the same name → error.

### Why it exists

1. **Split definitions** across files (e.g. open-ended plugin APIs).  
2. **Third-party extension** without forking type packages.  
3. **Incremental ambient types** for JS libraries.

This is **compile-time only**. Merging does not change runtime objects; your code must still attach `req.user` in middleware.

### Recap vs `type`

```ts
type A = { id: string };
type A = { email: string }; // Error: Duplicate identifier
```

`type` aliases do **not** merge. If a library exports `type Config = …`, you generally **cannot** augment it with another `type Config` or by reopening it as an interface of the same name in a way that merges into that alias. Library authors often expose **`interface`** for config/request shapes so apps can augment.

---

## Namespace merging (functions, classes, enums)

Namespaces (and some value+type pairs) can merge in patterns that feel odd until you see the use case.

### Function + namespace

```ts
function createApp() {
  return { listen() {} };
}
namespace createApp {
  export interface Options {
    port?: number;
  }
}
// createApp is callable; createApp.Options is a nested type
```

Classic pattern for APIs that are both a value and a container of related types (`React` historically, some builders).

### Class + namespace

```ts
class Router {}
namespace Router {
  export type Params = Record<string, string>;
}
```

Static-ish companion types living under the class name.

### Enum + namespace

```ts
enum Color {
  Red,
  Green,
}
namespace Color {
  export function isWarm(c: Color) {
    return c === Color.Red;
  }
}
```

Adds functions (or values) under the enum object.

**Interview depth:** Know that merging isn’t only interfaces — value/namespace combinations exist — but **day-to-day Nest/Express work** is almost always **interface** merging via augmentation.

---

## Module augmentation

Extend types **exported by a module** without touching that package’s source:

```ts
import 'some-library';

declare module 'some-library' {
  interface Config {
    myCustomOption?: boolean;
  }
}
```

### How it works

1. `declare module 'some-library'` opens that module’s type scope.  
2. An `interface Config` **with the same name** as an existing **interface** in that module **merges**.  
3. Everywhere `Config` from that module is used, your fields appear.

### Requirements and caveats

- Target must be an **`interface`** (mergeable), not a closed `type` alias.  
- The `.d.ts` / file must be part of the compilation (`include` / project references).  
- Often you need a **side-effect import** (`import 'some-library'`) or ensure the file is treated as a module so augmentation attaches correctly.  
- Wrong module name → silent “my own local interface” that never merges with the library.

### Express note

Express’s `Request` historically lives under patterns like `namespace Express` / `@types/express` and sometimes people augment `express-serve-static-core`. The Nest curriculum example uses **global `namespace Express`** (below). In interviews, the important part is: **augment the interface the types actually use**, in the correct module/global scope — not invent a parallel `Request`.

---

## Global augmentation

Add to **global** types (or global namespaces) from inside a module:

```ts
// types/express.d.ts
import { User } from '../users/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {}; // ensure this file is a module when needed
```

### Why `declare global`

A file with top-level `import`/`export` is a **module**. Declarations inside a module are **not** global by default. `declare global { … }` explicitly adds declarations to the global scope so they merge with `@types/express`’s `Express.Request`.

`export {}` (or any import/export) can force “this file is a module” so you don’t accidentally create a script that pollutes differently than intended.

### Window / DOM example

```ts
declare global {
  interface Window {
    __APP_CONFIG__?: { apiUrl: string };
  }
}
export {};
```

Then `window.__APP_CONFIG__` type-checks.

---

## Real use case: NestJS + Express `Request.user`

Preserved pattern:

```ts
// types/express.d.ts
import { User } from '../users/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

After an auth guard/middleware does `req.user = someUser`, controllers can use `@Req() req: Request` and see `req.user` typed — without editing Express’s own `.d.ts`.

### Strong interview answer (preserved)

> Declaration merging via global augmentation — a `.d.ts` with `declare global { namespace Express { interface Request { user?: User } } }`. TypeScript merges into `@types/express`’s `Request` because same-named interfaces combine. Purely compile-time; runtime still requires middleware/guard to assign `req.user`.

### Important qualifications

- Prefer `user?: User` if unauthenticated requests exist; use a narrower typed request or assertion after auth if you want `user` required in protected routes.  
- Augmentation does **not** run middleware — types can lie if you forget to attach `user`.  
- Ensure the `.d.ts` is included in `tsconfig` (`include: ["src/**/*", "types/**/*.d.ts"]` or similar).

---

## Ambient context vs “owning” types

| Approach | When |
| --- | --- |
| Augment third-party `interface` | You need the **same** type name everywhere (`Request`, `Config`) |
| Intersection alias `Request & { user: User }` | Local only; won’t update every `Request` reference |
| Wrapper type / Nest `@CurrentUser()` decorator | Often cleaner than putting everything on `Request` |
| Fork / patch `node_modules` types | Avoid — augmentation exists so you don’t |

Augmentation wins when the **ecosystem** already types many APIs as `Request` and you want one consistent extension.

---

## Common mistakes and misconceptions

1. Trying to merge **`type` aliases** — they don’t merge; augment **`interface`**.  
2. Declaring `interface Request { user: User }` in a **local** file — creates a **different** `Request`, doesn’t merge with Express.  
3. Wrong target: augmenting `'express'` vs the actual namespace/module that defines `Request`.  
4. Thinking augmentation **sets** `req.user` at runtime.  
5. `.d.ts` not in `include` → “property user does not exist” forever.  
6. Ambient file without `import`/`export` vs module file — forgetting `declare global` when the file is already a module.  
7. Making `user` required on all requests while many routes are public → noisy optional chaining or unsafe assumptions.

---

## Connections to other concepts

```
interface (mergeable)
  → declaration merging
    → module augmentation / declare global
      → Express Request.user in Nest

type alias (non-mergeable)
  → forces intersection wrappers or library redesign

erasure
  → types don’t attach runtime properties
    → middleware still required

modules (ESM)
  → file with import is a module
    → need declare global for globals
```

---

## Interview perspective

You should be able to:

1. Define declaration merging and give the Express `Request` example.  
2. Explain why libraries prefer `interface` for extensible config.  
3. Distinguish **module** vs **global** augmentation.  
4. Say clearly: compile-time merge ≠ runtime behavior.  
5. Mention `.d.ts` must be part of the project and target the correct scope.

---

# Self-test

## Core recall

1. What is declaration merging for interfaces?
2. Do `type` aliases merge?
3. What is module augmentation? Sketch `declare module '…'`.
4. What is global augmentation? Sketch `declare global`.
5. Why does a file with `import` often need `declare global` to affect `Window` / `Express`?
6. In the Nest Express example, what namespace and interface are extended?
7. Does augmenting `Request` assign `req.user` at runtime?
8. Name one non-interface merging pattern (function/class/enum + namespace).

## Explain why

1. Why do library authors often expose config as `interface` instead of `type`?
2. Why isn’t a local `interface Request { user: User }` enough in a Nest controller file?
3. Why must middleware/guards still set `req.user` after augmentation?
4. Why might `user` be optional (`user?: User`) on the augmented `Request`?
5. Why can wrong module string in `declare module` fail “silently” (types never pick up your fields)?
6. Why is augmentation preferable to editing files under `node_modules/@types`?

## Compare and contrast

1. Declaration merging vs intersection type (`A & B`)  
2. Module augmentation vs global augmentation  
3. Augmenting Express `Request` vs defining `AuthenticatedRequest = Request & { user: User }`  
4. `interface` vs `type` for third-party extensibility  
5. Ambient `.d.ts` augmentation vs changing runtime prototype / monkey-patching  
6. Function+namespace merge vs interface merge (what each is for)

## Predict the output / resulting type

1.
```ts
interface A { x: number }
interface A { y: string }
// Effective shape of A?
```

2.
```ts
type A = { x: number }
type A = { y: string }
// What happens?
```

3.
```ts
// In a project with Express types +:
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
// Does Request from Express include user? Why?
```

4.
```ts
declare module 'some-library' {
  interface Config {
    debug?: boolean;
  }
}
// Only works if Config in that module was originally…?
```

5.
```ts
function f() {}
namespace f {
  export type Opts = { n: number };
}
// Is f.Opts valid? Is f callable?
```

## Debugging

1. Augmented `req.user` but TypeScript still errors “Property 'user' does not exist on type 'Request'.” List likely causes.

2. Author writes `type Request = Express.Request & { user: User }` in one file; other files still lack `user`. Why?

3. `declare module 'express' { interface Request { user: User } }` doesn’t merge as expected. What might be wrong?

4. `.d.ts` uses `declare global` but the file has no `import`/`export` and behaves oddly with other ambient declarations. What discipline helps?

5. `user` is typed as always present, but public routes crash when reading `req.user.id`. What’s the type/runtime mismatch?

## Application

1. Write a `types/express.d.ts` that adds optional `user?: { id: string; email: string }` to Express `Request` via global augmentation.

2. Write module augmentation adding `retryCount?: number` to an interface `ClientOptions` in module `'http-client'`.

3. Augment `Window` with optional `__BUILD_ID__?: string`.

4. Show a function+namespace merge exporting `parse.Options`.

5. Given you cannot augment a library’s `type Config`, show an app-level alternative type for your extra fields.

## Interview questions

1. You need `req.user` typed on every Express request after auth, without touching `node_modules`. How?  
   **Follow-ups:** Runtime? Optional vs required `user`?

2. What is declaration merging?  
   **Follow-ups:** Module vs global augmentation?

3. Why can’t you augment a `type` alias the same way?

4. How do you extend a third-party library’s exported `interface Config`?

5. What can go wrong if augmentation is wrong but middleware is correct (or vice versa)?

## Connections

1. How does this unit deepen the “interface vs type” story?
2. How does type erasure constrain what augmentation can do?
3. How do Nest guards/middleware relate to the types you declare?
4. How is this different from mapped types / utilities that *derive* new shapes?
5. When would `@CurrentUser()` / a custom decorator be preferable to putting `user` on `Request`?
