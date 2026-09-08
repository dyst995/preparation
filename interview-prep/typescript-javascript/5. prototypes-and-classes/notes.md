# Prototypes and Classes

## What you need to know

JavaScript objects form a **prototype chain**. When you read a property that is not an own property of the object, the engine walks that object’s internal `[[Prototype]]` link, then that object’s prototype, and so on, until it finds the property or reaches `null`.

There is no separate “class instance system” underneath ES6 `class`. **`class` is syntax over constructor functions + prototypes**, with important safety and semantics differences (strict mode, TDZ, must use `new`, non-enumerable methods).

Curriculum checklist this unit completes:

- Prototype chain / `[[Prototype]]` (`Object.getPrototypeOf`, `__proto__`)
- `Object.create`, `Object.prototype`
- Constructor functions and the four steps of `new`
- `class` as sugar with real caveats
- Prototype methods (shared) vs instance fields (per object)
- `instanceof`
- Inheritance: `extends` / `super` vs manual prototype wiring
- NestJS relevance (classes + metadata) at connection level

Related units: **`this` binding** (methods + `new`), **Hoisting/TDZ** (class declarations).

---

## The prototype chain

### What `[[Prototype]]` is

Every ordinary object has an internal slot **`[[Prototype]]`**: either another object or `null`.

- Prefer **`Object.getPrototypeOf(obj)`** to read it.
- `__proto__` is a legacy accessor on `Object.prototype`; avoid it in new code, but recognize it in interviews/debugging.

```js
const dog = { bark() { return 'woof'; } };
Object.getPrototypeOf(dog) === Object.prototype; // true
Object.getPrototypeOf(Object.prototype) === null; // true — end of chain
```

### How property lookup works

For a **get** of `obj.prop`:

1. If `obj` has an own property `prop`, use it.
2. Else look at `Object.getPrototypeOf(obj)` and repeat.
3. If the chain ends at `null` without a hit → `undefined` (for ordinary data gets).

**Assignment** is different: a normal `obj.prop = value` usually sets an **own** property on `obj` (it does not edit the prototype’s property unless you are dealing with setters/inheritance edge cases). That is why shadowing works:

```js
const proto = { kind: 'animal' };
const obj = Object.create(proto);
obj.kind = 'dog'; // own property shadows
console.log(obj.kind); // 'dog'
console.log(proto.kind); // 'animal'
delete obj.kind;
console.log(obj.kind); // 'animal' — found again on the prototype
```

### Why this exists

Prototypes give **shared behavior** without copying methods onto every object. One `speak` function on `Animal.prototype` serves all instances; each instance only stores its own data (`name`, etc.).

---

## `Object.prototype` and `Object.create`

### `Object.prototype`

Most objects ultimately delegate to **`Object.prototype`**, which holds widely used methods: `toString`, `hasOwnProperty` (legacy style), `valueOf`, etc.

```js
({}).toString(); // '[object Object]' — found via Object.prototype
```

Objects can opt out:

```js
const dict = Object.create(null); // no prototype
// dict.toString // undefined — useful for safe key maps, no inherited junk
```

### `Object.create(proto)`

Creates a new object whose `[[Prototype]]` is `proto` (or `null`).

```js
const animal = {
  speak() {
    return 'sound';
  },
};

const dog = Object.create(animal);
dog.speak(); // 'sound' — delegated
Object.getPrototypeOf(dog) === animal; // true
```

Optional second argument can define own properties via property descriptors (less common in interviews; know it exists).

### Mental model

```
instance  →  Animal.prototype  →  Object.prototype  →  null
```

---

## Constructor functions and `new`

### Pattern (preserved)

```js
function Animal(name) {
  this.name = name; // own data on the instance
}

Animal.prototype.speak = function () {
  return `${this.name} makes a sound`; // shared method
};

const dog = new Animal('Rex');
dog.speak(); // 'Rex makes a sound' — found on Animal.prototype
```

- **Own properties:** set in the constructor on `this` (per instance).
- **Shared methods:** assigned on `Constructor.prototype`.

### What `new Animal('Rex')` does (preserved four steps)

1. Creates a new empty object.
2. Sets that object’s `[[Prototype]]` to `Animal.prototype`.
3. Calls `Animal` with `this` bound to the new object.
4. Returns the new object (**unless** the constructor explicitly returns another **object**; a returned primitive is ignored).

