# 05. Prototypes and classes

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] The prototype chain and `[[Prototype]]` (accessible via `Object.getPrototypeOf` / `__proto__`)
- [ ] `Object.create`, `Object.prototype`
- [ ] Constructor functions and `new` (the four steps `new` performs)
- [ ] `class` as syntactic sugar over prototypes (with real differences: TDZ, no hoisting of the body, strict mode always on)
- [ ] Instance methods live on the prototype (shared), instance fields live on the instance (per-object)
- [ ] `instanceof` and prototype chain lookup
- [ ] Inheritance: `extends` / `super`, vs manual `Object.setPrototypeOf`

### Core idea

Every JS object has an internal link to another object called its **prototype**. Property lookup that fails on the object itself walks up this chain until it finds the property or hits `null`. This is *the* mechanism behind method sharing, `instanceof`, and inheritance - there is no separate "class" concept at the engine level, even with ES6 `class` syntax.

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return `${this.name} makes a sound`;
};

const dog = new Animal('Rex');
dog.speak(); // 'Rex makes a sound' - found on Animal.prototype, not on dog itself
```

What `new Animal('Rex')` does, step by step:

1. Creates a new empty object.
2. Sets that object's `[[Prototype]]` to `Animal.prototype`.
3. Calls `Animal` with `this` bound to the new object.
4. Returns the new object (unless the constructor explicitly returns another object).

### `class` is sugar, with caveats

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
```

This compiles to essentially the same prototype-based structure as the function version above - `speak` still lives on `Animal.prototype`, shared across all instances, not copied per instance. The real differences from plain functions:

- Class bodies are **always strict mode**.
- Class declarations are hoisted but stay in the **TDZ** (can't reference before definition, unlike hoisted function declarations).
- Calling a class without `new` throws a `TypeError` (constructor functions silently misbehave instead).
- Methods defined in a class body are **non-enumerable** by default (won't show up in `for...in` or `Object.keys`), unlike properties assigned manually to `.prototype`.

### Interview question

**Q: If I define a method inside a class vs. assigning an arrow function as a class field, what's the practical difference?**

```js
class A {
  regular() { return this; }
  arrowField = () => this;
}
```

**Strong answer:**
> "`regular` lives on `A.prototype` - one copy shared by every instance, and its `this` depends on how it's called. `arrowField` is created fresh in the constructor for every single instance, stored as an own property, and its `this` is lexically bound to the instance at construction time because arrow functions don't have their own `this`. That's exactly the pattern used to avoid manual `.bind()` calls for event handlers in older React class components - at the cost of one extra function allocation per instance instead of one shared prototype method."

### Why this matters for NestJS

NestJS is built almost entirely on classes, decorators, and dependency injection via constructor parameters - understanding that decorators are just functions that run at class-definition time (and can read/attach metadata via `Reflect.metadata`) requires a solid prototype/class mental model. If asked "how does Nest know what to inject," the honest answer traces back to constructor parameter types being readable via `reflect-metadata`, which piggybacks on TypeScript emitting design-time type metadata onto the class.

---
