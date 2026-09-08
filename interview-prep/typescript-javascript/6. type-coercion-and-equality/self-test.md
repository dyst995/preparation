# Type Coercion and Equality — Self-test

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
