# Modules: CommonJS vs ES Modules

## What you need to know

A **module** is a file with its own scope that explicitly **exports** some bindings and **imports** others. That replaces accidental globals with a dependency graph.

JavaScript has two dominant module systems you must be fluent in:

| System | Where you see it |
|---|---|
| **CommonJS (CJS)** | Classic Node (`require` / `module.exports`), many compiled Nest/TS backends |
| **ES Modules (ESM)** | Browsers, modern Node, what you write in React/RN source, what bundlers prefer to analyze |

Interview goal: explain **syntax**, **when resolution happens**, **live bindings vs copies**, **tree-shaking**, **circular deps**, and **interop pain** — not recite Node’s full resolver algorithm.

Curriculum checklist this unit completes:

- CJS: `require` / `module.exports`, sync, runtime
- ESM: `import` / `export`, static, parse-time graph
- Live bindings (ESM) vs value copies (CJS primitives / destructuring)
- Default vs named exports + interop (`esModuleInterop`)
- Circular dependency differences
- Top-level `this`
- `.mjs` / `.cjs` / `"type": "module"`

---

## Why modules exist

Without modules:

- Shared files pollute one global scope (classic scripts).
- Dependency order is manual (`<script>` tag order).
- Tree-shaking and clear public APIs are hard.

With modules:

- Each file has **module scope** (Scope unit).
- Dependencies are declared.
- Tools can bundle, split, and sometimes drop unused exports.

---

## CommonJS: mental model

### Syntax

```js
// math.js
const { secret } = require('./secret'); // sync load

function add(a, b) {
  return a + b;
}

module.exports = { add };
// or exports.add = add;  // exports is an alias to module.exports initially
```

```js
// app.js
const math = require('./math');
math.add(1, 2);
```

Also common:

```js
module.exports = function main() {}; // export a single function
exports.foo = 1; // after replacing module.exports entirely, exports may no longer be the same object — footgun
```

### How it works

1. `require(id)` runs **at runtime** when that line executes.
2. Node resolves `id` to a file, loads it (or returns cached `module.exports`).
3. The required module executes **synchronously** top-to-bottom.
4. Whatever sits on `module.exports` when evaluation finishes is the return value of `require`.

Modules are **cached** after first load: later `require` of the same resolved path returns the same exports object.

### Why “runtime / dynamic” matters

`require` is an ordinary function call:

```js
if (cond) {
  require('./a');
}
require( somehowGetPath() ); // dynamic string — legal in CJS
```

A bundler cannot always prove which files are needed without executing logic → weak static tree-shaking.

### Top-level `this` in CJS

In Node CommonJS wrappers, top-level `this` is typically the **`exports` object** (same starting object as `module.exports` before reassignment). Do not rely on this in modern code; know it for interviews contrasting ESM.

---

## ES Modules: mental model

### Syntax

```js
// math.mjs
export function add(a, b) {
  return a + b;
}

export const VERSION = 1;

export default function main() {}
```

```js
// app.mjs
import main, { add, VERSION } from './math.mjs';
import * as math from './math.mjs';
```

Rules that enable static analysis:

- `import` / `export` are **declarations**, not runtime function calls (except dynamic `import()`).
- Specifiers are **static strings** in static imports (`import x from './a.js'`, not a variable).
- Static imports are hoisted and evaluated before module body runs; dependency graph is known up front.

### Resolution timing

ESM builds a module graph at **parse/link** time:

1. Parse files, find static imports.
2. Load dependency graph.
3. Link exports to imports (**live bindings**).
4. Evaluate modules in post-order (dependencies first), respecting cycles with special rules.

That static graph is why **tree-shaking** and reliable **code-splitting boundaries** work better than with CJS.

### Dynamic `import()`

```js
const mod = await import('./lazy.mjs'); // returns Promise
```

This is ESM’s async/conditional loading hatch. Specifier can be computed in many environments, but static `import` remains the analyzable default.

### Top-level `this` in ESM

Top-level `this` is **`undefined`**. ESM is always strict. No `module.exports`-shaped `this`.

### Top-level await

ESM can use **top-level `await`** (in supporting runtimes/bundlers). CJS cannot at the top level without wrapping in async IIFEs. This often appears when comparing Nest/Node module targets.

---

## Core differences table (preserved)

