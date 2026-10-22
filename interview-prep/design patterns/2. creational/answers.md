# Creational Design Patterns — Answers

## Core recall

1. They control **who creates** an object, **how many** exist, and **how it is assembled**. Structural patterns arrange objects that already exist; behavioral patterns describe communication / algorithms after construction.

2. **At most one instance** of the type, and a **well-known access point** to get it.

3. A module is evaluated **once** per resolved path; the runtime **caches** the exports (CJS `require` cache / ESM module record). Every import gets the same object and the same top-level bindings. That *is* the singleton.

4. **`DEFAULT` = singleton** — one instance for the application lifetime, injected everywhere that token is requested.

5. **OK:** process-wide, no request identity on `this` — config, logger, a connection **pool**, caches keyed by data. **A lie:** per-request / per-user / per-tenant fields (`currentUser` on a singleton service) — concurrent requests share and smash that state.

6. It keeps the caller from writing **`new ConcreteType()`**. The caller depends on an abstraction; construction lives in the factory / Nest module.

7. **Simple factory:** one product, a `switch` / function (`createPaymentGateway`). **Factory Method:** one product, a class defers `new` to a subclass (`abstract createChannel()`). **Abstract Factory:** a **family** of products that must match (`email()` + `push()` on one factory).

8. It names each construction **step**, lets optional steps / order vary, and can **validate at `build()`** instead of a 12-argument constructor or boolean flags.

9. **Builder** applied to SQL. `find({ where, relations, take })` is enough while the shape is **static**; QueryBuilder when filters are **dynamic**, joins need extra conditions, or you need aggregations.

10. **Clone** an existing object instead of constructing from scratch. APIs: **`Object.create`** (prototype link, not a copy), **spread / `Object.assign`** (shallow copy), **`structuredClone`** (deep copy of cloneable data).

11. A **matching family** of products, not a single product. Factory Method decides one concrete type; Abstract Factory decides a set that belongs together.

## Explain why

1. Both imports resolve to the **same cached module record**. Top-level `let`s and exported objects are created once; later imports reuse them. Mutation is visible to every importer in that process.

2. `getInstance()` is a **hidden global**. The class under test reaches into a static slot; you cannot pass a fake in the constructor. You have to patch the class or live with shared state across tests. Constructor / Nest injection makes the dependency **explicit** and `useValue`-replaceable.

3. Default scope = **one object for the process**. Request A writes `userId = 'alice'`, request B (overlapping async) writes `'bob'`, A continues and charges bob. Node is one thread with concurrent requests; a shared field is a race.

4. A singleton is built at startup, when **no request exists**. Nest therefore **promotes** (scope bubbling) the consumer to request-scoped so it can receive a per-request instance. That can instantiate a whole tree per request — a performance tax. Prefer passing the user, `@Req()`, or CLS.

5. Checkout would **own a vendor**. Switching VetApp’s Bank of Georgia to Wizer’s Flitt (or injecting a fake in tests) would rewrite the charge flow. The factory / `useFactory` is the only place that knows `new`.

6. TypeScript already names fields and optional properties at the call site. A 2–3 field data bag does not need a fluent class. Builder pays off when steps are **imperative** (join, then filter, then page) or you need a DSL / end-of-build invariant.

7. You almost never have a GoF “family of products” class. Nest **modules** already wire related providers together. Leading with Abstract Factory sounds like a vocabulary dump. Lead with a factory function / `useFactory`; mention Abstract Factory only as contrast with Factory Method.

8. Singleton is **one instance per process** (per runtime), not per cluster. Three Node instances = three loggers / three in-memory caches. Shared truth lives in Redis/DB, not in a Node singleton.

## Compare and contrast

1. **`DEFAULT`:** one instance for the app — stateless services, config, logger. **`REQUEST`:** new instance per HTTP request — per-request context; costs allocations and bubbles up the graph. **`TRANSIENT`:** new instance **every injection** — almost never; identity must not be shared.

2. **Module:** language-level cache, coupling visible via `import`, still shared mutable state. **`getInstance()`:** same sharing plus a **hidden** access path that tests cannot inject. In Nest, prefer the **container** over either hand-roll.

