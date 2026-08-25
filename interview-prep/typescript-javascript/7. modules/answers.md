# Modules — Answers

## Core recall

1. **CJS:** `const x = require('./m');` / `module.exports = …` or `exports.foo = …`. **ESM:** `import { a } from './m.js';` / `export const a = …`, `export default …`, `import * as ns from './m.js'`.
   - **Why:** Two systems encode public API differently — function-call load vs declarative import/export.

2. **CJS:** resolves/loads when `require()` runs at runtime (sync). **ESM:** builds the dependency graph at parse/link time, then evaluates (dependencies first).
   - **Why:** `require` is a normal call; static `import` is a declaration with a fixed specifier.

3. **Tree-shaking** = bundler drops unused exports from the graph. **ESM** enables it more reliably because `import`/`export` are static and analyzable; CJS `require` is dynamic.
   - **Why:** Without a proven usage graph, unused CJS modules/exports often stay in the bundle.

4. An **ESM live binding** is a read-only link from the importer’s name to the exporter’s binding — updates in the exporter are visible to importers.
   - **Why:** Linking connects bindings before evaluation; importers don’t get a one-time primitive snapshot.

5. **ESM:** top-level `this` is `undefined` (always strict). **Node CJS:** top-level `this` is typically the `exports` object (wrapper), not something to rely on in new code.
   - **Why:** Modules vs CJS wrapper semantics differ by design.

6. `import()` returns a **Promise** that resolves to the module namespace object.
   - **Why:** Dynamic load is async; static `import` is sync graph setup.

7. `"type": "module"` → `.js` is ESM; omit/`"commonjs"` → `.js` is CJS. `.mjs` always ESM; `.cjs` always CJS.
   - **Why:** Extension and nearest `package.json` `"type"` are Node’s mode signals.

8. Default-importing a CJS package (`import express from 'express'`) often needs `esModuleInterop` / synthetic default; without it, types or runtime may expect `import * as` or `pkg.default`.
   - **Why:** CJS has one `module.exports` value, not a first-class ESM default.

---

## Explain why

1. **Why CJS tree-shakes poorly:** `require` can be conditional, use a dynamic string, or sit in try/catch — a bundler can’t always know which modules/exports are used without running code. ESM `import`/`export` are declarative with static specifiers → build-time graph → drop unused exports.

2. **Why `increment()` updates `count` for the importer (ESM):** `count` is a live binding to the exporter’s `let`. Mutating it in the exporter updates what importers read.

3. **Why CJS destructure stays `0`:** `module.exports = { count, increment }` puts the current number on the exports object; `const { count } = require(...)` copies that primitive. `increment` bumps the internal `let`, not the destructured local (and often not `exports.count` either unless updated).

4. **Why cycles differ:** CJS returns the already-created `exports` object mid-init → partial/stale fields. ESM links first, then evaluates → reading an unfinished binding can hit TDZ-like errors. Both hurt if you read unfinished state at top level.

5. **Why Nest `import` can still be CJS:** TypeScript often emits `"module": "commonjs"` — source `import` becomes `require`. Source syntax ≠ runtime module system.

6. **Why `lodash-es` named imports shake better:** Named ESM exports give a precise “is `get` used?” edge. Default-importing whole `lodash` (often CJS-shaped) makes “unused” hard to prove → more of the library stays.

---

## Compare and contrast

1. **CJS vs ESM:** CJS — runtime sync `require`, weak shaking, exports object, top-level `this` ≈ exports. ESM — parse/link graph, strong shaking, live bindings, top-level `this` = `undefined`, `import()` for async load.

2. **Live bindings vs CJS exports:** ESM imported names track exporter bindings. CJS gives a cached exports object; reading a primitive field once (esp. via destructure) is a snapshot. Object props/getters can still look “live” in CJS.

3. **Static `import` vs `import()`:** Static — hoisted, analyzable, always loaded with the graph. Dynamic — returns Promise, conditional/lazy load, code-split boundary; less “always known at parse.”

4. **Named vs default:** Named map cleanly to shaking and explicit API. Default is convenient but rename-inconsistent and interop-painful with CJS. Prefer named for new shared libs when size/clarity matter.

5. **Circular symptoms:** CJS → surprising partial values (`loaded === false`). ESM → TDZ / “Cannot access before initialization.” Fix both by deferring reads (functions after init).

6. **`__dirname`:** Built-in in CJS. In ESM use `fileURLToPath(import.meta.url)` (and dirname of that). Nest/TS emit format decides which world you’re in.

7. **Module scope vs classic script:** Modules have their own scope; only exports escape. Classic scripts share one global — order of `<script>` tags is the dependency model.

---

## Predict the output

1. **Output:** `1`
   - **Why:** ESM live binding — `increment()` mutates exporter `count`; importer reads the same binding.

2. **Output:** `0`
   - **Why:** Destructure copied the primitive `0` from `module.exports` at require time; `increment` only updates the closed-over `let`.

3. **Output:** `5`
   - **Why:** Both imports share the same module instance and the same `state` object reference; mutating `state.n` is visible everywhere. (Also: duplicate static imports are the same binding.)

4. **Output:** `undefined`
   - **Why:** ESM top-level `this` is `undefined` (strict module).

5. **Before `await`:** a **Promise**. **After `await`:** the **module namespace object** (`typeof` → `"object"`).
   - **Why:** Dynamic import is async; fulfillment value is the namespace.

6. **Surprise:** `seenX` is often `1` (or whatever was assigned before `require('./b')`), and `hasDone` is **`undefined`/falsy** because `a` hasn’t finished — `done` was assigned after the cycle returned.
   - **Why:** CJS hands back the live-but-incomplete `exports` object mid-evaluation.

