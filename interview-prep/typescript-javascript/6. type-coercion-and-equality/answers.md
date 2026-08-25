# Type Coercion and Equality — Answers

## Core recall

1. **Answer:** `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`.  
   **Why:** Only these fail truthiness checks; everything else (including `[]`, `{}`, `'0'`) is truthy.

2. **Answer:** `===` compares without converting types (different types → false). `==` applies abstract equality coercions when types differ, then compares.  
   **Why:** Coercion is the entire practical difference — and the source of most bugs.

3. **Answer:** `value == null` as intentional shorthand for `value === null || value === undefined`.  
   **Why:** That is the one widely accepted deliberate use of `==` in modern style guides; otherwise prefer `===`.

4. **Answer:** After `ToPrimitive` on objects: if either operand is a **string** → concatenate; otherwise convert both to numbers and add.  
   **Why:** Only `+` has this dual personality; `-`/`*`/`/` always go numeric.

5. **Answer:** `NaN` is never `===` (or `==`) to anything, including itself. Use `Number.isNaN(x)` or `Object.is(x, NaN)`.  
   **Why:** IEEE-754 unordered NaN semantics; `x === NaN` is always false even when `x` is NaN.

6. **Answer:** Same as `===` except `Object.is(NaN, NaN)` is **true** and `Object.is(+0, -0)` is **false**.  
   **Why:** SameValue algorithm vs strict equality’s SameValueZero-ish treatment of zeros / NaN inequality.

7. **Answer:** Both **truthy**.  
   **Why:** Emptiness of array/object does not make them falsy — only the eight primitives above are falsy.

8. **Answer:** Only `null` and `undefined`.  
   **Why:** Special abstract-equality rule: nullish values are loosely equal only to each other, not to `0`/`false`/`''`.

---

## Explain why

1. **Answer:** Truthiness (`if ([])`) asks “is this one of the eight falsy values?” — `[]` is not, so the branch runs. `[] == false` uses abstract equality: `false` → `0`, `[]` → `ToPrimitive` → `''` → `0`, so `0 == 0`.  
   **Why:** Boolean context ≠ loose equality path; same value, different algorithms.

2. **Answer:** `null`/`undefined` only loosely equal each other — they do **not** coerce to `0` under `==`. `''` does coerce to `0` when compared to a number.  
   **Why:** Memorize the nullish special case separately from number/string rules.

3. **Answer:** IEEE-754 defines `NaN` as not equal to any value, including itself, so both `===` and `==` fail.  
   **Why:** “Invalid number” is not an ordered numeric identity.

4. **Answer:** Global `isNaN` **coerces** first (`Number('foo')` → `NaN`) then checks. `Number.isNaN` requires the value already be `NaN` — no coercion — so a string is simply not NaN.  
   **Why:** Global `isNaN` answers “becomes NaN when numbered?” more than “is this the NaN value?”

5. **Answer:** `+` sees a string → concatenation → `'51'`. `-` always numeric → `'5'` → `5`, then `5 - 1` → `4`.  
   **Why:** Operators disagree on string policy; only `+` concatenates.

6. **Answer (full chain):** `![]` first: `[]` is truthy → `![]` is `false`. Expression becomes `[] == false`. Then `false` → `0`; `[]` → `''` → `0`; `0 == 0` → `true`.  
   **Why:** Classic interview walkthrough proving why `===` is the default.

---

## Compare and contrast

1. **`==` vs `===`:** `==` coerces across types; `===` does not. Prefer `===`; allow `== null` as deliberate nullish check.

2. **Truthiness vs nullish:** `if (x)` / `||` treat all eight falsy values as missing. `x == null` / `??` only treat `null`/`undefined` as missing — `0` and `''` stay.  
   **Why:** Forms/APIs that return `0` break truthiness checks but survive nullish checks.

3. **`Number.isNaN` vs `isNaN`:** No coercion vs coerces-then-checks. Prefer `Number.isNaN` for “is this NaN?”

