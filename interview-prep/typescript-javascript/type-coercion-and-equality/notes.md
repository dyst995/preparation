# Type Coercion and Equality

## What you need to know

**Type coercion** is when JavaScript automatically converts a value from one type to another (to boolean, number, string, or a primitive) because an operator or API asked for that kind of value.

**Equality** is where that bites hardest: `===` compares without converting types; `==` converts first (abstract equality). Operators like `+`, `-`, and `if (x)` also coerce, each with different rules.

Interview goal: predict common results, explain *why* a few famous gotchas happen, and defend **`===` by default** without pretending you memorized the entire spec algorithm.

Curriculum checklist this unit completes:

- The 8 falsy values
- `==` vs `===`
- `+` string vs number decision
- `null == undefined` special case
- `NaN` checks (`Number.isNaN`, `Object.is`)
- `Object.is` vs `===` (`NaN`, `+0`/`-0`)
- Truthiness of `[]` / `{}`

---

## Types involved (quick map)

Values you coerce between in everyday JS:

| Kind | Examples |
|---|---|
| Boolean | `true` / `false` |
| Number | `0`, `1`, `NaN`, `Infinity`, `-0` |
| BigInt | `0n`, `1n` |
| String | `''`, `'0'`, `'false'` |
| Nullish | `null`, `undefined` |
| Object | `{}`, `[]`, functions, dates, … |

Objects often become primitives first via **`ToPrimitive`** (usually `valueOf` / `toString`) before numeric or string coercion finishes.

---

## Truthiness and the 8 falsy values

### The list (memorize)

```
false, 0, -0, 0n, "", null, undefined, NaN
```

Exactly these are **falsy**. Everything else is **truthy**.

Notable truthy traps:

```js
Boolean([]);      // true
Boolean({});      // true
Boolean('0');     // true
Boolean('false'); // true
Boolean(' ');     // true — non-empty string
Boolean(new Boolean(false)); // true — object wrapper
```

### Where truthiness is used

- `if (x)`, `while (x)`, `x ? a : b`
- `x && y`, `x || y`, `x ?? y` is **not** truthiness — `??` only treats `null`/`undefined` as missing

```js
0 || 'default';   // 'default' — 0 is falsy
0 ?? 'default';   // 0 — ?? does not care about falsy numbers
'' ?? 'default';  // ''
null ?? 'default'; // 'default'
```

### Why this matters

APIs returning `0` or `''` as real data break `if (value)` checks. Prefer explicit checks (`value == null`, `value === 0`, `value.length === 0`) when zero/empty are valid.

---

## Explicit vs implicit coercion

| Style | Examples | Prefer when |
|---|---|---|
| Explicit | `Boolean(x)`, `Number(x)`, `String(x)`, `!!x`, `+x` | Clarity, boundaries of IO |
| Implicit | `if (x)`, `x + ''`, `x == 1`, `+x` in expressions | Language idioms you fully control |

```js
Number('  12 '); // 12
Number('');      // 0
Number('12px');  // NaN
Number(null);    // 0
Number(undefined); // NaN
String(null);    // 'null'
String(undefined); // 'undefined'
```

`parseInt('12px', 10)` → `12` (parses prefix); `Number('12px')` → `NaN`. Different tools, different jobs.

---

## Strict equality: `===` / `!==`

### What it does

1. If types differ → `false`.
2. If same type → compare values with same-type rules (no coercion).

```js
1 === '1';     // false
true === 1;    // false
null === undefined; // false
```

### Same-type gotchas still remain

```js
NaN === NaN;   // false
+0 === -0;     // true
```

So `===` is “no coercion,” not “perfect mathematical identity.”

---

## Loose equality: `==` / `!=`

### What it does

If types already match, behave like same-type comparison. If not, **coerce** toward a common type using the abstract equality algorithm, then compare.

You do **not** need every branch memorized. You need the **patterns that show up in interviews and bugs**:

### High-value rules of thumb

1. **`null` and `undefined` are loosely equal only to each other** (and themselves).
   ```js
   null == undefined; // true
   null == 0;         // false
   undefined == 0;    // false
   null == false;     // false
   ```

