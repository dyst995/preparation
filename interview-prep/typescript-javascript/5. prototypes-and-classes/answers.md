# Prototypes and Classes — Answers

## Core recall

1. **Answer:** `[[Prototype]]` is an object’s internal link to another object (or `null`) used for property delegation. Read it with `Object.getPrototypeOf(obj)` (prefer over `__proto__`).  
   **Why:** It is the backbone of inheritance and shared methods in JS.

2. **Answer:** The engine walks the prototype chain (`[[Prototype]]`, then that object’s prototype, …) until it finds the property or reaches `null` → `undefined`.  
   **Why:** Gets delegate; they do not copy inherited properties onto the object.

3. **Answer:** A new object whose `[[Prototype]]` is `proto` (or `null` if you pass `null`).  
   **Why:** Direct way to set up delegation without running a constructor.

4. **Answer:** (1) Create a new object. (2) Set its `[[Prototype]]` to `Constructor.prototype`. (3) Call `Constructor` with `this` bound to that object. (4) Return the new object unless the constructor returns another **object** (primitives are ignored).  
   **Why:** That is the mechanical definition of `new`.

5. **Answer:** On the class’s `.prototype` object (shared among instances), as non-enumerable methods.  
   **Why:** `class` still installs methods on the prototype like classic constructors.

6. **Answer:** As **own** properties on each instance (initialized like constructor setup per object).  
   **Why:** Fields are not shared on the prototype; each instance gets its own copy.

7. **Answer:** Whether `Ctor.prototype` appears anywhere on `obj`’s prototype chain.  
   **Why:** It is a chain membership test, not “exactly constructed by this function.”

8. **Answer (any three):** Always strict body; class binding is in the **TDZ** until the declaration runs; calling without `new` throws; methods are non-enumerable; built-in `extends`/`super` vs manual wiring.  
   **Why:** “Sugar” still changes safety and semantics beyond renaming `function` constructors.

9. **Answer:** Prototype method — one shared function; `this` from call site. Arrow class field — own property per instance; lexical `this` fixed to the instance.  
   **Why:** Storage location and `this` rules differ; arrows cost one allocation per instance.

---

## Explain why

1. **Answer:** `speak` is assigned once on `Animal.prototype`; instances only store own data like `name` and **delegate** method lookup to the shared prototype function.  
   **Why:** Prototypes exist to share behavior without copying functions onto every object.

2. **Answer:** Ordinary assignment creates an **own** property that **shadows** the inherited one; it does not write through to the prototype.  
   **Why:** Gets walk the chain; sets (normally) attach to the receiver object.

3. **Answer:** Class constructors are specified to throw `TypeError` if not invoked with `new`. Classic functions still run as ordinary calls, so `this` follows default binding (global pollution or strict throw on assignment) instead of a hard “must construct” guard.  
   **Why:** Classes add a safety rail the old pattern lacked.

4. **Answer:** Until `super()` finishes, the subclass instance is not initialized; using `this` early is a TDZ-style error for derived constructors.  
   **Why:** Parent constructor must set up the instance (and prototype wiring) before subclass code touches it.

5. **Answer:** Both constructors then share the **same** prototype object. Adding `Dog` methods also appears on `Animal` instances; you lose a separate child prototype link.  
   **Why:** Correct pattern is `Dog.prototype = Object.create(Animal.prototype)` (then repair `constructor`).

6. **Answer:** The arrow is created in the constructor with the instance as lexical `this`, so detached handlers stay correct — but each instance allocates its own function instead of sharing one on the prototype.  
   **Why:** Stability of `this` is paid for with per-instance memory.

---

## Compare and contrast

1. **`Ctor.prototype` vs `Object.getPrototypeOf(instance)`:** The former is the object that **will become** (and usually **is**) the `[[Prototype]]` of instances from `new Ctor`. The latter reads the instance’s actual `[[Prototype]]` link. Typically equal for normal construction; `instance.prototype` is usually `undefined`.

2. **Own vs inherited:** Own = on the object itself (`Object.hasOwn`). Inherited = found only via the chain (`in` can be true for both). Writes usually create own properties that shadow inherited ones.

3. **`Object.create(proto)` vs `new Ctor()`:** `create` only allocates and sets `[[Prototype]]` — no constructor body runs. `new` also runs the constructor with `this` for initialization and uses `Ctor.prototype` as the link.