| | CommonJS | ES Modules |
|---|---|---|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Resolution timing | Runtime (dynamic, synchronous) | Parse/link time (static graph) |
| Tree-shaking | Hard / often impossible to do fully | Possible with static `import`/`export` |
| Exported values | `require` returns the exports object; reading a primitive field once is a snapshot | **Live bindings** — importer sees updates to exported bindings |
| Async loading | No native `import()`-style | `import()` → Promise |
| Top-level `this` | `exports` / `module.exports` (Node CJS) | `undefined` |
| Circular deps | Partial `exports` object may be returned mid-init | Live bindings; unfinished exports can be in TDZ |

---

## Live bindings (ESM) vs copies (CJS)

### ESM live bindings (preserved example)

```js
// counter.mjs
export let count = 0;
export function increment() {
  count++;
}

// main.mjs
import { count, increment } from './counter.mjs';
console.log(count); // 0
increment();
console.log(count); // 1 — live view, not a frozen snapshot
```

Importer bindings are **live** and **read-only**:

```js
import { count } from './counter.mjs';
// count = 5; // TypeError — cannot reassign imported binding
```

Mutating an exported **object**’s properties is visible everywhere because everyone shares the object reference (true in both systems):

```js
// state.mjs
export const state = { n: 0 };

// a.mjs
import { state } from './state.mjs';
state.n++;
```

### CJS “copy” intuition (important precision)

```js
// counter.cjs
let count = 0;
module.exports = {
  get count() {
    return count;
  }, // getter stays live via object
  // or simply:
};
let count2 = 0;
exports.count2 = count2;
exports.increment2 = () => {
  count2++;
  exports.count2 = count2; // must update the exported property
};
```

Classic beginner version:

```js
// counter.cjs
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };
```

```js
const { count, increment } = require('./counter.cjs');
increment();
console.log(count); // still 0 — destructuring copied the primitive at require time
```

```js
const counter = require('./counter.cjs');
counter.increment();
// counter.count still 0 unless increment updates module.exports.count
```

Causal rule:

- CJS gives you the **`module.exports` object** (cached).
- Destructuring a **primitive property** copies the current value.
- ESM imported names are **bindings** to the exporter’s variables (for `let`/`const`/`function` exports), so updates show up.

The outline’s claim is right for the usual primitive export + destructure story; object exports / getters can still look “live” in CJS.

---

## Named exports vs default exports

### ESM

```js
export const a = 1;          // named
export default function f() {} // default (one per module)

import f, { a } from './m.mjs';
import { default as f2, a as a2 } from './m.mjs';
```

Named exports map cleanly to tree-shaking (“was `a` used?”).

Default exports are convenient but easier to rename inconsistently across files (`import React` vs `import react`).

### CJS

There is no first-class “default.” People fake it:

```js
module.exports = function f() {};
module.exports.a = 1; // also attach named props
// or
exports.a = 1;
```

### Interop pain (`esModuleInterop`, Node dual packages)

When TypeScript/Node bridges CJS ↔ ESM:

- CJS `module.exports = fn` may appear as `module.exports` **and** fake `exports.default` depending on interop helpers.
- Without `esModuleInterop` / `allowSyntheticDefaultImports`, `import fs from 'fs'` may fail type-checking or runtime expectations; `import * as fs from 'fs'` or `const fs = require('fs')` patterns differ.
- `import pkg from 'cjs-pkg'` might need `pkg.default` in some compile targets.

Interview framing:

> Default/named mismatch plus CJS’s single `module.exports` value is why interop flags and `default` wrappers exist. It’s not that one system is “wrong”; they encode public API differently.

Practical advice: prefer **named exports** in new shared libraries when you care about clearest ESM ergonomics and shaking; follow each ecosystem’s idioms (`react` default export is fixed by history).

---

## Circular dependencies

### CommonJS

```js
// a.js
exports.loaded = false;
const b = require('./b'); // b starts loading
exports.loaded = true;

// b.js
const a = require('./a');
module.exports = { aLoaded: a.loaded }; // may see false — a not finished
```

CJS returns the **already-created `exports` object** even if the exporter hasn’t finished running. You can read **partial** state. Order of assignment matters.

### ESM

ESM links bindings first, then evaluates. You can import a binding that is still in the **temporal dead zone** if you read it before its exporting module finishes initializing:

```js
// a.mjs
import { b } from './b.mjs';
export const a = 'a';
console.log(b); // depends on evaluation order / whether b finished

// b.mjs
import { a } from './a.mjs';
export const b = 'b' + a; // may throw if `a` not initialized yet
```

