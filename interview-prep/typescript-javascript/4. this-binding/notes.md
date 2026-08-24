# `this` Binding

## What you need to know

`this` is **not** looked up like a normal variable on the scope chain (except for the special case of **arrow functions**, which have no `this` binding of their own).

For ordinary functions, `this` is decided mostly by **how the function is called** (the call site), plus a few hard overrides (`new`, `bind`, and arrows).

If you remember one sentence for interviews:

> Variable lookup is lexical; `this` (for non-arrows) is call-site.

Curriculum checklist this unit completes:

- Default binding (bare call)
- Implicit binding (`obj.method()`)
- Explicit binding (`call` / `apply` / `bind`)
- `new` binding
- Arrow functions: lexical `this`
- Precedence among those rules
- React class unbound handler footgun

---

## Mental model: call site first

Before memorizing tables, ask at the call site:

1. Was it called with `new`?
2. Was it called via `call`/`apply`, or is it a function produced by `bind`?
3. Was it called as `something.fn(...)`?
4. Otherwise it is a bare call → default binding.
5. If the function is an **arrow**, skip 1–4 for `this`: use the enclosing scope’s `this`.

That ordering is the precedence list below.

---

## The four rules (ordinary functions)

Preserved precedence (highest wins):

1. **`new` binding** — `new Foo()`  
2. **Explicit binding** — `fn.call(obj)`, `fn.apply(obj)`, or a function from `fn.bind(obj)`  
3. **Implicit binding** — `obj.method()`  
4. **Default binding** — bare `fn()`

### Quick reference table (preserved)

| Call form | `this` inside the function |
|---|---|
| `fn()` | `undefined` (strict) / global object (sloppy) |
| `obj.fn()` | `obj` |
| `fn.call(x)` / `fn.apply(x)` | `x` |
| `const bound = fn.bind(x); bound()` | `x`, permanently (for that bound function) |
| `new Fn()` | the newly created instance |
| Arrow function | whatever `this` was in the enclosing lexical scope |

---

## Default binding

### What it is

A **standalone** call with no base object and no explicit/`new` override:

```js
function show() {
  console.log(this);
}

show(); // default binding
```

### Strict vs sloppy

| Mode | `this` for bare `fn()` |
|---|---|
| Strict (`'use strict'`, ES modules, class bodies) | `undefined` |
| Sloppy | Global object (`globalThis` / `window`) |

```js
'use strict';
function f() {
  return this;
}
f(); // undefined
```

### Why it matters

Detaching a method turns an implicit call into a default call:

```js
const obj = {
  n: 1,
  read() {
    return this.n;
  },
};

const detached = obj.read;
detached(); // strict: TypeError reading `.n` of undefined; or undefined access failure
```

`detached` is just a function reference. The call is `detached()`, not `obj.read()`, so implicit binding never applies.

### Interview appearance

“What is `this` here?” for bare callbacks, `setTimeout(obj.method, 0)`, passing `this.handleClick`, etc.

---

## Implicit binding

### What it is

When the call uses a **member expression** as the callee — the object left of the final property access becomes `this`:

```js
obj.method();      // this === obj
obj.nested.method(); // this === obj.nested  (the receiver at the call site)
```

Only the **last** link before the call matters:

```js
const a = {
  name: 'a',
  b: {
    name: 'b',
    greet() {
      return this.name;
    },
  },
};

a.b.greet(); // 'b' — receiver is a.b
```

### Why it exists

Methods need a convenient reference to “the object I was invoked on” without passing that object as an argument every time.

### Losing implicit binding

Anything that separates the function from the call’s receiver loses it:

```js
const greet = a.b.greet;
greet(); // default binding — not a.b

setTimeout(a.b.greet, 0); // later bare call — default binding

const { greet: g } = a.b;
g(); // default binding
```

### Callback footgun

```js
const user = {
  name: 'Ada',
  print() {
    console.log(this.name);
  },
};

[1].forEach(user.print); // `this` is not `user` (forEach may set its own thisArg; without it, default / undefined in strict)
[1].forEach(user.print, user); // explicit thisArg — OK
[1].forEach(() => user.print()); // wrap to keep call shape
```

---

## Explicit binding: `call`, `apply`, `bind`

### What they are

You **set** `this` (and optionally arguments) yourself.

