# Closures

## What you need to know

A **closure** is a function bundled with a lasting link to the **lexical environment** where it was created. That link lets the function read and update outer bindings even after the outer function has returned.

Closures are not an optional advanced feature you opt into. In JavaScript they happen **whenever** a function can refer to bindings from an outer scope. Interviews use them to test whether you understand **lexical scope + live bindings**, not whether you memorized a slogan.

Curriculum checklist this unit completes:

- Definition: function + references to surrounding lexical scope
- Capture **by reference**, not by value snapshot
- Classic loop + `var` + `setTimeout` bug, and fixes (`let`, IIFE, explicit param)
- Practical uses: memoization, private state, currying, debounce/throttle, module pattern
- Memory: closed-over bindings stay alive while the function is reachable

Prerequisite: **Scope** (lexical environments / scope chain). Related: **Hoisting** (when a binding becomes usable) and later **async** (when callbacks run).

---

## What a closure is

### Definition that holds up in interviews

> A closure is a function that retains access to variables from its enclosing lexical scopes, even when executed outside those scopes.

More mechanically: the function object keeps a reference to its **outer lexical environment(s)**. Identifier lookup still walks the scope chain; those environments were not discarded when the outer call ended, because something still points at them.

### Why closures exist / why they matter

- They make functions first-class in a useful way: you can return behavior that still “knows” its configuration and private state.
- They are the mechanism behind partial application, module privacy, React effect callbacks, and most “factory that returns a function” APIs.
- They explain a huge class of bugs when **shared** bindings or **stale** bindings surprise you.

### Core example (preserved)

```js
function makeCounter() {
  let count = 0;
  return function increment() {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
```

After `makeCounter` returns, its local scope would normally be eligible for GC — but `increment` still references that environment, so `count` stays alive. Each call to `counter` mutates the **same** `count`.

### How it works internally (useful mental model)

1. `makeCounter()` runs → creates an environment record containing `count`.
2. `increment` is created with `[[Environment]]` (mental name) pointing at that record.
3. `makeCounter` returns `increment`; the call frame is gone, but the environment remains reachable through the function.
4. Later `increment()` looks up `count` via that saved outer environment and updates it.

You do not need engine jargon in an interview; you need: **live link to outer bindings**, not a photocopy of values.

---

## Capture by reference, not by value

### What “by reference” means here

The closure does **not** freeze the value of `count` at creation time. It closes over the **binding** (the variable slot). Reads see the current value; writes update that same slot.

```js
function makeToggle() {
  let on = false;
  return {
    flip() {
      on = !on;
      return on;
    },
    read() {
      return on;
    },
  };
}

const t = makeToggle();
t.flip(); // true
t.read(); // true — same binding, not a stale copy
```

### Why this matters

- Multiple functions from the same scope share the same bindings.
- Async callbacks see whatever the binding holds **when they run**, not necessarily what it held when they were created — unless each callback closed over a **different** binding.

```js
// What happens here?
function shared() {
  let n = 0;
  const a = () => n;
  const b = () => {
    n += 1;
    return n;
  };
  return { a, b };
}

const { a, b } = shared();
b();
console.log(a()); // 1 — a sees updates made through b
```

### Easy confusion

- **Closing over a binding** ≠ **closing over a snapshot**.
- Snapshotting is something you do deliberately: copy into a `const value = i` in a per-iteration scope, or pass `i` as a parameter (parameters are their own bindings).

Objects/arrays: the binding holds a **reference to the object**. Mutating the object’s properties is visible to everyone who closed over that binding; reassigning the binding is a different operation.

```js
function hold(obj) {
  return () => obj;
}
const data = { n: 1 };
const get = hold(data);
data.n = 2;
console.log(get().n); // 2 — same object
```

---

## Closures and the scope chain

A closure can reach **any** outer lexical binding it needs: enclosing function(s), blocks (`let`/`const`), module scope — following normal lookup rules. Call site still does not change which outer variables it sees (Scope unit).

