# Scope — Answers

## Core recall

1. **Lexical nesting of scopes in the source** — which environment a name was written inside, walked outward via the scope chain. Call site does not change free-variable resolution.

2. **Global/module** (script or module top level), **function** (entering a function: params, `var`, inner function decls), **block** (`{ }` / `if`/`for`/etc.: `let`/`const`/`class`).

3. **`var`:** function (or classic-script global). **`let` / `const`:** block (`{ }`). Same scoping for both; they differ on reassignment.

4. A **Lexical Environment** holds identifier→binding mappings for one scope plus a link to an **outer** environment. Lookup checks the current record, then follows `outer` until found or `ReferenceError`.

5. An **inner** scope declares the same name as an outer one; lookup stops at the nearest binding. The outer binding still exists but is hidden under that name until the inner scope ends.

6. **`globalThis`** is the standard cross-environment name for the global object (browser `window`, Node `global`, workers `self`). Not every global binding is a property of it.

7. An **undeclared** assignment in sloppy mode that creates a property on the global object (e.g. `leaked = 42` with no `let`/`var`/`const`).

8. **No.** Module top-level `var`/`let`/`const` stay module-local; they are not properties of `globalThis`.

## Explain why

1. Variable scope is **lexical**. The function’s outer environment was fixed where it was **defined**. Calling it from another function only changes the call stack, not its scope chain.

2. Free variables always resolve to the same outer bindings every call. That stable map is what a returned/escaped function keeps pointing at — so closure behavior is predictable.

3. **`var` is function-scoped**, not block-scoped. The `if` does not create a new `var` binding; the name belongs to the whole enclosing function (and is created at function entry).

4. It silently creates a **shared mutable global**. Any code can read/write it; bugs and test pollution cross function and file boundaries with no declaration at the use site.

5. Top-level **`let`/`const` are global bindings but not global-object properties**. Only classic-script top-level `var`/function decls (and explicit `globalThis.x = …`) show up as `globalThis` properties.

6. Each ES module has its **own module environment**. Classic scripts share one global environment, so top-level `var` can collide on the global object; modules do not export top-level bindings onto `window` unless you do so explicitly.

## Compare and contrast

1. **Lexical:** free vars resolve by where the function is written. **Dynamic:** would resolve using the caller’s environment. JS uses lexical for variables (`this` is a different, mostly call-site rule).

2. **Function scope:** binding visible throughout the enclosing function (`var`, params). **Block scope:** confined to nearest `{ }` (`let`/`const`). Blocks do not create `var` scopes.

3. Top-level **`var`:** global binding **and** usually a `window`/`globalThis` property. Top-level **`let`:** global binding in classic scripts, **not** a `globalThis` property; cannot redeclare in the same scope.

4. **Classic script:** shared global environment; top-level `var`/function become global-object props; sloppy unless `"use strict"`. **ES module:** own module scope, always strict, top-level bindings stay module-local, top-level `this` is `undefined`.

5. **Shadowing:** declare a new inner binding with the same name (outer still exists, hidden). **Reassigning:** update the outer binding itself (no new binding). Wrong diagnosis often: “I thought I mutated outer, but I shadowed.”

6. **Scope chain:** “Which variables can I see / which binding is this name?” **Call stack:** “Who called me / what frames are active?”

7. **Implicit global:** accidental undeclared assignment creating `globalThis.x`. **Explicit `globalThis.x = …`:** intentional attach to the global object — same place, different intent and reviewability.

## Predict the output

1. **Logs `1`.** `inner` is defined at top level; its outer lexical env is global `x = 1`. Calling it from `outer` does not put `outer`’s `x` on `inner`’s chain.

2. **`ReferenceError` (TDZ).** Function `f` has its own `let a`. At `console.log(a)`, that inner binding exists but is uninitialized — lookup does not fall through to outer `'outer'`.

3. **Logs `2`.** Both `var x` declarations are the **same** function/global binding; the block does not create a new `var` scope.

4. **Logs `2`, then `1`.** Inner `let y` is a real block shadow; after the block, outer `y` is visible again.

5. **`undefined`, then `10`.** `var a` is hoisted to function scope as `undefined`. With `flag === false` the assignment never runs; with `true` it assigns `10`. No `ReferenceError`.

6. **`ReferenceError`.** Strict mode forbids undeclared assignment — no implicit global.

7. **Logs `1`.** Sloppy undeclared `x = 1` creates `globalThis.x`; then reading it prints `1`.

8. **Logs `'outer'`.** `one` was defined where `value` means the outer binding; `two`’s local `value` is irrelevant to `one`.

9. **Logs `1`, `2`, `1`.** Each `outer()` call creates a **new** environment with its own `count`. `a` and `b` are independent closures.

## Debugging