| Tool | Role |
|---|---|
| `fn.call(thisArg, a, b)` | Call immediately; args listed |
| `fn.apply(thisArg, [a, b])` | Call immediately; args as array (or array-like) |
| `fn.bind(thisArg, a)` | Return a **new function** permanently tied to `thisArg` (and optional partial args) |

```js
function intro(greeting) {
  return `${greeting}, ${this.name}`;
}

const person = { name: 'Nika' };

intro.call(person, 'Hi');   // 'Hi, Nika'
intro.apply(person, ['Hi']); // 'Hi, Nika'

const bound = intro.bind(person);
bound('Hey'); // 'Hey, Nika'
```

### Why `bind` matters

`bind` fixes `this` for later bare calls — the typical fix when an API will invoke your function without a receiver:

```js
const obj = {
  n: 1,
  read() {
    return this.n;
  },
};

const stable = obj.read.bind(obj);
setTimeout(stable, 0); // still this === obj
```

Bound functions ignore later attempts to change `this` via normal implicit/default calls. (`call`/`apply` on an already-bound function do not re-bind `this` to a new target the way beginners expect — the bound `this` sticks.)

### Soft details worth knowing (not trivia piles)

- `call`/`apply` with `thisArg` of `null` or `undefined` in **strict** mode: `this` is actually that value. In **sloppy** mode they coerce to the global object.
- `bind` creates a new exotic function; useful for partial application as well as `this`.

```js
function add(a, b) {
  return a + b;
}
const add10 = add.bind(null, 10);
add10(5); // 15
```

---

## `new` binding

### What it is

`new Fn(...args)` roughly:

1. Create a new ordinary object.
2. Set that object’s prototype link from `Fn.prototype`.
3. Call `Fn` with `this` bound to the new object.
4. If the constructor returns an object, that object is the result; otherwise use the new object.

```js
function User(name) {
  this.name = name;
}

const u = new User('Ada');
u.name; // 'Ada' — this was the new instance
```

### Why precedence is highest (among the four)

Even if you somehow thought of other rules, construction is defined as creating and binding a new receiver. Practically: **`new` beats the other ordinary call-site patterns.**

```js
function F() {
  this.tag = 'instance';
}
const obj = { tag: 'obj' };
const Bound = F.bind(obj);
const x = new Bound();
x.tag; // 'instance' — new wins over the bound thisArg for constructing
```

(You rarely need the bound+`new` combo; interviews sometimes poke it to check precedence.)

### Without `new`

```js
User('Ada'); // default this — pollutes global / throws in strict when assigning this.name
```

That is why constructors are capitalized by convention and why classes force `new`.

---

## Arrow functions: lexical `this`

### What they are

Arrow functions do **not** get `this` from the four call-site rules. They have **no own `this` binding**. Evaluating `this` inside an arrow resolves like a variable in the **enclosing lexical scope** (the `this` value that outer non-arrow context would see — or the outer arrow’s inherited `this`, and so on).

Preserved example:

```js
const obj = {
  name: 'nika',
  regular() {
    console.log(this.name);
  },
  arrow: () => console.log(this?.name),
};

obj.regular(); // 'nika' — implicit binding, this = obj
obj.arrow();   // undefined (typically) — lexical this from module/global, not obj

const detached = obj.regular;
detached(); // default binding — undefined in strict / TypeError on property access
```

**Important:** Putting an arrow as an object property does **not** make `this` mean that object. The object literal does not create a `this` binding for the arrow to capture. The arrow captures whatever `this` was outside the literal (module: often `undefined`).

### Why arrows exist for `this`

They fix the classic nested-callback problem without `self = this` or `.bind(this)`:

```js
const timer = {
  ms: 100,
  start() {
    setTimeout(() => {
      console.log(this.ms); // this === timer — arrow sees start()'s this
    }, this.ms);
  },
};

timer.start();
```

Compare with a regular function callback:

```js
const timer2 = {
  ms: 100,
  start() {
    setTimeout(function () {
      console.log(this.ms); // default binding — not timer2
    }, this.ms);
  },
};
```

### What arrows also lack (related footguns)

Arrows have no own `arguments`, cannot be used as constructors (`new` arrow → `TypeError`), and have no own `super` binding in the same way methods do. For `this` interviews, the headline is: **lexical `this`, call site ignored.**

