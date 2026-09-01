# Modules: CommonJS vs ES Modules — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What are the primary CJS and ESM syntaxes for importing and exporting?
- [ ] When does CJS resolve/load a dependency vs when does ESM build its graph?
- [ ] What is an ESM live binding?
- [ ] Why can’t bundlers tree-shake CommonJS as reliably as ESM?
- [ ] CommonJS vs ES Modules (timing, shaking, bindings, `this`).
- [ ] Static `import` vs dynamic `import()`.

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ]
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

- [ ]
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

- [ ] Diagnose:
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

- [ ] Diagnose bundle size:
```js
import _ from 'lodash';
export const pickUser = (u) => _.pick(u, ['id', 'name']);
```
Why might this keep most of lodash in the bundle? What change would you try?

## Say it out loud

- [ ] Explain modules (CJS vs ESM) in 30–60 seconds as if an interviewer asked.
- [ ] CommonJS vs ES Modules — what are the key differences?  
  **Follow-ups:** Live bindings? Tree-shaking? Top-level `this`?
- [ ] Explain ESM live bindings with an example.  
  **Follow-ups:** Can the importer reassign the imported name? What about exported objects?