4. **`Object.is` vs `===`:** Differ on `NaN`/`NaN` and `+0`/`-0`. Day-to-day still `===`; reach for `Object.is` when those edges matter.

5. **`+` vs `-`:** `+` may concatenate if a string is involved; `-` always ToNumber both sides. Mixed string/number is safe-ish with `-`, surprising with `+`.

6. **`Number('12px')` vs `parseInt('12px', 10)`:** `Number` requires a full numeric string → `NaN`. `parseInt` parses a leading integer prefix → `12`. Different tools for full parse vs prefix parse.

7. **Boolean `[]` vs `==`/`ToPrimitive`:** In boolean context, `[]` is truthy. Under `==`/`+`, `[]` often becomes `''` via `toString`/`join`, which then becomes `0` in numeric comparisons — so it can “act like empty/zero” without being falsy.

---

## Predict the output

1. **`true true false true`.** `[]`/`{}` truthy; `''` falsy; `'0'` non-empty string → truthy.

2. **`true false`.** `==` coerces `'1'` → `1`; `===` sees different types.

3. **`true false false`.** `null == undefined` special case; `===` keeps them distinct; `null` is not `== 0`.

4. **`true false true`.** `''` → `0`; types differ for `===`; `false` → `0` then `0 == 0`.

5. **`true true`.** `[] == false` as above (`''`/`0`). `[] == ![]` → `[] == false` → same chain → `true`.

6. **`'51'`, `4`, `'1[object Object]'`.** Concat; numeric subtract; `{}` → `'[object Object]'` then concat with `1`.

7. **`''`, `'[object Object]'`, `'1'`.** `[]+[]` → `''+''`; `[]+{}` → `''+'[object Object]'`; `1+[]` → `1+''` → `'1'`.

8. **`false true true`.** `===` fails for NaN; `Object.is` and `Number.isNaN` detect NaN correctly.

9. **`true false`.** `===` treats `+0` and `-0` as equal; `Object.is` distinguishes them.

10. **`true false`.** Global `isNaN` coerces `'foo'` → NaN; `Number.isNaN` does not coerce.

11. **`true true`.** `[1]` → `'1'` → `1`; `[1,2]` → `'1,2'` via join/`toString`.

12. **`'a'`, `0`, `''`.** `||` skips falsy `0`; `??` only skips nullish, so `0` and `''` win.

13. **`2`, `true`.** Neither side of `true + true` is a string after ToPrimitive → numeric `1+1`. `true == 1` after boolean→number.

---

## Debugging

1. **Diagnosis:** `!response.count` treats `0` as missing because `0` is falsy.  
   **Fix:** Check nullish explicitly, e.g. `if (response.count == null)` or `if (response.count === undefined || response.count === null)`, or `'count' in response` / `Object.hasOwn(response, 'count')` depending on whether missing key vs present-zero matters.

2. **Diagnosis:** `x === NaN` is always false by IEEE rules.  
   **Replace:** `return Number.isNaN(x);` (or `Object.is(x, NaN)`).

3. **Diagnosis:** `[]` is truthy, so `!x` is false → function reports “not empty” even for `[]`.  
   **Fix:** `Array.isArray(x) && x.length === 0` (or equivalent length check). Don’t use truthiness for empty-array tests.

4. **Diagnosis:** Query strings are strings; `page=0` → `'0'`, and `'0'` is falsy under `||`, so you fall back to `1` and lose intentional page `0`.  
   **Safer parse:**  
```js
const raw = req.query.page;
const page = raw == null || raw === '' ? 1 : Number(raw);
if (!Number.isFinite(page)) { /* handle bad input */ }
```
   Or use `??` after a proper `Number`/`parseInt` with validation — never `||` for numeric zero defaults.

---

## Application

