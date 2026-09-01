# Prototypes and Classes — Next-day repetition

## How to use

1. Do **not** open `notes.md` first.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] What happens when you read a property that is not an own property of an object?
- [ ] List the four steps performed by `new Constructor(...)`.
- [ ] Where do methods defined in a `class` body live? Where do class instance fields (`count = 0`) live?
- [ ] Why does calling a class without `new` throw, while an old constructor function might not?
- [ ] Prototype method vs arrow class field.
- [ ] Property **lookup** on the prototype chain vs identifier lookup on the **scope** chain.

## Predict / debug

State the result **and explain why**. For debug items, diagnose the bug.

- [ ]
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

- [ ]
```js
const proto = { x: 1 };
const obj = Object.create(proto);
console.log(obj.x);
obj.x = 2;
console.log(obj.x, proto.x);
```

- [ ]
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

- [ ] Diagnose inheritance bug:
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

## Say it out loud

- [ ] Explain prototypes and classes in 30–60 seconds as if an interviewer asked.
- [ ] How does property lookup work on objects in JavaScript?  
  **Follow-ups:** What is `[[Prototype]]`? How do you end the chain?
- [ ] Is `class` just syntactic sugar?  
  **Follow-ups:** What are the real differences from constructor functions?
