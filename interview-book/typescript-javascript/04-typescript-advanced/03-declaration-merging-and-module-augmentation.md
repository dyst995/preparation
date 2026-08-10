# 03. Declaration merging and module augmentation

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] Interface declaration merging (recap from chapter 3, now with real use cases)
- [ ] Namespace merging with functions/classes/enums
- [ ] Module augmentation - adding to types from an already-imported module (`declare module 'express' { ... }`)
- [ ] Global augmentation - adding to global types (`declare global { interface Window { ... } }`)
- [ ] Real use case: extending Express's `Request` in NestJS after auth middleware attaches `user`

### The real-world use case: augmenting Express's `Request` in NestJS

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

After an auth guard/middleware attaches `req.user = someUser`, every controller in the app can now write `@Req() req: Request` and access `req.user` with full type safety, without ever touching Express's own type definitions directly - TypeScript merges your `interface Request` declaration into the existing one from `@types/express`.

### Module augmentation example (a library's types, not global)

```ts
// augmenting a third-party module's exported interface
import 'some-library';

declare module 'some-library' {
  interface Config {
    myCustomOption?: boolean;
  }
}
```

This only works if the original declaration is also an `interface` (mergeable) - you cannot augment a `type` alias this way, which is one of the concrete, practical reasons library authors often expose configuration objects as `interface`s rather than `type`s.

### Interview question

**Q: You need `req.user` to be typed on every Express request after your auth guard runs, without touching `node_modules`. How?**

**Strong answer:**
> "Declaration merging via global augmentation - create a `.d.ts` file that does `declare global { namespace Express { interface Request { user?: User } } }`. TypeScript merges this into the existing `Request` interface from `@types/express` because interfaces with the same name in the same scope combine automatically. This is purely a compile-time addition - it doesn't change anything at runtime, so the actual `req.user = user` assignment still has to happen in real middleware/guard code; this just makes the compiler aware of it."

---