### Class field arrows

```js
class Button {
  handleClick = () => {
    console.log(this);
  };
}
```

The arrow is created per instance in a context where `this` is the instance, so it lexically captures that instance. That is why it works as a detached React handler.

---

## Precedence: working through conflicts

Apply in order for **non-arrow** functions:

```
new  >  explicit (call/apply/bind)  >  implicit (obj.fn)  >  default (fn)
```

Arrows: **ignore that ladder** for `this`; use lexical capture.

```js
// What happens here?
function f() {
  return this;
}

const obj = { f };

console.log(obj.f() === obj); // true — implicit
console.log(f.call(obj) === obj); // true — explicit
```

```js
const obj = {
  f() {
    return () => this;
  },
};

const arrow = obj.f();
arrow(); // obj — arrow captured this from f's call (implicit obj)
```

---

## React class method footgun (preserved + mechanism)

```jsx
class Button extends React.Component {
  handleClick() {
    console.log(this.props.label); // TypeError: Cannot read properties of undefined
  }
  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}
```

### Why it breaks

1. `this.handleClick` evaluates to a function reference (the method).
2. React stores and later invokes that function as a **bare callback**, not as `component.handleClick()`.
3. Implicit binding requires the call shape `receiver.method()`.
4. Class bodies are strict → default `this` is `undefined`.
5. Reading `this.props` throws.

### Fixes

1. **Constructor bind:** `this.handleClick = this.handleClick.bind(this);`
2. **Class field arrow:** `handleClick = () => { ... }` (lexical `this`)
3. **Inline arrow in render:** `onClick={() => this.handleClick()}` — call shape restores implicit binding (new function each render; usually fine for interviews, sometimes relevant for memoization/perf discussions)

Modern codebases often avoid the issue with **function components** (no `this`).

Strong spoken answer (preserved, still correct):

> `this.handleClick` is passed as a bare reference to `onClick` — React calls it as a plain function, not as `this.handleClick()`, so the implicit binding rule never applies and `this` falls back to `undefined` in strict mode (all ES modules and class bodies are strict by default). Three fixes: bind in the constructor; use a class field arrow which lexically captures `this`; or pass an inline arrow at the call site. Function components sidestep this because there's no `this` to bind.

---

## Common mistakes and misconceptions

1. **“`this` refers to the function’s enclosing object in the source.”** For ordinary functions, look at the **call**. Object-literal arrows do not get that object as `this`.
2. **“Arrow functions bind `this` to the object they are defined on.”** They bind lexically to the enclosing scope’s `this`, which may be `undefined` in modules.
3. **Confusing closures with `this`.** Closures capture **variables** lexically. Ordinary `this` is not a variable lookup (arrows make `this` behave *like* lexical capture).
4. **Assuming destructuring keeps the method’s receiver.** `const { method } = obj; method();` loses implicit binding.
5. **Thinking `bind` mutates the original function.** It returns a new function.
6. **Using arrows for prototype methods that need dynamic `this`.** If you need per-call receivers (e.g. borrowing methods), use regular functions.
7. **Forgetting strict mode.** Bare calls in modern React/TS/ESM are `undefined`, not `window`.

---

## Connections to other concepts

```
call site shape
  → default / implicit / explicit / new
    → this for ordinary functions

arrow function
  → no own this
    → lexical this (same “capture” intuition as closures, different slot)

detach method reference
  → loses implicit binding
    → default undefined (strict)
      → React class handler bug

bind / field arrow / wrapper call
  → restore stable this for APIs that bare-call your function

lexical scope (variables)
  ≠ this rules (ordinary functions)
```

Closures answer “which **variable binding**?” `this` answers “which **receiver object**?” for non-arrows. Mixing the two explanations is a common interview failure mode.

---

## Interview perspective

You should be able to:

1. State the four rules in precedence order and place arrows outside that ladder.
2. Predict `this` for `obj.fn`, detached `fn`, `fn.call`, `new`, and nested arrows.
3. Explain why object-literal arrows do not see the object as `this`.
4. Diagnose the React class `onClick={this.handleClick}` bug and list three fixes.
5. Contrast `this` with lexical variable scope in one clear sentence.

---

# Self-test

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