1.
```js
function isNullish(x) {
  return x === null || x === undefined;
}
function isNullishLoose(x) {
  return x == null; // same for null/undefined only
}
// 0 → false, '' → false, null → true, undefined → true (both versions)
```

2.
```js
function toNumberStrict(x) {
  if (typeof x === 'number') {
    return Number.isFinite(x) ? x : NaN; // or throw
  }
  if (typeof x === 'string' && x.trim() !== '') {
    const n = Number(x);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}
toNumberStrict('12');   // 12
toNumberStrict('12px'); // NaN — Number rejects partial parses
```
**Why:** `Number('12px')` is `NaN`; unlike `parseInt`, this rejects non-full numeric strings.

3.
```js
function sameValue(a, b) {
  return Object.is(a, b);
}
sameValue(NaN, NaN); // true
sameValue(+0, -0);   // false
```

4.
```js
if (Number(userId) === Number(id)) {
  /* ... */
}
// or normalize at the boundary once:
const uid = Number(id);
if (userId === uid) { /* ... */ }
```
**Why:** Makes coercion explicit and keeps `===`; avoids accidental other `==` coercions.

---

## Interview questions

1. **Spoken:** “The eight falsy values are `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, and `NaN`. Everything else is truthy.”  
   **Follow-ups:** `[]` is truthy. `'0'` is truthy (non-empty string).

2. **Spoken:** “I default to `===` so types don’t silently convert. The practical exception is `value == null` to catch both `null` and `undefined`.”  
   **Follow-ups:** Yes — that nullish shorthand; otherwise spell out `=== null || === undefined`. Don’t use `==` for numbers/strings/booleans in app code.

3. **Spoken:** “`![]` is `false` because arrays are truthy, so it’s `[] == false`. Then false becomes 0, the array becomes `''` then 0, and `0 == 0`.”  
   **Follow-ups:** Walk ToPrimitive/`toString` on arrays; this is why loose equality puzzles are literacy, not style.

4. **Spoken:** “Never `x === NaN`. Use `Number.isNaN(x)` — it doesn’t coerce. Global `isNaN` coerces and lies for strings. `Object.is(x, NaN)` also works.”  
   **Follow-ups:** Prefer `Number.isNaN`; mention `Object.is` also splits `+0`/`-0`.

5. **Spoken:** “After objects become primitives, if either side is a string, `+` concatenates; otherwise it adds numbers. `-` always forces numbers, so `'5'-1` is `4` while `'5'+1` is `'51'`.”  
   **Follow-ups:** `[] + {}` → `'[object Object]'` via `'' + '[object Object]'`. Prefer not to lean on these in production.

---

## Connections

1. **Answer:** `0` and `''` are valid data but falsy, so `if (value)` / `value || default` mis-detect “missing” in forms, pagination, and APIs. Prefer nullish checks (`== null`, `??`) or explicit comparisons (`=== 0`, `length === 0`).  
   **Why:** Truthiness conflates “absent” with “empty/zero.”

2. **Answer:** TypeScript flags many mixed-type `==` / `+` mistakes at compile time, so you see fewer accidental coercions in typed code — but runtime JS at JSON/query/DOM boundaries still coerces. You must still convert and validate at edges.  
   **Why:** Types shrink the blast radius; they don’t delete the language rules.

3. **Answer:** Arrays’ `ToPrimitive` usually uses `toString`/`join` (`[]` → `''`, `[1,2]` → `'1,2'`), which then feed `==` and `+` — producing “empty string / zero-like / concat” surprises even though arrays are truthy objects.  
   **Why:** Object → primitive is the missing step in most puzzle explanations.

4. **Answer:** Ask what the code meant: “any falsy?” → truthiness/`||`. “null or undefined only?” → `??` / `== null`. “same value possibly after coerce?” → `==` (usually avoid). “same type and value?” → `===`. Match the operator to the intent before changing the condition.  
   **Why:** Wrong diagnosis leads to the wrong fix (`||` vs `??` vs `===`).
