# `this` Binding — Self-test

## Core recall

1. For an ordinary function, what primarily determines `this`?
2. List the four binding rules in precedence order.
3. What is `this` in a bare function call in strict mode? In sloppy mode?
4. What does `obj.method()` set `this` to?
5. What do `call`, `apply`, and `bind` each do?
6. What is `this` inside a function invoked with `new`?
7. How do arrow functions get `this`?
8. Why does `onClick={this.handleClick}` break in a React class component?

## Explain why

1. Why does saving `const fn = obj.method` and calling `fn()` change `this`?
2. Why doesn’t an arrow stored as `obj.arrow` typically print `obj`’s properties via `this`?
3. Why does `setTimeout(obj.method, 0)` often lose `this`?
4. Why are class field arrows a valid fix for React handlers?
5. Why is `new` higher precedence than `bind`’s fixed `thisArg` when both appear in construction scenarios?
6. Why is “`this` is lexical” an incomplete statement about JavaScript?

## Compare and contrast

1. Implicit binding vs default binding.
2. `call`/`apply` vs `bind`.
3. Ordinary function `this` vs arrow function `this`.
4. Lexical variable capture (closures) vs `this` binding for ordinary functions.
5. Constructor bind vs class field arrow vs inline render arrow (React) — tradeoffs.
6. `obj.nested.fn()` receiver vs “the outermost object in the expression.”

## Predict the output

State the result **and explain why** (`this` value or logged output / error).

1.
```js
'use strict';
function f() {
  return this;
}
console.log(f());
```

2.
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

3.
```js
const obj = {
  x: 1,
  a: () => this,
};
console.log(obj.a()); // in an ES module
```

4.
```js
function greet() {
  return this.name;
}
const p = { name: 'Ada' };
console.log(greet.call(p));
```

5.
```js
function User(name) {
  this.name = name;
}
const u = new User('Bea');
console.log(u.name);
```

6.
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

7.
```js
const obj = {
  name: 'obj',
  regular() {
    return function () {
      return this?.name;
    };
  },
};
const g = obj.regular();
console.log(g());
```

8.
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

9.
```js
function f() {
  return this;
}
const o = { f };
const bound = f.bind(o);
console.log(bound() === o);
console.log(o.f() === o);
```

10.
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

## Debugging

1. Diagnose and list fixes:
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

2. Diagnose:
```js
const calculator = {
  value: 0,
  add(n) {
    this.value += n;
    return this;
  },
};
['add'].forEach((methodName) => {
  const fn = calculator[methodName];
  fn(5);
});
console.log(calculator.value);
```
Why didn’t `value` become `5`? Fix it without converting `add` to an arrow on the object.

3. Diagnose unexpected log:
```js
const person = {
  name: 'Nika',
  friends: ['A', 'B'],
  printFriends() {
    this.friends.forEach(function (f) {
      console.log(this.name + ' knows ' + f);
    });
  },
};
person.printFriends();
```
Fix with an arrow **and** explain an alternate fix using `forEach`’s `thisArg`.

4. Diagnose:
```js
class Counter {
  n = 0;
  inc() {
    this.n++;
  }
}
const c = new Counter();
const { inc } = c;
inc();
```

## Application

1. Write a function `bindAll(obj, methodNames)` that replaces each listed method with a version bound to `obj`.

2. Given `function intro(greeting){ return greeting + ' ' + this.name }`, create a reusable `sayHi` for `{ name: 'Ada' }` using `bind`.

3. Refactor this so the timeout still sees the right `this` **using an arrow**, then show a second version using `bind` instead:
```js
const obj = {
  label: 'tick',
  start() {
    setTimeout(function () {
      console.log(this.label);
    }, 0);
  },
};
```

4. Write a tiny `new`-style constructor function `Point(x, y)` that sets `this.x` / `this.y`, and show what goes wrong if you call it without `new` in strict mode.

## Interview questions

1. How is `this` determined in JavaScript?  
   **Follow-ups:** Order of precedence? Where do arrows fit?

2. Why does passing a method as a callback lose its `this`?  
   **Follow-ups:** How do `bind` and arrows fix it differently?

3. Explain the React class `onClick={this.handleClick}` bug.  
   **Follow-ups:** Three fixes and tradeoffs? Why don’t function components have this problem?

4. What is the difference between `call`, `apply`, and `bind`?  
   **Follow-ups:** Can you re-bind a bound function’s `this` with `call`?

5. Does an arrow function’s `this` depend on how you call it?  
   **Follow-ups:** What `this` does an arrow get inside an object literal in an ES module?

## Connections

1. How is `this` binding different from lexical scope / closures for ordinary functions?
2. In what sense do arrow functions make `this` “closure-like”?
3. How does strict mode (modules, classes) change the practical severity of lost `this`?
4. How do lost-`this` bugs and stale-closure bugs differ when debugging React?
5. Where will `this` show up again when you study prototypes / `class` methods on the prototype chain?
