# Modules: CommonJS vs ES Modules — Self-test

## Core recall

1. What are the primary CJS and ESM syntaxes for importing and exporting?
2. When does CJS resolve/load a dependency vs when does ESM build its graph?
3. What is tree-shaking, and which system enables it more reliably?
4. What is an ESM live binding?
5. What is top-level `this` in ESM? In Node CJS?
6. What does `import()` return?
7. How do `"type": "module"`, `.mjs`, and `.cjs` affect Node?
8. What is a common TypeScript interop headache when consuming CJS from ESM-style `import`?

## Explain why

1. Why can’t bundlers tree-shake CommonJS as reliably as ESM?
2. Why does `increment()` update `count` in the ESM counter example for the importer?
3. Why might `const { count } = require('./counter')` stay `0` after `increment()` in CJS?
4. Why do circular dependencies behave differently in CJS vs ESM?
5. Why can Nest source code use `import` but still be “running CommonJS”?
6. Why does `import { get } from 'lodash-es'` tend to shake better than default-importing all of `lodash`?

## Compare and contrast

1. CommonJS vs ES Modules (timing, shaking, bindings, `this`).
2. ESM live bindings vs CJS exports object semantics.
3. Static `import` vs dynamic `import()`.
4. Named exports vs default exports (ergonomics + shaking).
5. Circular dependency symptoms in CJS vs ESM.
6. `__dirname` in CJS vs ESM equivalents.
7. Module scope vs classic global script scope.

## Predict the output

State the result **and explain why**. Assume each snippet is in the correct module system files.

1.
```js
// counter.mjs
export let count = 0;
export function increment() {
  count++;
}

// main.mjs
import { count, increment } from './counter.mjs';
increment();
console.log(count);
```

2.
```js
// counter.cjs
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };

// main.cjs
const { count, increment } = require('./counter.cjs');
increment();
console.log(count);
```

3.
```js
// state.mjs
export const state = { n: 0 };

// main.mjs
import { state } from './state.mjs';
state.n = 5;
import { state as state2 } from './state.mjs';
console.log(state2.n);
```

4.
```js
// In an ES module file:
console.log(this);
```

5.
```js
async function load() {
  const m = await import('./math.mjs');
  return typeof m;
}
// What kind of value does import() give you before await? After await?
```

6.
```js
// a.js (CJS)
exports.x = 1;
const b = require('./b');
exports.x = 2;
module.exports.done = true;

// b.js (CJS)
const a = require('./a');
module.exports = { seenX: a.x, hasDone: a.done };
// If a loads first and requires b mid-evaluation, what is surprising about `hasDone` / `seenX`?
```

## Debugging

1. Diagnose:
```ts
import express from 'express';
// Runtime or TS error depending on settings: default import from CJS package
```
What concepts are involved? What alternatives do people use?

2. Diagnose:
```js
// utils.cjs
let id = 0;
exports.id = id;
exports.next = () => {
  id += 1;
};
```
```js
const { id, next } = require('./utils.cjs');
next();
console.log(id); // expected 1, got 0
```
Fix the export API so consumers see updates.

3. Diagnose Nest/Node confusion:
A developer uses `import.meta.url` and top-level await in a Nest project, but builds fail or `__dirname` code from a tutorial doesn’t work. What do you check first?

4. Diagnose bundle size:
```js
import _ from 'lodash';
export const pickUser = (u) => _.pick(u, ['id', 'name']);
```
Why might this keep most of lodash in the bundle? What change would you try?

## Application

1. Rewrite a tiny CJS `math` module (`add`, default-style single export) as ESM with **named** exports, and show both import styles.

2. Write an ESM module that exports `let tokens = 0` and `spend(n)`, then a second module that imports and demonstrates the live binding.

3. Given a circular pair `config` ↔ `logger`, sketch a structure that avoids reading unfinished bindings at top level (e.g. defer via functions).

4. Document for your team: three bullets on how to tell whether a given Nest service file runs as CJS or ESM in production.

## Interview questions

1. CommonJS vs ES Modules — what are the key differences?  
   **Follow-ups:** Live bindings? Tree-shaking? Top-level `this`?

2. Why can’t bundlers tree-shake CJS as well as ESM?  
   **Follow-ups:** How does dynamic `import()` fit into splitting?

3. Explain ESM live bindings with an example.  
   **Follow-ups:** Can the importer reassign the imported name? What about exported objects?

4. How do circular dependencies differ between CJS and ESM?  
   **Follow-ups:** How do you design to avoid the pain?

5. How does Node decide whether a `.js` file is CJS or ESM?  
   **Follow-ups:** What about TypeScript projects that emit CJS while authors write `import`?

6. What is `esModuleInterop` trying to solve?

## Connections

1. How does module scope connect to the Scope unit’s “script vs module global” distinction?
2. How do ESM unfinished circular bindings resemble TDZ from the Hoisting unit?
3. How does static analyzability of ESM connect to production React bundle size?
4. Why does knowing whether Nest emits CJS matter for `__dirname`, top-level await, and default imports?
5. When an imported value “doesn’t update,” how do you decide if you’re looking at CJS primitive snapshots vs a buggy setter that never writes `exports.x`?