1. **Diagnosis:** `var i` is one shared function-scoped binding. Handlers close over that binding; after the loop, `i === buttons.length`.  
   **Fix:** `for (let i = 0; …)` (per-iteration binding), or an IIFE/`schedule(i)` that captures a per-call parameter, or `.forEach((btn, i) => …)`.

2. **Misconception:** treating an ES module export like a classic-script global on `window`. Module bindings are **module-scoped**; they do not become `window`/`globalThis` properties. Import the export, or explicitly assign if a global is required.

3. **Wrong:** reassigning the `const` binding `user` (throws in modules/strict). Mutability of the **object** ≠ reassignability of the **binding**.  
   **Fix under `const`:** mutate in place, e.g. `user.name = 'Anon'` or `Object.assign(user, { name: 'Anon' })`, or redesign to return a new object and update whatever holds the reference.

4. **Brittle:** depends on sloppy implicit globals / load order; `readConfig` may run before assignment or against a polluted global.  
   **Review fix:** declare and export/import `API_URL` (or inject config); never rely on undeclared cross-file assignment.

## Application

1.
```js
var a;
if (true) {
  a = 1;
  let b = 2; // or const b = 2 — block-scoped, does not leak
}
console.log(a); // 1
```
`a` stays function/global-visible; `b` dies with the block.

2.
```js
function makePrefixer(prefix) {
  return (name) => prefix + name;
}
```
**Why:** the returned function is a **closure** over the lexical binding `prefix` from `makePrefixer`’s environment.

3. Approaches: (a) alias before shadowing — `const outerConfig = config;` then inner uses `outerConfig`; (b) avoid declaring inner `config` — use a different inner name; (c) pass outer config as a parameter. Goal: stop the inner declaration from being the nearest binding.

4.
```js
let secret = 42; // classic script top-level, or any module top-level
console.log(globalThis.secret); // undefined — binding exists, not a global-object property
```

## Interview questions

1. **Spoken:** “Lexical scope means a free variable resolves by where the function is written in the source, walking outer environments — not by who called it.”  
   **Follow-ups:** Dynamic scope would use the caller’s locals; JS doesn’t for variables. `this` is mostly call-site determined — separate from the variable scope chain.

2. **Spoken:** “Function scope (`var`) is visible for the whole function even inside `if`/`for`. Block scope (`let`/`const`) stops at `{ }`. That matters in loops: one shared `var i` vs per-iteration `let i` for async callbacks.”  
   **Follow-ups:** `var` → one binding, callbacks see final `i`. `let` in `for` → new binding each iteration; each closure keeps that iteration’s `i`.

3. **Spoken:** “Engine looks in the current lexical environment, then follows the outer link until it finds the name or throws. Nested functions don’t copy values for lookup — they walk that chain when the identifier runs.”  
   **Follow-ups:** After return, the function still references those environments (closure), so the chain remains reachable.

4. **Spoken:** “Implicit globals are undeclared assignments in sloppy mode that become properties on the global object. Prevent with always declaring, modules (strict), and `no-undef`.”  
   **Follow-ups:** Strict → `ReferenceError`. ESM → always strict + module scope, so you also don’t accidentally share top-level bindings across files.

5. **Spoken:** “`globalThis` is the portable global object. Classic-script top-level `var`/function often appear on it; top-level `let`/`const` are global bindings but not properties; module top-level bindings aren’t global at all.”  
   **Follow-ups:** Same table: script vs module for `var`/`let` visibility and `window` attachment.

6. **Spoken:** “Shadowing is an inner declaration of the same name; lookup stops there. Outer still exists.” Example: `const x = 1; function f() { const x = 2; console.log(x); }` — juniors mutate/log “the wrong `x`” or think the outer was deleted.

## Connections

1. Closures are functions that keep a reference to their **outer lexical environments**. Lexical scope defines which bindings that link can see; without lexical nesting + retained environments, “use outer vars after return” wouldn’t work.

2. `var i` in a loop is **one** function-scoped binding. Closures capture that binding (live). When async callbacks run, they all read the final value — the shared scope fact closures expose.

3. Module scope means config is **imported/exported**, not assumed on `window`. You think in explicit dependencies and encapsulation instead of accidental shared globals.

4. **Scope chain:** identifier → binding in nested environments (compile-time nesting). **Prototype chain:** property name → object then `[[Prototype]]` (runtime object identity). Different structures answering different lookups.

5. **TDZ / hoisting vs pure scope:** same-scope early `let` access, or `console.log(a); let a` inside a function that shadows outer `a`, are time-of-init issues (binding exists, uninitialized). Pure scope-boundary issues are “which environment owns the name” (`var` leaking from `if`, module vs `window`). Clue: error says “before initialization” → TDZ; binding missing entirely or wrong environment → scope boundary.
