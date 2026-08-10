# 04. this binding

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] Default binding (standalone function call - `undefined` in strict mode, global object otherwise)
- [ ] Implicit binding (method call - `obj.method()`)
- [ ] Explicit binding (`call`, `apply`, `bind`)
- [ ] `new` binding (constructor calls)
- [ ] Arrow functions: no own `this` - lexically inherited from enclosing scope
- [ ] Precedence order between the above rules
- [ ] Common React footgun: unbound class method handlers

### The four rules, in precedence order

1. **`new` binding** - `new Foo()` creates a new object, binds `this` to it.
2. **Explicit binding** - `fn.call(obj)`, `fn.apply(obj)`, or a function previously bound with `fn.bind(obj)`.
3. **Implicit binding** - `obj.method()` binds `this` to `obj` (the object left of the dot at call time).
4. **Default binding** - a bare function call `fn()` binds `this` to `undefined` in strict mode (or the global object in sloppy mode).

**Arrow functions follow none of these rules.** They have no `this` of their own - they capture `this` lexically from the enclosing scope at definition time, exactly like closures capture variables.

```js
const obj = {
  name: 'nika',
  regular() { console.log(this.name); },
  arrow: () => console.log(this?.name),
};

obj.regular(); // 'nika' - implicit binding, this = obj
obj.arrow();   // undefined - this is lexical, inherited from module/global scope, not obj

const detached = obj.regular;
detached(); // TypeError or undefined - default binding, this is undefined in strict mode
```

### Interview question

**Q: Why does this React class component bug happen, and what are the fixes?**

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

**Strong answer:**
> "`this.handleClick` is passed as a bare reference to `onClick` - React calls it as a plain function, not as `this.handleClick()`, so the implicit binding rule never applies and `this` falls back to `undefined` in strict mode (all ES modules and class bodies are strict by default). Three fixes: bind in the constructor with `this.handleClick = this.handleClick.bind(this)`; use a class field arrow function `handleClick = () => {...}` which lexically captures `this` from the constructor's scope; or pass an inline arrow at the call site, `onClick={() => this.handleClick()}`. Modern codebases mostly sidestep this entirely with function components and hooks, since there's no `this` to bind."

### Quick reference table

| Call form | `this` inside the function |
|---|---|
| `fn()` | `undefined` (strict) / global object (sloppy) |
| `obj.fn()` | `obj` |
| `fn.call(x)` / `fn.apply(x)` | `x` |
| `const bound = fn.bind(x); bound()` | `x`, permanently |
| `new Fn()` | the newly created instance |
| Arrow function | whatever `this` was in the enclosing lexical scope |

---
