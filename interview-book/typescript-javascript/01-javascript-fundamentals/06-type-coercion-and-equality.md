# 06. Type coercion and equality

> Source: `interview-prep/typescript-javascript/01-javascript-fundamentals.md`

### Topics to learn
- [ ] Falsy values (there are exactly 8: `false, 0, -0, 0n, '', null, undefined, NaN`)
- [ ] `==` (loose equality) coercion rules vs `===` (strict equality, no coercion)
- [ ] `+` operator: string concatenation vs numeric addition, and how it decides
- [ ] `null == undefined` is `true`, but both are `!== ` to everything else and each other's strict check
- [ ] `NaN !== NaN` - use `Number.isNaN` or `Object.is`
- [ ] `Object.is` vs `===` (edge cases: `NaN`, `+0`/`-0`)
- [ ] Array/object truthy behavior (`[]` and `{}` are truthy)

### The 8 falsy values (memorize this)

```
false, 0, -0, 0n, "", null, undefined, NaN
```

Everything else is truthy - notably `[]`, `{}`, `"0"`, and `"false"` are all truthy, which trips people up.

### `==` vs `===`

`===` never coerces types - if the types differ, it's `false`, full stop. `==` coerces one or both operands to a common type before comparing, following the (infamous) abstract equality algorithm.

```js
1 == '1';        // true - string coerced to number
0 == false;      // true - false coerced to 0
null == undefined; // true - special case, only equal to each other
null == 0;       // false - null does NOT coerce to 0 for ==
'' == 0;         // true - both coerce to 0
[] == false;     // true - [] -> '' -> 0, false -> 0
NaN == NaN;      // false - NaN is never equal to anything, including itself
```

**Default practice:** always use `===`/`!==`. The only broadly-accepted exception is `== null` as a deliberate shorthand to check for both `null` and `undefined` at once (`value == null` is `true` for either).

### `+` operator ambiguity

```js
1 + 1;      // 2 (numeric)
'1' + 1;    // '11' (string concatenation - string wins)
1 + '1';    // '11'
1 + {};     // '1[object Object]' - object coerced to string via toString
1 + [];     // '1' - array coerced to '' via toString/join, then concatenated
[] + [];    // '' - both arrays become '', concatenated
[] + {};    // '[object Object]'
```

`+` checks: if either operand is a string (after calling `ToPrimitive` on objects), it does string concatenation; otherwise it coerces both to numbers and adds. `-`, `*`, `/` never do this - they always coerce to numbers, which is why `'5' - 1` is `4` but `'5' + 1` is `'51'`.

### Interview question

**Q: Why is `[] == ![]` true?**

**Strong answer:**
> "`![]` evaluates first: `[]` is truthy, so `![]` is `false`. Now we're comparing `[] == false`. With loose equality, `false` coerces to `0`. `[]` goes through `ToPrimitive`, which calls `.toString()` on the array, giving `''`, which then coerces to `0` as well. So it's `0 == 0`, which is `true`. This is exactly the kind of surprising chain that makes `==` risky and is why `===` is the default in any codebase I write."

### Interview question

**Q: How do you correctly check if a value is `NaN`?**

> "`NaN !== NaN` by IEEE-754 spec, so a naive `x === NaN` check never works. Use `Number.isNaN(x)`, which doesn't coerce first (unlike the older global `isNaN()`, which coerces its argument and gives false positives like `isNaN('foo')` being `true`). For a broader identity check including `NaN` and signed zero distinction, `Object.is(x, NaN)` also works, and `Object.is(-0, 0)` is `false` where `===` would say `true`."

---
