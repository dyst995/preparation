# Declaration Merging and Module Augmentation — Answers

## Core recall

1. Multiple `interface` declarations with the **same name** in the same scope combine into one interface with all members (compatible members only).
2. **No** — duplicate `type` names are errors; aliases don’t merge.
3. Opening a module’s type scope to add/merge declarations: `declare module 'pkg' { interface X { … } }`.
4. Adding declarations to the global scope from a module: `declare global { interface Window { … } }` (or `namespace Express { … }`).
5. Imports make the file a **module**; top-level declarations aren’t global unless wrapped in `declare global`.
6. **`namespace Express`**, **`interface Request`**.
7. **No** — compile-time only; middleware/guard must assign the property.
8. Examples: **function + namespace**, **class + namespace**, **enum + namespace**.

## Explain why

1. Apps can **merge** extra fields into that `interface` via augmentation. A `type` alias is closed — no merge — so plugins/apps can’t reopen it.
2. That creates a **different** local `Request` (or shadows names) instead of merging into Express’s `Request`. Controllers importing Express’s type still won’t see `user`.
3. Types erase; nothing in `.d.ts` runs. Runtime attachment is separate from the compiler knowing the shape.
4. Many requests are unauthenticated; required `user` would be a lie on public routes and force unsafe assumptions.
5. You’re declaring into a module that isn’t the one that owns the real `Config`/`Request` — your interface never merges with the one everyone imports.
6. Upgrades overwrite `node_modules`; patches aren’t portable. Augmentation is the supported, version-resilient extension point.

## Compare and contrast

1. **Merging:** same name, combined declaration, still called `Request`/`Config`. **Intersection:** new composed type (often a new alias); doesn’t rewrite existing named declarations.
2. **Module:** `declare module 'pkg'` for exported module types. **Global:** `declare global` for globals / global namespaces (`Window`, `Express`).
3. **Augment:** every `Request` in the project gains `user`. **Alias:** only places that use `AuthenticatedRequest` see `user`.
4. **`interface`:** mergeable / augmentable. **`type`:** flexible for unions/maps, but not reopenable via merging.
5. **Augmentation:** types only. **Monkey-patch:** changes runtime behavior; types may still need updates separately.
6. **Function+namespace:** callable value + nested types/values under one name. **Interface merge:** open object shape composition.

## Predict the output / resulting type

1. `{ x: number; y: string }` — interfaces merged.
2. **Compile error** — duplicate identifier / `type` doesn’t merge.
3. **Yes** (if `.d.ts` is included and targets the same `Express.Request`) — global namespace interface merge.
4. An **`interface Config`** in that module (mergeable), not a `type` alias.
5. **Yes and yes** — `f` callable; `f.Opts` is the nested type from namespace merge.

## Debugging

1. `.d.ts` not in `tsconfig` include; wrong augmentation target/module; local shadowing `Request`; missing `declare global` in a module file; IDE using different project.
2. Intersection alias is **local** — doesn’t merge into the shared Express `Request` type.
3. Express’s `Request` may live under a different module/namespace than `'express'`; or `Request` isn’t an interface there; or file not included.
4. Prefer explicit modules (`import`/`export {}`) + `declare global` for global merges; keep ambient scripts intentional and minimal.
5. Types claim `user` always exists; runtime doesn’t on public routes — make `user?` or use a narrower type after auth.

## Application

1.
```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}
export {};
```

2.
```ts
import 'http-client';

declare module 'http-client' {
  interface ClientOptions {
    retryCount?: number;
  }
}
```

3.
```ts
declare global {
  interface Window {
    __BUILD_ID__?: string;
  }
}
export {};
```

4.
```ts
function parse(input: string) {
  return input;
}
namespace parse {
  export interface Options {
    trim?: boolean;
  }
}
```

5.
```ts
import type { Config } from 'lib';
type AppConfig = Config & { myExtra?: boolean };
```

## Interview questions

1. **Spoken:** Global augmentation in a `.d.ts`: `declare global { namespace Express { interface Request { user?: User } } }`. Interfaces merge with `@types/express`. Compile-time only; middleware still assigns `req.user`.  
   **Follow-ups:** Not runtime; prefer optional `user` or a narrower authenticated request type.

2. **Spoken:** Same-named declarations (esp. interfaces) combine into one. Used for open APIs and augmenting libs.  
   **Follow-ups:** Module vs global depends on where the original type lives — augment that scope.

3. **Spoken:** `type` aliases don’t merge; you can’t reopen them. Use interface in the library, or app-level intersections/wrappers.

4. **Spoken:** `declare module 'pkg' { interface Config { … } }` with the package imported/included so the merge attaches.

5. **Spoken:** Wrong types + correct middleware → friction/false errors. Correct types + missing middleware → compiles but runtime `undefined` — types can lie.

## Connections

1. Merging/augmentation is the concrete reason to choose `interface` for extensible public object shapes.
2. Erasure means augmentation never installs properties — only describes them.
3. Guards/middleware provide the **runtime** `user`; augmentation documents it for the type checker.
4. Mapped/utility types **derive new shapes**; augmentation **extends an existing named declaration** in place.
5. Decorator/param injection avoids polluting global `Request`, keeps auth user explicit at call sites, and can enforce presence on protected routes more clearly.