2. **Number ↔ String:** string converts to number.
   ```js
   1 == '1';   // true
   0 == '';    // true — '' → 0
   0 == '0';  // true
   ```

3. **Boolean ↔ anything:** boolean converts to number first (`true`→`1`, `false`→`0`), then compare.
   ```js
   0 == false;  // true
   1 == true;   // true
   '0' == false; // true — false→0, '0'→0
   ```

4. **Object ↔ primitive:** object converts via `ToPrimitive` (arrays: `toString`/`join` → often `''` or element strings), then compare again.
   ```js
   [] == false; // true — [] → '' → 0, false → 0
   [1] == 1;    // true — [1] → '1' → 1
   [1,2] == '1,2'; // true
   ```

5. **`NaN` is never `==` anything**, including itself.
   ```js
   NaN == NaN; // false
   ```

### Default practice (preserved)

Always use `===` / `!==` in app code.

**Accepted exception:** `value == null` as intentional shorthand for `value === null || value === undefined`.

```js
function f(x) {
  if (x == null) return 'missing'; // null or undefined
}
```

### Famous gotcha: `[] == ![]` (preserved)

```js
[] == ![]; // true
```

Strong answer:

> `![]` evaluates first: `[]` is truthy, so `![]` is `false`. Now it's `[] == false`. Loose equality: `false` → `0`. `[]` → `ToPrimitive` → `toString()` → `''` → `0`. So `0 == 0` → `true`. This kind of chain is why `===` is the default.

---

## `+` vs other arithmetic

### How `+` decides (preserved mental model)

After converting objects with `ToPrimitive`:

- If **either** operand is a **string** → **string concatenation**
- Else → convert both to numbers and add

```js
1 + 1;      // 2
'1' + 1;    // '11'
1 + '1';    // '11'
1 + {};     // '1[object Object]'
1 + [];     // '1' — [] → ''
[] + [];    // ''
[] + {};    // '[object Object]'
{} + [];    // depends on ASI / context — prefer not to write this; often number or string surprises
```

### `-`, `*`, `/` always go numeric

```js
'5' - 1; // 4
'5' + 1; // '51'
'5' * '2'; // 10
true + true; // 2 — with + both booleans become numbers when neither is string… actually true+true: neither is string after ToPrimitive, so numeric → 2
```

Unary `+` forces number: `+'5'` → `5`, `+true` → `1`, `+[]` → `0`, `+{}` → `NaN`.

---

## `ToPrimitive` (enough to explain objects)

When an object must become a primitive for `==`, `+`, etc.:

- Prefer `valueOf`, then `toString`, depending on preferred hint (number vs string). For ordinary objects/`[]`, what you usually observe:
  - `{}` → `'[object Object]'` via `toString`
  - `[]` → `''` via `toString`/`join`
  - `[1,2]` → `'1,2'`

```js
const obj = {
  valueOf() {
    return 3;
  },
  toString() {
    return 'x';
  },
};
console.log(obj + 1); // 4 — numeric hint prefers valueOf here for +
console.log(String(obj)); // 'x'
```

You rarely invent custom `valueOf` in apps; you *do* need it to explain array/object coercion puzzles.

---

## `NaN`: detection and meaning

### Why `x === NaN` never works

`NaN` means “invalid number.” IEEE-754 makes `NaN` unordered/not equal to anything, including itself:

```js
NaN === NaN; // false
Number('oops'); // NaN
```

### Correct checks (preserved)

| API | Behavior |
|---|---|
| `Number.isNaN(x)` | `true` only if `x` is actually `NaN` (no coercion) |
| Global `isNaN(x)` | Coerces first → `isNaN('foo') === true` (false positive for “is NaN”) |
| `Object.is(x, NaN)` | Also correct for NaN identity |

```js
Number.isNaN(NaN);     // true
Number.isNaN('foo');   // false
isNaN('foo');          // true — coerced to NaN
Object.is(NaN, NaN);   // true
```

Strong spoken answer (preserved):