4. **Prototype method vs arrow field:** Shared + call-site `this` vs per-instance + lexical `this`. Choose prototype for normal methods; arrow fields when you need detachable stable handlers (React class) and accept the allocation cost.

5. **`extends`/`super` vs manual:** `extends` wires `Child.prototype → Parent.prototype` and `Child → Parent` (statics). `super()` / `super.method()` replace `Parent.call(this, …)` and parent-prototype method access. Manual needs `Object.create` + `constructor` repair.

6. **`instanceof` vs `getPrototypeOf` / `hasOwn`:** `instanceof` asks “is `Ctor.prototype` on my chain?” One level of `getPrototypeOf` shows the immediate link. `hasOwn` asks only about own keys — no chain walk. Prefer explicit checks when realms/`Symbol.hasInstance` make `instanceof` misleading.

7. **Prototype chain vs scope chain:** Prototype answers “does this **object** have property `p`?” Scope answers “which **variable binding** does identifier `x` resolve to?” Different graphs: objects vs lexical environments.

---

## Predict the output

1. **`'Rex'`, `false`.** `speak` runs with `this === dog` via implicit binding; the function lives on `Animal.prototype`, so it is not an own property.

2. **`1`, then `2 1`.** Read delegates to `proto`; assignment shadows with own `x = 2`; `proto.x` unchanged.

3. **`true`, `undefined`.** Instance’s `[[Prototype]]` is `Person.prototype`. Instances are not functions, so `.prototype` is undefined.

4. **`'TypeError'`.** Class constructors cannot be called without `new`.

5. **`true`, `false`.** `regular` is the same shared prototype function; each instance gets its own `arrow` field function.

6. **`true true`.** `d`’s chain includes `Dog.prototype` and `Animal.prototype`.

7. **`{ a: 9 }`.** Constructor returned an object → that object replaces the newly created instance as the `new` result.

8. **`undefined`, `true`.** `Object.create(null)` has no `toString`. Ordinary `{}` inherits `toString`, so `'toString' in {}` is true.

9. **`'P'`, `undefined`.** Statics live on the constructor and inherit via `extends` (`Child` → `Parent`). Instances do not get statics as own/instance properties unless also defined that way.

10. **`true`, `true`, `false` (usually).** Chain is correct via `Object.create`, so both `instanceof` checks pass. Without repairing `constructor`, `Dog.prototype.constructor` is still `Animal` (inherited), so `d.constructor === Dog` is false.

---

## Debugging

1. **Diagnosis:** Replacing `Animal.prototype` with a plain object literal wipes the default `constructor: Animal`. Instances then see `constructor` from `Object.prototype` (or missing/wrong), so `a.constructor === Animal` is **false**.  
   **Fix:** After the replacement, set `Animal.prototype.constructor = Animal`, or add methods with `Animal.prototype.speak = …` without replacing the whole prototype object.

2. **Diagnosis:** `Dog.prototype = Animal.prototype` makes them the **same object**. Adding `bark` pollutes the shared prototype, so `new Animal().bark()` works — inheritance wiring is wrong.  
   **Fix:** `Dog.prototype = Object.create(Animal.prototype); Dog.prototype.constructor = Dog;` then add `bark`.

3. **Diagnosis:** **`this` problem**, not missing prototype. `fn` is a detached prototype method; bare `fn()` → default `this` (`undefined` in class/strict). The function still exists on the prototype.  
   **Arrow field:** `handleClick = () => { console.log(this); }` would lexically capture the instance so `fn()` still logs the button.

4. **Diagnosis:** Nest injects **into constructed instances** (constructor params / instance properties), not by writing shared clients onto `MyService.prototype`. Prototype holds shared **methods**; injected collaborators are per-instance (or scoped provider instances), otherwise every service instance would share one mutable client incorrectly.  
   **Why the model is wrong:** Confuses DI wiring with prototype method sharing.

---

## Application

1. **Constructors + `Object.create`:**
```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function () {
  return this.name + ' noise';
};
function Dog(name) {
  Animal.call(this, name);
}
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function () {
  return 'woof';
};
const d1 = new Dog('Rex');
d1.speak();
d1.bark();
d1 instanceof Dog;    // true
d1 instanceof Animal; // true
```

**`class` / `extends`:**
```js
class Animal {
  constructor(name) {
    this.name = name;
  }
  speak() {
    return this.name + ' noise';
  }
}
class Dog extends Animal {
  bark() {
    return 'woof';
  }
}
const d2 = new Dog('Rex');
d2 instanceof Dog && d2 instanceof Animal; // true
```