---

## Debugging

1. **Diagnosis:** Default import from a CJS package + TS/Node interop (`esModuleInterop`, synthetic default, dual packages). Runtime may be `express` as the function, or need `.default`, depending on emit.
   - **Fix / alternatives:** Enable `esModuleInterop`; or `import * as express from 'express'` / `const express = require('express')`; check package `"exports"` / `"module"` and your `tsconfig` `module`.

2. **Diagnosis:** Primitive snapshot — `exports.id = id` copied `0`; `next` bumps closed-over `id` but not the exported property the consumer destructured.
   - **Fix:** Export a getter, or update `exports.id` inside `next`, or export an object `{ get id() { return id }, next }` / always read `utils.id` from the required object without destructuring the primitive once.

3. **Check first:** Actual runtime module mode — `package.json` `"type"`, `tsconfig` `"module"` / Nest emit (often CJS). CJS has `__dirname` but not `import.meta` / top-level await; ESM has the opposite. Source `import` does not prove ESM at runtime.

4. **Diagnosis:** Default import of whole lodash (often CJS) resists precise shaking → large bundle.
   - **Try:** `import pick from 'lodash/pick'` or `import { pick } from 'lodash-es'` (named ESM) so only used exports stay.

---

## Application

1. **ESM named math:**
```js
// math.mjs
export function add(a, b) {
  return a + b;
}

// consumer
import { add } from './math.mjs';
import * as math from './math.mjs';
```
   (CJS “default-style” `module.exports = { add }` becomes named `export function add` — no fake default required.)

2. **Live binding demo:**
```js
// tokens.mjs
export let tokens = 0;
export function spend(n) {
  tokens -= n;
}

// app.mjs
import { tokens, spend } from './tokens.mjs';
spend(1);
console.log(tokens); // -1 — live
```

3. **Circular config ↔ logger:** Don’t read `config.x` / `logger` at top level across the cycle. Export factories/getters: `export function getConfig()` / `export function log(msg)` and call them only after both modules finished init (or inject logger into config setup from a third bootstrap module).

4. **Team bullets — is this Nest file CJS or ESM in prod?**
   - Check `tsconfig` / Nest build `module` (often `commonjs`) — emit format wins over source `import`.
   - Check `package.json` `"type"` and whether output is `.js` vs `.mjs` / `.cjs`.
   - Smoke-test: does `__dirname` work, or do you need `import.meta.url`? Can you use top-level await?

---

## Interview questions

1. **Spoken:** “CommonJS loads with sync `require` at runtime and returns a cached `module.exports` object. ES Modules declare static `import`/`export`, link a graph at parse time, use live bindings, and support dynamic `import()` as a Promise. ESM top-level `this` is undefined; Node CJS top-level `this` is exports. Tree-shaking and cycles differ because of static vs dynamic loading.”
   - **Follow-ups:** Live bindings = importer sees exporter updates for exported `let`/`const`/`function`. Tree-shaking needs static graph → ESM wins. Top-level `this`: undefined vs exports.

2. **Spoken:** “`require` is a runtime function — conditional or dynamic paths block full static analysis. `import`/`export` are declarative with static specifiers, so bundlers build a usage graph and drop unused exports. Partial CJS shaking exists but is heuristic.”
   - **Follow-ups:** Dynamic `import()` is an explicit async split point on an otherwise static graph.

3. **Spoken:** “Export `let count` and `increment`. Importer calls `increment()` and reads `count` as 1 because the import is a live binding, not a copied number. Importer cannot reassign `count`; mutating an exported object’s properties is shared by reference in both systems.”
   - **Follow-ups:** Reassign imported binding → TypeError. Exported objects: property mutation is visible; rebinding the export name is the exporter’s job.

4. **Spoken:** “CJS may hand you a partial exports object mid-init. ESM links first; reading before init can throw like TDZ. I avoid top-level mutual reads — use functions or a third module to break the cycle.”
   - **Follow-ups:** Design: defer reads, inject dependencies after boot, keep cycles shallow.

5. **Spoken:** “Node uses `"type"` in package.json for `.js`, plus `.mjs`/`.cjs` overrides. TypeScript Nest apps often still emit CJS even when authors write `import` — check emit settings, not source cosmetics.”
   - **Follow-ups:** Emit CJS → `__dirname` works; native ESM needs `import.meta.url`; interop flags matter for default imports.

6. **Spoken:** “`esModuleInterop` helps TypeScript/emit treat CJS `module.exports = fn` more like an ESM default so `import pkg from 'cjs'` type-checks and emits helpers instead of forcing `import * as` / `.default` fights.”
   - **Follow-ups:** It’s bridging two API shapes, not “making CJS into ESM.”

---

## Connections

1. **Module scope ↔ Scope unit:** Modules are the per-file scope boundary — no accidental script globals; only exports form the public surface (script vs module global distinction).

2. **Circular ESM ↔ TDZ/Hoisting:** Unfinished linked bindings exist in the graph before initialization completes — reading them early fails like accessing a `let` in the TDZ.

3. **Static ESM ↔ React bundle size:** Analyzable named exports let Vite/webpack/Metro drop unused library code; opaque CJS/`import _ from 'lodash'` keeps more weight.

4. **Nest emit CJS matters for:** `__dirname` availability, top-level await, and whether default-importing CJS packages needs interop — source `import` doesn’t decide those.

5. **“Doesn’t update” triage:** If CJS + destructured/read-once primitive → snapshot (or exporter never wrote `exports.x` after mutate). If ESM live binding should update and doesn’t → look for wrong export, reassignment attempt, or not the same module instance — not “live bindings are broken.”