3. **Simple factory:** one function/switch, one product. **Factory Method:** creator class owns the flow; subclass implements `createX()`. **Abstract Factory:** several `create*` methods that must produce a **matching set**. Nest usually uses simple factory / `useFactory`, not subclassed creators.

4. **Factory** defers *which concrete class*. **Builder** defers *how a complex object is assembled* (steps, optionals, validation). Factory returns a type; Builder returns a fully built instance of a (usually known) type.

5. **Overloads / telescoping constructors:** unreadable argument lists and boolean soup. **Options object:** named fields, optionals, type-checked literals — default in TS for data bags. **Builder:** fluent steps when construction is a process (QueryBuilder), not a literal.

6. **Factory *creates*** the object (BOG vs Flitt). **Strategy** assumes you **already have** an object and pick which algorithm to run (`charge` vs `refund` policy). DI often does both: the container is the factory; the injected port is the strategy.

7. **`Object.create(p)`:** new object whose `[[Prototype]]` is `p` — lookup, not a value copy. **Spread:** shallow **own** copy; nested objects are shared. **`structuredClone`:** deep data clone; drops functions / class methods.

8. **`useFactory`:** function Nest calls to **compute** the instance (inject other providers, branch on config) — the DI spelling of a factory. **`useClass`:** Nest constructs that class for the token. **`useValue`:** inject this ready-made object (config, test fake).

## Predict the output

1. **Logs `1`.** `require` returns the **cached** `exports` object. `a.js` mutated `n` on that object; `b.js` sees the same object.

2. **Logs `true`, then `true`.** Both calls return the same instance; `id` is assigned once in that constructor.

3. **Logs `'alice'`.** ESM still has **one** module record per process. `store` is the same object for every import. This is also why a module-level `user` is a singleton lie under concurrent requests.

4. **Logs `2 9`.** `structuredClone` deep-copies `nested`; mutating the clone does not touch `original`.

5. **Logs `7 7`.** Spread copies the **top** object only; `nested` is the same reference, so the write is visible on `original`.

6. **Logs `flitt`.** Simple factory branches on the discriminator and returns the Flitt stub. Caller never named the concrete class.

7. **Logs `other@x.y`.** `build()` returned the **same** `draft` object. Later `to()` mutates it. `build()` must copy (or the builder must be single-shot).

8. **Logs `animal`, then `dog animal`.** First read walks `[[Prototype]]`. Assignment creates an **own** `kind` on `dog` (shadowing); `proto.kind` is unchanged.

## Debugging

1. **Diagnosis:** `AuthContext` and `OrdersService` are **singletons**. `place` writes `userId` on a process-wide field, `await`s, and another request overwrites it — **crossed charges**.  
   **Fix:** pass `userId` into `chargeCustomer` (no field on the service); or REQUEST-scope the context; or CLS / `AsyncLocalStorage`. Do not store request identity on `DEFAULT` providers. Also: if `AuthContext` were REQUEST-scoped, `OrdersService` would bubble to request scope — possible but a perf tax.

2. **Diagnosis:** `flags` is a **module singleton**. Test A mutates `premium`; test B imports the same object. Order-dependent failure.  
   **Fix:** reset in `afterEach`; don’t export a mutable bag (pure function + args); or inject flags so tests pass a fresh object.

3. **Smell:** controller **`new`s a concrete vendor** (Bank of Georgia). Cannot swap Flitt or a test fake without editing the controller.  
   **Fix:** inject `PaymentGateway`; register `useFactory` / `useClass` in the module. Controller only calls `gateway.charge(...)`.

4. **Why:** `build()` returns the **shared `draft`**. `second` is the same object as `first`; both end as `{ to: 'z@z.z', subject: 'Bye' }`.  
   **Fix:** `build()` returns a **copy** (`{ ...this.draft }`) and/or reset; don’t reuse one builder for two products without copying.

## Application

1.

```ts
export const config = { env: process.env.NODE_ENV ?? 'development' };
let n = 0;
export function bump() {
  n += 1;
  return n;
}
```

Two importers share it because the module is **cached after first evaluation** — one `config` object, one `n` binding per process.

2.

