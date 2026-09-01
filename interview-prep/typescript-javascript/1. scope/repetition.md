# Scope — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What determines which binding an identifier resolves to in JavaScript?
- [ ] For each of `var`, `let`, and `const`: what kind of scope do they create/use at the declaration site?
- [ ] Why does calling a function from another scope not change which outer variables it can access?
- [ ] Lexical scope vs dynamic scope.
- [ ] Function scope vs block scope.
- [ ] Scope chain (variables) vs call stack (execution) — what question does each answer?

## Predict / debug

For each snippet: state what happens (log values and/or thrown error) **and explain why**. For debug items, diagnose and fix.

- [ ]
```js
const x = 1;
function outer() {
  const x = 2;
  inner();
}
function inner() {
  console.log(x);
}
outer();
```

- [ ]
```js
var x = 1;
{
  var x = 2;
}
console.log(x);
```

- [ ]
```js
let value = 'outer';
function one() {
  console.log(value);
}
function two() {
  let value = 'inner';
  one();
}
two();
```

- [ ] Diagnose and fix:
```js
function attachHandlers(buttons) {
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].onClick = function () {
      console.log('Clicked button', i);
    };
  }
}
// Every handler logs buttons.length. Why? How would you fix it using scope rules?
```

## Say it out loud

- [ ] Explain scope in 30–60 seconds as if an interviewer asked.
- [ ] What is lexical scope in JavaScript?  
  **Follow-ups:** How does that differ from dynamic scope? Where does `this` fit in that comparison?
- [ ] What is the difference between function scope and block scope, and why does it matter in practice?  
  **Follow-ups:** Why does `var` in a `for` loop interact badly with async callbacks? What does `let` change mechanically?
