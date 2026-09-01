# `this` Binding — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] For an ordinary function, what primarily determines `this`?
- [ ] List the four binding rules in precedence order.
- [ ] How do arrow functions get `this`?
- [ ] Why does saving `const fn = obj.method` and calling `fn()` change `this`?
- [ ] Ordinary function `this` vs arrow function `this`.
- [ ] Lexical variable capture (closures) vs `this` binding for ordinary functions.

## Predict / debug

State the result **and explain why** (`this` value or logged output / error). For debug items, diagnose and list fixes.

- [ ]
```js
const obj = {
  x: 1,
  read() {
    return this.x;
  },
};
console.log(obj.read());
const r = obj.read;
console.log(r());
```

- [ ]
```js
const obj = {
  name: 'obj',
  regular() {
    return () => this.name;
  },
};
const g = obj.regular();
console.log(g());
```

- [ ]
```js
const outer = {
  name: 'outer',
  nest: {
    name: 'nest',
    hi() {
      return this.name;
    },
  },
};
console.log(outer.nest.hi());
```

- [ ]
```js
'use strict';
const obj = {
  n: 2,
  read() {
    return this.n;
  },
};
setTimeout(obj.read, 0); // describe this when the timer fires
```

- [ ] Diagnose and list fixes:
```jsx
class Menu extends React.Component {
  onSelect() {
    this.setState({ open: false });
  }
  render() {
    return <button onClick={this.onSelect}>Close</button>;
  }
}
```

## Say it out loud

- [ ] Explain `this` binding in 30–60 seconds as if an interviewer asked.
- [ ] How is `this` determined in JavaScript?  
  **Follow-ups:** Order of precedence? Where do arrows fit?
- [ ] Why does passing a method as a callback lose its `this`?  
  **Follow-ups:** How do `bind` and arrows fix it differently?
