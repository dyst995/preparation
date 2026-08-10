# 07. Modules: CommonJS vs ES Modules

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] CommonJS: `require`/`module.exports`, synchronous, resolved at runtime
- [ ] ES Modules: `import`/`export`, statically analyzable, resolved at parse time (enables tree-shaking)
- [ ] Live bindings in ESM vs value copies in CommonJS
- [ ] `default` export vs named exports, and interop pain (`esModuleInterop` in TS/Node)
- [ ] Circular dependency behavior differs between the two systems
- [ ] Top-level `this` differs (`undefined` in ESM vs `module.exports` in CJS)
- [ ] `.mjs`/`.cjs`/`"type": "module"` in `package.json`

### Core differences

| | CommonJS | ES Modules |
|---|---|---|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Resolution timing | Runtime (dynamic, synchronous) | Parse/compile time (static) |
| Tree-shaking | Not possible (dynamic requires) | Possible (bundlers can statically analyze unused exports) |
| Exported values | Copies of values at export time (for primitives) | Live bindings - importer sees updates to the exported variable |
| Async loading | No native support | `import()` returns a Promise (dynamic import) |
| Top-level `this` | `module.exports` (`{}`) | `undefined` |
| Circular deps | Returns partially-populated `exports` object | Live bindings can resolve correctly once fully evaluated, but TDZ-like issues can occur |

### Live bindings example (ESM-specific behavior)

```js
// counter.mjs
export let count = 0;
export function increment() { count++; }

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1 - the import is a live, read-only view, not a snapshot
```

The equivalent in CommonJS would **not** update, because `require` copies the value of `count` at the time of import (unless you re-access via the module object, e.g. `counter.count`).

### Interview question

**Q: Why can't bundlers tree-shake CommonJS as well as ES Modules?**

**Strong answer:**
> "`require()` calls can be conditional, computed with a dynamic string, or wrapped in try/catch - they're just function calls evaluated at runtime, so a bundler can't always know statically which modules are actually used without running the code. `import`/`export` are declarative and must appear at the top level with static specifiers, so a bundler can build a complete dependency and usage graph at build time and safely drop unused exports. That static analyzability is also what enables `import()` dynamic imports to be reliably code-split."

### Practical relevance to your stack

- **NestJS/Node backend**: TypeScript typically compiles to CommonJS for Node unless you've opted into `"type": "module"` + ESM output - worth knowing which your `tsconfig.json`/`package.json` target, since it affects `__dirname`, top-level await, and interop with `import` syntax.
- **React/RN via Metro/webpack/Vite**: you write ESM syntax, but bundlers transform/tree-shake it; understanding static analyzability explains why `import { specificThing } from 'lodash-es'` tree-shakes but `import _ from 'lodash'` often doesn't.

---