```ts
interface PaymentGateway {
  charge(amount: number, currency: string): Promise<{ id: string }>;
}
class BogGateway implements PaymentGateway {
  async charge(amount: number, currency: string) {
    return { id: `bog_${amount}` };
  }
}
class FlittGateway implements PaymentGateway {
  async charge(amount: number, currency: string) {
    return { id: `flitt_${amount}` };
  }
}
export function createPaymentGateway(provider: 'bog' | 'flitt'): PaymentGateway {
  return provider === 'flitt' ? new FlittGateway() : new BogGateway();
}
```

Caller: `createPaymentGateway(config.provider).charge(...)` — no `new BogGateway()` at the call site.

3.

```ts
{
  provide: 'PaymentGateway',
  inject: [ConfigService],
  useFactory: (config: ConfigService): PaymentGateway =>
    config.get('PAYMENT_PROVIDER') === 'flitt'
      ? new FlittGateway()
      : new BogGateway(),
}
```

4.

```ts
await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .where('appointment.status = :status', { status })
  .getMany();
```

Use `find({ where: { status }, relations: { vet: true } })` while the shape is static; QueryBuilder when conditions/joins become dynamic or you need aggregations.

## Interview questions

1. **Spoken:** Singleton means one instance and a well-known access point. In JavaScript the honest version is module scope — the file runs once and the cache *is* the singleton. Nest providers are singleton by default, which is correct for stateless services, config, and loggers. The trap is putting per-request data like the current user on that instance: concurrent requests share it, so you leak or swap users. I would not hand-roll `getInstance()` in Nest; I let the container own the lifetime so tests can `useValue` a fake.

   **Follow-ups:** Yes — `DEFAULT` is singleton. `currentUser` on the service is shared mutable state across overlapping requests. Testing `getInstance()` requires patching; injection is the fix.

2. **Spoken:** A factory stops the caller from `new`-ing a concrete type. Checkout asks for a `PaymentGateway`; a function or Nest `useFactory` reads config and returns Bank of Georgia or Flitt. The point is swapping implementations — and fakes in tests — without rewriting the charge flow. I would not introduce a factory for a single class that never changes. Factory Method is one product with the choice in a subclass; Abstract Factory is a matching family of products, which I almost never need because the Nest module already wires the set.

   **Follow-ups:** Factory Method = one product via subclass; Abstract Factory = a family that must match. Skip the factory when there is one stable class. Nest: `useFactory` / `useClass` / inject a token.

3. **Spoken:** I would not use Singleton for per-request or per-user data, for anything tests must replace through a hidden `getInstance()`, or as “one instance in the company” — it is one per **process**. Config and logger are OK because they are process-wide and do not store the current caller on `this`.

   **Follow-ups:** No, it does not magically sync across Node processes. Config/logger are OK because they have no request identity.

4. **Spoken:** Yes — TypeORM **QueryBuilder** is Builder: you chain joins, filters, paging, then `getMany()`. I still use `find()` when the query shape is static. I would not write a Builder class for a 3-field DTO; a typed options object is clearer.

   **Follow-ups:** Options object for data bags; QueryBuilder when construction is a stepwise query.

5. Lead with **Nest singleton services**, **`useFactory` / payment gateway** (BOG vs Flitt), **QueryBuilder**. Mention Prototype (`structuredClone`) and Abstract Factory only if they ask how Factory Method differs or how cloning works. Listing all five up front sounds like a flashcard.

## Connections

1. Module evaluation-once + export cache **is** the singleton. A `getInstance()` class duplicates what the language already did, with worse testability.

2. Nest’s container **owns lifetime** (singleton by default, REQUEST/TRANSIENT when you opt in) and **owns construction** (`useFactory` / `useClass` / `useValue`). Controllers depend on tokens, not `new` or `getInstance()`.

3. `find({ ... })` is an **options object** (named fields, static shape). QueryBuilder is **Builder**: each call is a step; `getMany()` materializes. Same contrast as DTO literal vs fluent construction.

4. Factory chooses **which** gateway object to construct. Adapter is why the two vendors **look different** (API shape, webhooks) and are wrapped behind `PaymentGateway`. You often have both: adapt each vendor, factory-pick which adapter.

5. Hidden access (`getInstance()`, a mutated module `let`) means tests cannot substitute a fake through the constructor and **share state** across cases. Explicit injection + `useValue` makes the dependency visible and resettable.