Cycles can work if you only **call functions** after both modules initialized, or if you avoid reading unfinished bindings at top level.

Interview line:

> CJS cycles often give a partial exports object. ESM cycles give live bindings but reading too early can throw (TDZ-like). Both are reasons to avoid deep circular top-level coupling.

---

## How Node decides CJS vs ESM

| Signal | Meaning |
|---|---|
| `"type": "module"` in nearest `package.json` | `.js` treated as ESM |
| `"type": "commonjs"` or omitted (Node default) | `.js` treated as CJS |
| `.mjs` | Always ESM |
| `.cjs` | Always CJS |

Also: bundlers may parse “ESM syntax” in files that Node would still treat as CJS until compile time — your **source** can be ESM while **output** is CJS.

---

## Tree-shaking (preserved interview answer)

**Q: Why can't bundlers tree-shake CommonJS as well as ES Modules?**

Strong answer (preserved):

> `require()` can be conditional, computed with a dynamic string, or wrapped in try/catch — it’s a runtime function call, so a bundler can’t always know statically which modules are used without running the code. `import`/`export` are declarative, top-level, with static specifiers, so a bundler can build a dependency and usage graph at build time and drop unused exports. That static analyzability also makes `import()` a reliable code-split point.

Extra precision: some bundlers partially shake “simple” CJS, but it’s heuristic and fragile. ESM is the model designed for it.

`import _ from 'lodash'` vs `import { get } from 'lodash-es'` is the practical React/Metro/Vite version of the same idea: **named ESM exports** give the graph something precise to drop.

---

## Practical relevance to your stack (preserved + sharpened)

### NestJS / Node backend

- Many TS Nest apps still **emit CJS** (`"module": "commonjs"`) even if you write `import` syntax — TypeScript rewrites to `require`.
- That affects:
  - `__dirname` / `__filename` (easy in CJS; in ESM use `import.meta.url`)
  - top-level await availability
  - default import interop with CJS packages
- Always know your actual **`package.json` `"type"`** and **`tsconfig` `module`** — source syntax ≠ runtime system.

### React / RN / Vite / Metro / webpack

- You author ESM.
- Bundler builds the static graph, tree-shakes, code-splits on `import()`.
- Prefer packages that ship ESM named exports when bundle size matters (`lodash-es` pattern).

---

## Common mistakes and misconceptions

1. **“I wrote `import`, so I’m running ESM.”** Not if tsc/ Nest emits CJS.
2. **Destructuring CJS primitives once and expecting updates.** Snapshot of the value at destructuring time.
3. **Reassigning `exports = ...` in CJS.** Breaks the alias to `module.exports`; use `module.exports = ...`.
4. **Expecting tree-shaking from arbitrary `require`.**
5. **Reading circular ESM bindings at top level.** TDZ / partial init bugs.
6. **Assuming default export exists on every CJS package** without interop helpers.
7. **Using `__dirname` in native ESM** without `import.meta.url` conversion.
8. **Mixing `.js` expectations** without checking `"type"` / extensions.

---

## Connections to other concepts

```
module scope
  → no accidental script globals
    → explicit export surface

static import/export
  → analyzable graph
    → tree-shaking / code splitting

ESM live bindings
  → importer sees exporter’s updates
    ↔ CJS exports object + primitive snapshot footguns

circular init
  → CJS partial exports object
  → ESM TDZ on unfinished bindings
    → same family of “used before ready” bugs as hoisting/TDZ

top-level this
  → undefined in ESM (strict module)
  → exports in Node CJS wrapper
```

Modules are how **scope** is packaged across files. Live bindings are a cross-file cousin of “same binding, many readers.” Circular evaluation issues rhyme with **TDZ**: the name exists in the graph before initialization finished.

---

## Interview perspective

You should be able to:

1. Contrast CJS vs ESM on syntax, timing, shaking, `this`, async load.
2. Explain ESM live bindings with the `count` / `increment` example.
3. Explain why CJS destructuring of a number doesn’t update.
4. Deliver the tree-shaking answer cleanly.
5. Describe circular-dep failure modes in both systems.
6. Say how Node picks CJS/ESM (`"type"`, `.mjs`, `.cjs`) and why Nest/TS emit format matters.
7. Mention default/named interop without getting lost in flags.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