2.
```js
function set(dict, key, value) {
  dict[key] = value;
}
function get(dict, key) {
  return Object.prototype.hasOwnProperty.call(dict, key)
    ? dict[key]
    : undefined;
}
const dict = Object.create(null);
set(dict, 'a', 1);
get(dict, 'a'); // 1
get(dict, 'toString'); // undefined — not inherited
```
**Why:** `[[Prototype]]` is `null`, so keys like `toString` / polluted `Object.prototype` names are not inherited. Safer map-like dictionaries.

3.
```js
class Demo {
  protoMethod() {}
  arrowField = () => {};
}
const a = new Demo();
const b = new Demo();
a.protoMethod === b.protoMethod; // true — shared on Demo.prototype
a.arrowField === b.arrowField;   // false — own per instance
```

4.
```js
class Dog extends Animal {
  constructor(name, breed) {
    super(name); // must run before this
    this.breed = breed;
  }
}
```
**Why:** Derived constructors require `super()` before `this`; parent sets `name`, then child sets `breed`.

---

## Interview questions

1. **Spoken:** “On a get, JS looks for an own property, then walks `[[Prototype]]` until it finds the key or hits `null`.”  
   **Follow-ups:** `[[Prototype]]` is the internal delegation link (`Object.getPrototypeOf`). The chain ends at `null` (often after `Object.prototype`, unless `Object.create(null)`).

2. **Spoken:** “`new` creates an object, links it to `Ctor.prototype`, calls `Ctor` with that object as `this`, and returns the object — unless the constructor returns another object.”  
   **Follow-ups:** Returned object replaces the instance; returned primitive is ignored and the new instance is used.

3. **Spoken:** “Mostly sugar over constructors and prototypes, but not only renaming: always strict, TDZ for the class binding, must use `new`, non-enumerable methods, and real `extends`/`super`.”  
   **Follow-ups:** List those differences; don’t stop at “it’s just sugar.”

4. **Spoken:** “Prototype methods are one shared function with call-site `this`. Arrow fields are per-instance functions with lexical `this`.”  
   **Follow-ups:** Prefer prototype by default; use arrow fields for detached handlers (React classes) when you accept the memory cost.

5. **Spoken:** “`extends` sets `Child.prototype`’s prototype to `Parent.prototype` and links constructors for statics. `super()` runs the parent constructor; `super.method()` calls the parent prototype method.”  
   **Follow-ups:** Constructor `super` initializes the instance; method `super` is parent-prototype lookup, not “caller” magic.

6. **Spoken:** “`obj instanceof Ctor` checks whether `Ctor.prototype` is on `obj`’s chain. It can mislead across iframes/realms, after manual prototype surgery, or with `Symbol.hasInstance`.”  
   **Follow-ups:** Prefer explicit brand checks / `Array.isArray` / structure checks when identity across realms matters.

---

## Connections

1. **Answer:** Lookup finds `speak` on `Dog`/`Animal.prototype`; the call `dog.speak()` then uses **implicit binding** so `this === dog`. Prototypes locate the function; `this` picks the receiver.  
   **Why:** Separating “where” from “who” prevents confusing inheritance with binding bugs.

2. **Answer:** Class declarations hoist the binding into the TDZ like `let` — you cannot `new Person()` before the class line runs (`ReferenceError`). Function declarations are fully hoisted and callable earlier.  
   **Why:** Same TDZ story as the hoisting unit, applied to `class`.

3. **Answer:** Prototype chain: property access on objects. Scope chain: identifier resolution for variables/functions. One is “does this object have `x`?”; the other is “which binding does `x` refer to?”  
   **Why:** Interview clarity — don’t say “scope” when you mean prototype.

4. **Answer:** Nest treats the class/constructor as a **token** for the DI container; metadata hangs off that function object; the container calls `new` (or a factory) and passes dependencies into the constructor. Shared behavior stays on the prototype; injected values are instance wiring, not prototype copies.  
   **Why:** Classes are values + metadata hosts, not Java-style “copy the class template onto each object.”

5. **Answer:** Prototypes explain that the function still lives on `Ctor.prototype` after detachment. The failure mode is **`this`**: bare call loses the receiver. Fix binding (`bind` / arrow field / call through instance), don’t “put the method back on the prototype.”  
   **Why:** Wrong unit → wrong fix.
