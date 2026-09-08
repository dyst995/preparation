# Prototypes and Classes — Self-test

## Core recall

1. What is `[[Prototype]]`, and how do you read it in modern JS?
2. What happens when you read a property that is not an own property of an object?
3. What does `Object.create(proto)` create?
4. List the four steps performed by `new Constructor(...)`.
5. Where do methods defined in a `class` body live?
6. Where do class instance fields (`count = 0`) live?
7. What does `obj instanceof Ctor` check?
8. Name three real differences between `class` and a classic constructor function.
9. What is the practical difference between a prototype method and an arrow class field?

## Explain why

1. Why do all instances share one `speak` function in the `Animal` example?
2. Why does assigning `obj.kind = 'dog'` not change `proto.kind` when `obj` delegates to `proto`?
3. Why does calling a class without `new` throw, while an old constructor function might not?
4. Why must `super()` run before using `this` in a subclass constructor?
5. Why is `Dog.prototype = Animal.prototype` a bad way to set up inheritance?
6. Why can arrow instance fields fix detached method `this` at a memory cost?

## Compare and contrast

1. `Ctor.prototype` vs `Object.getPrototypeOf(instance)`.
2. Own properties vs inherited properties.
3. `Object.create(proto)` vs `new Ctor()`.
4. Prototype method vs arrow class field.
5. `extends` / `super` vs manual `Object.create` + `Parent.call(this, ...)`.
6. `instanceof` vs `Object.getPrototypeOf` / `Object.hasOwn` checks.
7. Property **lookup** on the prototype chain vs identifier lookup on the **scope** chain.

## Predict the output

State the result **and explain why**.

1.
```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return this.name;
};
const dog = new Animal('Rex');
console.log(dog.speak());
console.log(Object.hasOwn(dog, 'speak'));
```

2.
```js
const proto = { x: 1 };
const obj = Object.create(proto);
console.log(obj.x);
obj.x = 2;
console.log(obj.x, proto.x);
```

3.
```js
class Person {}
const p = new Person();
console.log(Object.getPrototypeOf(p) === Person.prototype);
console.log(p.prototype);
```

4.
```js
class A {}
try {
  A();
} catch (e) {
  console.log(e.name);
}
```

5.
```js
class A {
  regular() {}
  arrow = () => {};
}
const a = new A();
const b = new A();
console.log(a.regular === b.regular);
console.log(a.arrow === b.arrow);
```

6.
```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name) {
    super(name);
  }
}
const d = new Dog('Rex');
console.log(d instanceof Dog, d instanceof Animal);
```

7.
```js
function F() {
  this.a = 1;
  return { a: 9 };
}
console.log(new F());
```

8.
```js
const dict = Object.create(null);
console.log(typeof dict.toString);
console.log('toString' in {});
```

9.
```js
class Parent {
  static tag = 'P';
}
class Child extends Parent {}
console.log(Child.tag);
console.log(new Child().tag);
```

10.
```js
function Animal() {}
function Dog() {}
Dog.prototype = Object.create(Animal.prototype);
const d = new Dog();
console.log(d instanceof Dog);
console.log(d instanceof Animal);
console.log(d.constructor === Dog); // after Object.create only — what is constructor unless repaired?
```

## Debugging

1. Diagnose:
```js
function Animal(name) {
  this.name = name;
}
Animal.prototype = {
  speak() {
    return this.name;
  },
};
const a = new Animal('Rex');
console.log(a.constructor === Animal);
```
Why might `constructor` surprise you? How do you fix it if you care?

2. Diagnose inheritance bug:
```js
function Animal() {}
Animal.prototype.speak = function () {
  return 'a';
};
function Dog() {}
Dog.prototype = Animal.prototype;
Dog.prototype.bark = function () {
  return 'b';
};
console.log(new Animal().bark());
```
What went wrong?

3. Diagnose:
```js
class Button {
  handleClick() {
    console.log(this);
  }
}
const b = new Button();
const fn = b.handleClick;
fn();
```
Is this a prototype problem or a `this` problem? How would an arrow field change the situation?

4. Diagnose Nest-shaped confusion (conceptual):
A teammate says, “Nest injects dependencies onto `MyService.prototype` so all instances share the same injected client.” What is wrong with that model?

## Application

1. Implement `Animal` / `Dog` twice: once with constructor functions + `Object.create`, once with `class` / `extends`. Show `speak`/`bark` and `instanceof` checks.

2. Write `Object.create(null)`-based dictionary helpers `set(dict, key, value)` / `get(dict, key)` and explain why `Object.prototype` pollution is avoided.

3. Create a class with one prototype method and one arrow field method; prove with code which are shared vs per-instance (`===` between two instances).

4. Repair this subclass so it correctly initializes and doesn’t throw:
```js
class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name, breed) {
    this.breed = breed;
    this.name = name;
  }
}
```

## Interview questions

1. How does property lookup work on objects in JavaScript?  
   **Follow-ups:** What is `[[Prototype]]`? How do you end the chain?

2. Explain what `new` does.  
   **Follow-ups:** What if the constructor returns an object? A primitive?

3. Is `class` just syntactic sugar?  
   **Follow-ups:** What are the real differences from constructor functions?

4. Prototype method vs arrow class field — differences?  
   **Follow-ups:** When would you choose each? Memory? React handlers?

5. How does `extends` work in terms of prototypes?  
   **Follow-ups:** What does `super` do in constructors vs methods?

6. How does `instanceof` work? When is it misleading?

## Connections

1. How do prototypes and `this` binding work together when you call `dog.speak()`?
2. How does class TDZ connect to the hoisting unit?
3. How is the prototype chain different from the scope chain — what question does each answer?
4. How does Nest-style DI rely on classes/constructor functions as values, not on copying methods per instance?
5. When you detach `instance.method`, which unit explains the failure — prototypes (where the function lived) or `this` (how it was called)?
