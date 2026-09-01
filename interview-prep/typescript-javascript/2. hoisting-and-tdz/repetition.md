# Hoisting and the Temporal Dead Zone — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What does “hoisting” mean if you avoid the phrase “moved to the top”?
- [ ] What is the Temporal Dead Zone?
- [ ] Which declaration forms are fully initialized at scope entry so they can be called early?
- [ ] For `const foo = () => {}`, what is hoisted and what is not?
- [ ] Why is “JS moves declarations to the top of the file” a harmful half-truth?
- [ ] Function declaration vs function expression (regarding early calls).

## Predict / debug

State the result **and explain why**. For debug items, diagnose what actually happens.

- [ ]
```js
console.log(a);
var a = 1;
```

- [ ]
```js
console.log(b);
let b = 2;
```

- [ ]
```js
console.log(typeof foo);
console.log(typeof bar);
var foo = 'a';
let bar = 'b';
```

- [ ]
```js
const x = 'outer';
{
  console.log(x);
  const x = 'inner';
}
```

- [ ] A teammate says: “`let` isn’t hoisted, so this should print the outer value.”
```js
let name = 'outer';
function print() {
  console.log(name);
  let name = 'inner';
}
print();
```
What misconception is that, and what actually happens?

## Say it out loud

- [ ] Explain hoisting and the Temporal Dead Zone in 30–60 seconds as if an interviewer asked.
- [ ] What is hoisting in JavaScript?  
  **Follow-ups:** Does `let` hoist? What is the TDZ?
- [ ] Explain the difference between a function declaration and a function expression with respect to hoisting.  
  **Follow-ups:** What error do you get if you call each too early?
