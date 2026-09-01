# Type Coercion and Equality — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] List the 8 falsy values.
- [ ] What is the difference between `==` and `===`? What is the one widely accepted use of `==` in modern codebases?
- [ ] Why is `x === NaN` useless, and what should you use instead?
- [ ] How does `Object.is` differ from `===`?
- [ ] Why is `'5' + 1` → `'51'` but `'5' - 1` → `4`?
- [ ] Truthiness (`if (x)`) vs nullish checks (`x == null` / `x ?? y`).

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ]
```js
console.log(1 == '1', 1 === '1');
```

- [ ]
```js
console.log([] == false, [] == ![]);
```

- [ ]
```js
console.log(NaN === NaN, Object.is(NaN, NaN), Number.isNaN(NaN));
```

- [ ]
```js
console.log(+0 === -0, Object.is(+0, -0));
```

- [ ] Diagnose:
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

## Say it out loud

- [ ] Explain type coercion and equality in 30–60 seconds as if an interviewer asked.
- [ ] `==` vs `===` — which do you use and why?  
  **Follow-ups:** Any exception? What about `null` and `undefined`?
- [ ] How do you check for `NaN`?  
  **Follow-ups:** What’s wrong with `isNaN`? Where does `Object.is` fit?