```js
function Weird() {
  this.a = 1;
  return { b: 2 }; // overrides the new instance as the result
}
new Weird(); // { b: 2 }
```

```js
function Normal() {
  this.a = 1;
  return 5; // primitive ignored
}
new Normal(); // { a: 1 }
```

### `Constructor.prototype` vs `[[Prototype]]`

Easy confusion:

| Expression | Meaning |
|---|---|
| `Animal.prototype` | The object that will become the `[[Prototype]]` of instances created with `new Animal` |
| `Object.getPrototypeOf(dog)` | The actual `[[Prototype]]` of `dog` (usually `Animal.prototype`) |
| `dog.prototype` | Usually `undefined` — instances are not functions |

```js
Object.getPrototypeOf(dog) === Animal.prototype; // true
Animal.prototype.constructor === Animal; // true by default (convention)
```

### Without `new`

Calling a constructor as a plain function uses **default `this` binding** (see `this` unit): in strict mode assignments like `this.name = ...` throw; in sloppy mode they can create/pollute globals. Prefer `class` (throws without `new`) or always invoke with `new`.

---

## `instanceof` and chain checks

### What `instanceof` does

`obj instanceof Constructor` checks whether `Constructor.prototype` appears anywhere in `obj`’s prototype chain.

```js
dog instanceof Animal; // true
dog instanceof Object; // true
dog instanceof Array;  // false
```

It is **not** a check of “was constructed by this function exclusively,” and it can be confused by:

- Manual `Object.setPrototypeOf` / `Object.create`
- Cross-realm objects (iframe/another window has a different `Array.prototype`)
- `Symbol.hasInstance` customization (rare)

### Own vs inherited checks

```js
dog.hasOwnProperty('name');  // true (legacy style)
dog.hasOwnProperty('speak'); // false — speak is on the prototype

Object.hasOwn(dog, 'name');  // modern preferred
Object.hasOwn(dog, 'speak'); // false
```

`in` operator sees inherited properties too: `'speak' in dog` → `true`.

---

## `class` as sugar — with real differences

### Equivalent surface (preserved)

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} makes a sound`;
  }
}
```

Still true under the hood:

- `speak` lives on **`Animal.prototype`** (one shared function).
- Instances hold own fields set in `constructor`.
- `new Animal` still wires `[[Prototype]]` to `Animal.prototype`.

### Real differences from plain constructor functions (preserved + expanded)

| Topic | `class` | Classic `function` constructor |
|---|---|---|
| Mode | Body always **strict** | Strict only if requested |
| Hoisting | Binding in **TDZ** until class line runs | Function declarations fully hoisted |
| Without `new` | **`TypeError`** | Silent wrong `this` / pollution risk |
| Methods in body | **Non-enumerable** on the prototype | Manual `.prototype.foo =` is enumerable by default |
| `extends` / `super` | Built-in syntax | Manual prototype wiring |

```js
// What happens here?
const x = new Person(); // ReferenceError — TDZ
class Person {}
```

```js
class A {}
A(); // TypeError: Class constructor A cannot be invoked without 'new'
```

### Instance fields vs prototype methods

```js
class Counter {
  count = 0;          // own property per instance (set like constructor init)
  inc() {             // on Counter.prototype — shared
    this.count++;
  }
}
```

```js
const a = new Counter();
const b = new Counter();
a.inc === b.inc; // true — same function on the prototype
a.count === b.count; // true numerically at start, but different own properties
a.count = 5;
b.count; // 0
```

### Method vs arrow class field (preserved interview point)

```js
class A {
  regular() {
    return this;
  }
  arrowField = () => this;
}
```

Strong answer (preserved, still correct):

> `regular` lives on `A.prototype` — one copy shared by every instance, and its `this` depends on how it's called. `arrowField` is created fresh in the constructor for every instance, stored as an own property, and its `this` is lexically bound to the instance at construction time because arrow functions don't have their own `this`. That pattern avoids manual `.bind()` for event handlers in older React class components — at the cost of one extra function allocation per instance instead of one shared prototype method.

Causal summary:

| | Prototype method | Arrow instance field |
|---|---|---|
| Where stored | `Ctor.prototype` | Own property on each instance |
| Allocations | One for all instances | One per instance |
| `this` | Call-site rules | Lexical to instance |
| Detached callback | Easy to lose `this` | Stable |

---

## Inheritance: `extends`, `super`, and manual wiring