> `NaN !== NaN` by IEEE-754, so `x === NaN` never works. Use `Number.isNaN(x)`, which doesn't coerce (unlike global `isNaN`). `Object.is(x, NaN)` also works; `Object.is` additionally distinguishes `-0` from `+0` where `===` does not.

---

## `Object.is` vs `===`

Same as `===` except:

```js
Object.is(NaN, NaN); // true   (=== is false)
Object.is(+0, -0);   // false  (=== is true)
+0 === -0;           // true
```

Use `Object.is` when those edge cases matter (maps/sets keyed by identity rarely care about `-0`, but numerical code and some algorithms do). Day-to-day equality: still `===`, plus `Number.isNaN` when checking NaN.

---

## Relational operators (brief)

`<`, `>`, `<=`, `>=` also coerce (often ToNumber / ToPrimitive). Strings compare lexicographically when both sides become strings:

```js
'10' > '9'; // false — character comparison
10 > '9';  // true — numeric
```

Another reason not to mix types casually.

---

## Practical defaults for real code

1. Use `===` / `!==`.
2. Use `value == null` only as deliberate nullish check (or prefer `value === null || value === undefined` / `value ??`).
3. Don’t use truthiness to validate numbers that can be `0` or strings that can be `''`.
4. Prefer `Number.isNaN`, `Number.isFinite` over global `isNaN` / `isFinite`.
5. Convert at system boundaries explicitly (`Number(req.query.page)`).
6. Treat `==` puzzles as interview literacy, not style to imitate.

---

## Common mistakes and misconceptions

1. **“`[]` is falsy because it’s empty.”** Empty array is truthy; empty string is falsy.
2. **“`null == 0` is true.”** It is `false`.
3. **“`===` means identical in all edge cases.”** Still loses on `NaN` and merges `+0`/`-0`.
4. **Using global `isNaN` to validate numbers.** Coercion lies.
5. **Relying on `if (response)` when `response` can be `0`.**
6. **Assuming `-` and `+` share the same string/number policy.** Only `+` concatenates.
7. **Believing `{}` is falsy.** Objects are truthy; only certain primitives are falsy.
8. **Writing `x === NaN` in production checks.**

---

## Connections to other concepts

```
operator / branch needs a type
  → coercion (Boolean / Number / String / ToPrimitive)
    → surprising == and + results

=== 
  → no coercion
    → still not NaN-safe identity

nullish (null/undefined)
  → == null shorthand
    ≠ falsy check (0 and '' differ)

arrays/objects truthy
  → but ToPrimitive often '' / '[object Object]'
    → == false and + puzzles

TypeScript
  → reduces accidental mixed-type ==
    → runtime JS coercion still exists at boundaries
```

This unit is about **values and operators**. It is separate from **scope/`this`/prototypes**, but the same interview skill applies: explain the mechanism, don’t only recite the outcome.

---

## Interview perspective

You should be able to:

1. List all 8 falsy values and name common truthy traps (`[]`, `{}`, `'0'`).
2. Contrast `==` and `===` and defend default `===`, with `== null` as optional exception.
3. Walk `[] == ![]` without freezing.
4. Explain how `+` chooses concat vs add; contrast with `-`.
5. Check for `NaN` correctly and compare `Object.is` with `===`.
6. Predict a handful of classic coercions (`'' == 0`, `null == undefined`, `[1] == 1`).

---

# Self-test

## Core recall

1. List the 8 falsy values.
2. What is the difference between `==` and `===`?
3. What is the one widely accepted use of `==` in modern codebases?
4. How does `+` decide between concatenation and numeric addition?
5. Why is `x === NaN` useless, and what should you use instead?
6. How does `Object.is` differ from `===`?
7. Are `[]` and `{}` truthy or falsy?
8. What does `value == null` match?

## Explain why

1. Why is `[]` truthy in `if ([])` but able to become `0` in `[] == false`?
2. Why is `null == 0` false while `'' == 0` is true?
3. Why is `NaN` not equal to itself?
4. Why is global `isNaN('foo')` true while `Number.isNaN('foo')` is false?
5. Why is `'5' + 1` → `'51'` but `'5' - 1` → `4`?
6. Why is `[] == ![]` true? (full chain)