```js
const app = 'MyApp';

function outer(prefix) {
  return function inner(name) {
    return `${app}:${prefix}:${name}`;
  };
}

const greet = outer('hi');
greet('Ada'); // 'MyApp:hi:Ada'
```

`inner` closes over `prefix` (from `outer`) and `app` (from module/global). Moving `greet` around and calling it elsewhere does not attach a different `prefix`.

---

## Independent closures from separate calls

Each call to an outer function creates a **new** environment.

```js
const a = makeCounter();
const b = makeCounter();
a(); // 1
a(); // 2
b(); // 1 — separate `count` binding
```

Interview check: two counters do not share state unless they intentionally close over the **same** outer binding.

---

## The classic loop + `var` + async bug

### The bug (preserved)

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 3, 3, 3
```

Causal chain:

1. `var i` is **one** function-scoped binding for the whole loop.
2. Each arrow closes over **that same** `i`.
3. The loop finishes synchronously; `i` is `3`.
4. Timeouts run later; each callback reads the current `i` → `3`.

This is closures doing exactly what they always do (live bindings) combined with **shared** scope from `var`.

### Fix 1: `let` (preferred)

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// logs: 0, 1, 2
```

`for (let i = ...)` creates a **new `i` binding per iteration** (language rule for this loop form). Each callback closes over a different binding whose value stays at that iteration’s index.

### Fix 2: IIFE (legacy, still worth recognizing)

```js
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 0);
  })(i);
}
// logs: 0, 1, 2
```

Each iteration calls a function with parameter `j`. Parameters are per-call bindings. The callback closes over `j`, not the shared `i`. Same idea: **new binding per iteration**, created manually.

### Fix 3: explicit factory / parameter

```js
function scheduleLog(j) {
  setTimeout(() => console.log(j), 0);
}

for (var i = 0; i < 3; i++) {
  scheduleLog(i);
}
```

Passing `i` copies the **number** into parameter `j` for that call. The closure captures `j`.

### Related variant: `forEach` with `var` outside

```js
var i;
for (i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// still 3, 3, 3 — same shared binding
```

```js
[0, 1, 2].forEach(function (i) {
  setTimeout(() => console.log(i), 0);
});
// 0, 1, 2 — callback parameter is a fresh binding per call
```

### Strong spoken answer (preserved, still correct)

> It logs `3, 3, 3`. `var` is function-scoped, so there's a single `i` shared by all three closures, and by the time the timeouts fire the loop has already finished with `i` equal to 3. The cleanest fix is switching to `let`, which creates a fresh binding per iteration so each closure captures its own value. Alternatively, wrap the body in an IIFE that takes `i` as a parameter, which was the pre-ES6 idiom.

---

## Practical patterns

### Private state / module pattern

Hide data by keeping it in a scope only returned methods can see:

```js
function createBank(initial) {
  let balance = initial;
  return {
    deposit(n) {
      balance += n;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}

const acct = createBank(100);
acct.deposit(50); // 150
// no public way to set balance except through deposit
```

Before ES2022 private fields (`#balance`), this was the standard encapsulation story. Still common in factories and older codebases.

### Memoization

Close over a cache object:

```js
function memoize(fn) {
  const cache = new Map();
  return function (key) {
    if (cache.has(key)) return cache.get(key);
    const value = fn(key);
    cache.set(key, value);
    return value;
  };
}
```

The returned function and `cache` live together for the lifetime of the memoized function.

### Currying / partial application

```js
function multiply(a) {
  return function (b) {
    return a * b;
  };
}

const double = multiply(2);
double(5); // 10 — `a` retained via closure
```

### Debounce / throttle

Timer ids and last-run timestamps live in closed-over bindings so repeated calls share one scheduler state:

```js
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
```

(`this`/`apply` belong to the `this` unit; the **closure** point is the shared `timer` binding.)

### React: stale closures (practical connection)