### `extends` / `super`

```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return `${this.name} noise`;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // must call before using `this` in subclass
    this.breed = breed;
  }
  speak() {
    return `${super.speak()} (woof)`;
  }
}

const d = new Dog('Rex', 'lab');
d.speak(); // 'Rex noise (woof)'
d instanceof Dog;    // true
d instanceof Animal; // true
```

What matters mechanistically:

- `Dog.prototype`’s `[[Prototype]]` is `Animal.prototype` (instance method chain).
- `Dog`’s `[[Prototype]]` is `Animal` (static method chain — constructors inherit too).
- `super()` in the constructor invokes the parent constructor for instance initialization.
- `super.speak()` looks up the method on the parent prototype chain (not a dynamic “caller” lookup).

```js
Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // true
Object.getPrototypeOf(Dog) === Animal; // true — static inheritance
```

### Manual prototype inheritance (pre-`class` / interview literacy)

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return 'noise';
};

function Dog(name) {
  Animal.call(this, name); // like super() for data
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // repair constructor property
Dog.prototype.bark = function () {
  return 'woof';
};
```

`Object.setPrototypeOf` can mutate an existing object’s `[[Prototype]]`; prefer `Object.create` when building the link for a new prototype object. Mutating prototypes of live objects is slower and surprising — know it, don’t casually use it.

---

## Static members (brief, interview-useful)

```js
class User {
  static createGuest() {
    return new User('guest');
  }
}
User.createGuest(); // called on the constructor, not an instance
```

Statics live on the **constructor function** itself (and follow the constructor’s prototype chain with `extends`), not on instances.

---

## Why this matters for NestJS (preserved connection)

NestJS is built around **classes**, decorators, and constructor injection. Decorators are functions that run at **class definition time** and can attach metadata (`Reflect.metadata`). TypeScript can emit design-time type metadata for constructor parameters so the DI container knows what to inject.

You do not need a full Nest course here — you need the mental model:

> Providers are class constructors; instances are created with those constructors; metadata hangs off the class/function object; prototype methods are the shared behavior of the instance.

If asked “how does Nest know what to inject?”, the honest short path is: **constructor parameter types → emitted metadata on the class → container reads metadata and constructs dependencies**.

---

## Common mistakes and misconceptions

1. **“`class` means JS grew a Java-like class runtime.”** Still prototypes; `class` is syntax + guards.
2. **Confusing `obj.prototype` with `Object.getPrototypeOf(obj)`.** Instances don’t have `.prototype`; functions do.
3. **Thinking methods are copied onto each instance.** Prototype methods are shared (unless you install arrows/fields per instance).
4. **Mutating `Ctor.prototype` after instances exist** changes behavior for all instances that delegate to it — powerful and dangerous.
5. **Forgetting `super()` before `this` in subclasses.**
6. **Using `instanceof` as a perfect type check** across iframes/realms or heavily patched prototypes.
7. **Assigning `Dog.prototype = Animal.prototype`** (same object) instead of `Object.create(Animal.prototype)` — parent and child then share one prototype object and overwrite each other’s methods.
8. **Expecting class declarations to be callable early like `function` declarations.** TDZ applies.

---

## Connections to other concepts

```
object property miss
  → walk [[Prototype]]
    → shared methods / inheritance / instanceof

new Ctor()
  → create object + link to Ctor.prototype + call with this
    → instance own data + delegated behavior

class syntax
  → same prototype structure
    + strict, TDZ, mandatory new, non-enumerable methods

prototype method vs arrow field
  → shared call-site this  vs  per-instance lexical this
    → React class handler patterns (this unit + this-binding unit)

constructor function object
  → place for statics + decorator/DI metadata (Nest)
```

`this` inside prototype methods still follows **call-site** rules. Prototypes answer **where the function is found**; `this` answers **which receiver was used when calling it**.

---

## Interview perspective

You should be able to:

1. Explain property lookup via the prototype chain ending at `null`.
2. Walk through the four steps of `new`.
3. Draw `instance → Ctor.prototype → Object.prototype → null`.
4. Say “`class` is sugar” **and** list real differences (strict, TDZ, no bare call, non-enumerable methods).
5. Contrast prototype methods vs arrow instance fields (memory + `this`).
6. Explain `extends`/`super` as prototype linking + parent constructor/method access.
7. Optionally connect Nest DI to classes/metadata without hand-waving.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
