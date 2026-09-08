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

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