Each render recreates functions that close over **that render’s** props/state. If an effect or callback runs later but was created with an outdated dependency list, it may still read **old** closed-over values:

```js
// Conceptual — dependency arrays are a React topic; the mechanism is closures
useEffect(() => {
  const id = setInterval(() => {
    console.log(count); // closes over `count` from the render that set up this effect
  }, 1000);
  return () => clearInterval(id);
}, []); // empty deps → interval forever sees the first render's count
```

Interview framing: “stale closure” means the function retained the correct lexical binding for an **old** render environment, while you mentally expected the latest state. Fixing it is about **when you recreate the function / which environment it points at** (deps, functional updates, refs) — still grounded in closures + bindings.

---

## Memory implications

### What stays alive

As long as a function is reachable, the environments it can still reach through its scope chain stay reachable **if those bindings are needed** (engines can optimize unused bindings, but you must not rely on that for correctness).

```js
function load() {
  const huge = new Array(1e6).fill(0);
  const token = 'abc';
  return function authHeader() {
    return `Bearer ${token}`;
  };
}

const authHeader = load();
// `token` must stay; ideally `huge` can be collected if unused by the closure
```

### Leak-shaped patterns

- Long-lived callbacks (event listeners, intervals, React effects without cleanup) holding large closed-over data.
- Caches in memoization that grow without bounds.
- Subscriptions registered once that close over whole component trees or large objects.

Interview phrasing: closures **can** extend object lifetime; leaks happen when something long-lived keeps those functions (and thus their environments) forever.

---

## What a closure is not

| Confusion | Reality |
|---|---|
| “A closure is when a function returns a function” | Returning is common, but any escaping use counts (pass to `setTimeout`, store on an object, export). |
| “Closures copy variables” | They keep links to bindings. |
| “Only inner functions are closures” | In JS, functions that use outer variables are closed over those environments; the interesting case is when they **outlive** the outer execution. |
| “`let` in a loop works because it snapshots” | It creates **distinct bindings** per iteration; each closure’s binding holds that iteration’s value. |
| Same as `this` binding | `this` is mostly call-site; closures are lexical variable environments. Different mechanisms. |

---

## Common mistakes and misconceptions

1. Thinking the loop bug means “closures are broken” — the bug is **one shared `var` binding** read later.
2. Fixing with `let` without being able to say **per-iteration binding**.
3. Expecting `const arr = []; arr.push` vs reassignment confusion when debugging closed-over objects.
4. Creating a single cached callback that closes over props forever (stale) and blaming “React magic” instead of lexical capture.
5. Ignoring cleanup: `setInterval` / listeners keep closures (and captured data) alive.
6. Assuming two returned functions from one outer call have isolated state — they share the outer environment unless you create separate bindings.

---

## Connections to other concepts

```
lexical scope
  → function created with link to outer environment
    → closure (especially when function escapes / outlives outer call)

binding is live
  → async callback sees value at run time
    + shared var loop binding
      → 3, 3, 3 bug

for (let i …) per-iteration binding
  → each callback closes over different i
    → 0, 1, 2

closure-held private bindings
  → module pattern / factories
    → encapsulation without classes

React render environments
  → callbacks close over that render’s props/state
    → stale closures when the wrong generation of function keeps running
```

Hoisting/TDZ still apply inside the scopes you close over; they do not redefine what a closure is. Event-loop timing decides **when** the closed-over binding is read; scope decides **which** binding.

---

## Interview perspective

You should be able to:

1. Define a closure in terms of functions + retained lexical environments.
2. Say “by reference / live binding,” not “copies the value,” and prove it with a shared counter or paired getters/setters.
3. Trace the `var` + `setTimeout` loop bug and give `let`, IIFE, and factory fixes with the same underlying idea (separate bindings).
4. Give 2–3 real uses (privacy, memoization, debounce, partial apply).
5. Mention memory: reachable function ⇒ reachable captured state.
6. Connect to React stale closures in one clear sentence when asked about hooks.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
