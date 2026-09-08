# Declaration Merging and Module Augmentation — Self-test

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