## Compare and contrast

1. `==` vs `===`
2. Truthiness (`if (x)`) vs nullish checks (`x == null` / `x ?? y`)
3. `Number.isNaN` vs global `isNaN`
4. `Object.is` vs `===`
5. `+` vs `-` with mixed string/number operands
6. `Number('12px')` vs `parseInt('12px', 10)`
7. Boolean coercion of `[]` vs `ToPrimitive`/`==` behavior of `[]`

## Predict the output

State the result **and explain why**.

1.
```js
console.log(Boolean([]), Boolean({}), Boolean(''), Boolean('0'));
```

2.
```js
console.log(1 == '1', 1 === '1');
```

3.
```js
console.log(null == undefined, null === undefined, null == 0);
```

4.
```js
console.log('' == 0, '' === 0, false == 0);
```

5.
```js
console.log([] == false, [] == ![]);
```

6.
```js
console.log('5' + 1, '5' - 1, 1 + {});
```

7.
```js
console.log([] + [], [] + {}, 1 + []);
```

8.
```js
console.log(NaN === NaN, Object.is(NaN, NaN), Number.isNaN(NaN));
```

9.
```js
console.log(+0 === -0, Object.is(+0, -0));
```

10.
```js
console.log(isNaN('foo'), Number.isNaN('foo'));
```

11.
```js
console.log([1] == 1, [1, 2] == '1,2');
```

12.
```js
console.log(0 || 'a', 0 ?? 'a', '' ?? 'a');
```

13.
```js
console.log(true + true, true == 1);
```

## Debugging

1. Diagnose:
```js
function getCount(response) {
  if (!response.count) {
    return 'missing count';
  }
  return response.count;
}
console.log(getCount({ count: 0 }));
```
What’s wrong, and how do you fix it?

2. Diagnose:
```js
function isBroken(x) {
  return x === NaN;
}
```
Why never works? Replace it.

3. Diagnose surprising branch:
```js
function isEmptyArray(x) {
  if (!x) return true;
  return false;
}
console.log(isEmptyArray([]));
```

4. Diagnose API parsing bug:
```js
const page = req.query.page || 1; // page is query string
// user passes page=0 intending first page index 0
```
What goes wrong? How would you parse safely?

## Application

1. Write `isNullish(x)` without using `==`, then with `== null`. Confirm same results for `0`, `''`, `null`, `undefined`.

2. Write `toNumberStrict(x)` that returns a number only if `x` is already a finite number or a string that fully parses as a finite number (reject `'12px'`). Use `Number` / `Number.isFinite` thoughtfully.

3. Given mixed values, write a comparator `sameValue(a, b)` that treats `NaN` as equal to `NaN` and distinguishes `-0` from `+0` (hint: `Object.is`).

4. Refactor this to avoid loose equality and clarify intent:
```js
if (userId == id) {
  /* ... */
}
// userId from DB number, id from URL string
```

## Interview questions

1. What are JavaScript’s falsy values?  
   **Follow-ups:** Is `[]` falsy? Is `'0'` falsy?

2. `==` vs `===` — which do you use and why?  
   **Follow-ups:** Any exception? What about `null` and `undefined`?

3. Why is `[] == ![]` true?  
   **Follow-ups:** Walk through coercions step by step.

4. How do you check for `NaN`?  
   **Follow-ups:** What’s wrong with `isNaN`? Where does `Object.is` fit?

5. How does the `+` operator work with mixed types?  
   **Follow-ups:** Contrast with `-`. What about `[] + {}`?

## Connections

1. How do truthiness checks interact with real-world values like `0` and `''` in form/API code?
2. How does TypeScript change your daily exposure to `==` bugs without removing runtime coercion at boundaries?
3. How is `ToPrimitive` on arrays related to surprising `==` and `+` results?
4. When debugging “wrong branch taken,” how do you decide whether you’re looking at truthiness, `==`, or nullish (`??`) semantics?
