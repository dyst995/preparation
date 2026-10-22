# Creational Design Patterns

## What you need to know

Creational patterns answer **who creates the object, how many exist, and how it is assembled**. They do not describe what the object *does* after it exists (structural / behavioral). Interviews want a name, the JS/Nest stand-in, and **when you would not use it**.

Curriculum checklist this unit completes:

- **Singleton** — one instance + a global access point; JS **module cache** as the honest singleton; Nest **default provider scope is singleton**
- Hidden dependencies, test pain, **REQUEST vs DEFAULT**; OK for config/logger, a **lie** for per-request user
- **Factory / Factory Method** — caller does not `new` the concrete type; Nest `useFactory` / `useClass`; payment factory (Bank of Georgia vs Flitt)
- **Builder** — stepwise construction; contrast with a **typed options object**; TypeORM **QueryBuilder**
- **Prototype** — clone; `Object.create` / `structuredClone`; rarely the interview winner
- **Abstract Factory** — family of related products; only as contrast with Factory Method
- How they differ, when **not** to use, 30–60s spoken answers for Singleton and Factory

Prerequisite: **modules** (evaluated once, cached exports). Nest DI details live in the Nest track; this unit is the *pattern* view of the same machinery.

---

## Singleton

### What it is / why it exists

Singleton guarantees **at most one instance** of a type **and** a **well-known way to get it**. Textbooks show a private constructor plus `getInstance()`. That is the definition. It is usually the **wrong implementation** in JavaScript.

It exists for process-wide resources: parsed config, a logger, a DB **pool**. Creating them twice is wasteful or wrong. The cost is **shared mutable state** and **hidden coupling** — callers that reach for the instance are wired to it without a constructor parameter.

### The natural JS singleton: module scope

A module is evaluated **once** per resolved path. The runtime **caches** exports (CJS `require` cache; ESM module record). Two importers get the **same** object / the **same** bindings. You do not need a class.

```ts
// config.ts — evaluated once; every import shares this object and this `let`
export const appConfig = { env: process.env.NODE_ENV ?? 'development' };

let requestCount = 0;
export function bump(): number {
  requestCount += 1;
  return requestCount;
}
```

`bump()` in file A and file B increment the **same** `requestCount`. That is Singleton, implemented by the language.

Classic class form (know it, rarely write it in Node):

```ts
class Logger {
  private static instance: Logger | null = null;
  private constructor() {}
  static getInstance(): Logger {
    return (Logger.instance ??= new Logger());
  }
}
```

`Logger.getInstance()` is a **hidden dependency**. Tests cannot swap it without patching the class. A module-level `let` has the same sharing, but the import graph at least shows the coupling.

### Nest default scope **is** Singleton

`@Injectable()` with no scope option is **`DEFAULT`**: **one instance for the application lifetime**. Nest constructs it at bootstrap (or lazily) and injects **that same object** everywhere the token is requested.

```ts
@Injectable() // singleton — one PaymentsService for the process
export class PaymentsService {
  charge(amount: number) {
    /* no per-request fields on `this` */
  }
}
```

| Scope | Lifetime | Use |
|---|---|---|
| `DEFAULT` (singleton) | One instance per app | Stateless services, config, logger, repositories |
| `REQUEST` | New instance per inbound HTTP request | Per-request context you refuse to pass as a parameter |
| `TRANSIENT` | New instance **every injection** | Almost never; must not share identity |

**Scope bubbling:** a provider that injects a `REQUEST`-scoped dependency becomes request-scoped itself (no request instance exists at singleton construction). That can instantiate a whole tree per request. Prefer **passing the user as an argument**, `@Req()` / a param decorator, or `AsyncLocalStorage` / `nestjs-cls`.

### When it is OK vs when it is a lie

**OK** — process-wide, no request identity on `this`: config (`ConfigService`), logger, the **pool** (not “the current connection’s user”), caches keyed by *data*.

**A lie** — you stored **request identity** on the singleton:

```ts
@Injectable() // still one instance for the whole Node process
export class AuthContext {
  userId: string | null = null; // concurrent requests smash this field
}
```

Request A sets `userId = 'alice'`, request B sets `'bob'`, A reads and charges **bob**. Not a rare race in Node: one thread, overlapping async work, **shared object**.

**Do not use** for per-user / per-request / per-tenant state; for anything tests must replace if the only access is `getInstance()`; as “one instance in the company” — it is **one per process**. Three Node instances = three singletons; Redis/DB is the shared store. “I might need it anywhere” is an ambient global, not a design.

### How to say it (30–60 seconds)

> Singleton means one instance and a well-known access point. In JavaScript the honest version is module scope — the file runs once and the cache *is* the singleton. Nest providers are singleton by default, which is correct for stateless services, config, and loggers. The trap is putting per-request data like the current user on that instance: concurrent requests share it, so you leak or swap users. I would not hand-roll `getInstance()` in Nest; I let the container own the lifetime so tests can `useValue` a fake.

---

## Factory / Factory Method

### What it is

A factory is a place **other than the caller** that **chooses and constructs** the concrete type. The caller depends on an **abstraction** (`PaymentGateway`) and never writes `new BogGateway()`.

Interviews mix three names — keep them straight:

| Name | What it creates | Typical TS shape |
|---|---|---|
| **Simple factory** (not official GoF) | One product; `switch` / config | `createPaymentGateway(provider)` |
| **Factory Method** | One product; a class defers `new` to a subclass | `abstract createChannel()` |
| **Abstract Factory** | A **family** of products that must match | `createEmail()` + `createPush()` on one factory |

Most Nest/Node code is a **simple factory** or DI **`useFactory` / `useClass`**. Factory Method (subclass the creator) is the textbook drawing; say it if they ask GoF, then map it to DI.

### Why it exists

Concrete types change: VetApp charged via **Bank of Georgia**, Wizer via **Flitt**. Checkout should not import either SDK. The factory (or Nest module) is the **only** file that knows `new`. That localizes vendor differences and lets tests inject a fake.

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

function createPaymentGateway(provider: 'bog' | 'flitt'): PaymentGateway {
  return provider === 'flitt' ? new FlittGateway() : new BogGateway();
}

const gateway = createPaymentGateway('flitt'); // caller never `new`s a vendor
await gateway.charge(1000, 'GEL');
```

Keep it this small. **Adapter** is the *shape* mismatch of the two APIs; **Factory** is *which* adapter you construct.

### Factory Method (GoF shape)

```ts
abstract class Notifier {
  abstract createChannel(): { send(msg: string): void };
  notify(msg: string) {
    this.createChannel().send(msg); // shared flow; subclass picks product
  }
}
class EmailNotifier extends Notifier {
  createChannel() {
    return { send: (msg: string) => console.log('email', msg) };
  }
}
```

The **creator** owns the algorithm; subclasses only decide the product. In Nest you almost never subclass a creator — you **inject** the product. Same decoupling, less inheritance.

### Nest: `useFactory` / `useClass` / `useValue`

```ts
{
  provide: 'PaymentGateway',
  inject: [ConfigService],
  useFactory: (config: ConfigService): PaymentGateway =>
    config.get('PAYMENT_PROVIDER') === 'flitt' ? new FlittGateway() : new BogGateway(),
}
{ provide: 'PaymentGateway', useClass: FlittGateway }           // wiring time
{ provide: 'PaymentGateway', useValue: { charge: async () => ({ id: 'fake' }) } } // tests
```

`useFactory` **is** a factory: Nest calls it once for a singleton token (per request if the provider is request-scoped). The controller `@Inject('PaymentGateway')` never sees `new`.

**Do not use** when there is **one** concrete class that will not be swapped (`new` in the composing module is enough); when a `switch` exists only to look like a pattern; to hide a 40-field constructor (Builder / options object); as a synonym for **Strategy** — factory *creates*; strategy is *already in hand* and you pick which algorithm to run.

### How to say it (30–60 seconds)

> A factory stops the caller from `new`-ing a concrete type. Checkout asks for a `PaymentGateway`; a function or Nest `useFactory` reads config and returns Bank of Georgia or Flitt. The point is swapping implementations — and fakes in tests — without rewriting the charge flow. I would not introduce a factory for a single class that never changes. Factory Method is one product with the choice in a subclass; Abstract Factory is a matching family of products, which I almost never need because the Nest module already wires the set.

---

## Builder

Builder constructs a **complex object in steps**, then `build()` (or `getMany()`) produces the result. Steps **chain**. The product can be invalid until enough steps have run — validation lives at the end, not in a 12-argument constructor.

Telescoping constructors (`new Mail(to, subject, body, cc, bcc)`) and boolean soup (`new Query(true, false, true)`) do not scale. Builder names each part and lets **order** / **optional steps** vary without exploding overloads.

### Contrast: options object (usually better in TypeScript)

```ts
type Mail = { to: string; subject: string; body: string; cc?: string[] };
function sendMail(opts: Mail) { /* ... */ }
sendMail({ to: 'a@b.c', subject: 'Hi', body: '...' });
```

A **typed options object** already names fields and type-checks at the call site. Prefer it when the object is a **data bag**. Reach for a Builder when steps are **imperative** (join, then filter, then page), you need a fluent DSL, or construction talks to something else (SQL AST).

```ts
class MailBuilder {
  private draft: Partial<Mail> = {};
  to(email: string) { this.draft.to = email; return this; }
  subject(s: string) { this.draft.subject = s; return this; }
  body(b: string) { this.draft.body = b; return this; }
  build(): Mail {
    const { to, subject, body } = this.draft;
    if (!to || !subject || !body) throw new Error('incomplete mail');
    return { to, subject, body, cc: this.draft.cc };
  }
}
new MailBuilder().to('a@b.c').subject('Hi').body('...').build();
```

**Footgun:** if `build()` returns the **same mutable draft** and you reuse the builder, later `to()` calls mutate a mail you already sent. `build()` should copy, or the builder should be single-shot.

### TypeORM QueryBuilder (name it; do not recite a novel)

`repository.find({ where, relations, take })` is an **options object**. When filters are **dynamic**, joins need extra `ON` conditions, or you need `GROUP BY` / `COUNT`, TypeORM’s **QueryBuilder** is a Builder: each call adds a piece of SQL; `getMany()` materializes.

```ts
await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .where('appointment.status = :status', { status })
  .orderBy('appointment.scheduledAt', 'ASC')
  .take(20)
  .getMany();
```

Interview line: *QueryBuilder is Builder applied to queries; I use `find()` while the shape is static.*

**Do not use** for two or three fields (options object); for a query `find()` already expresses; for setters with no invariant at `build()`.

---

## Prototype (brief)

Prototype means **clone an existing object** instead of constructing from scratch — useful when setup is expensive or the instance *is* the template. In JavaScript people use language APIs, not a `clone()` class hierarchy.

```ts
const proto = { kind: 'animal', speak() { return this.kind; } };
const dog = Object.create(proto); // [[Prototype]] link — not a value copy
dog.kind = 'dog';

const original = { a: 1, nested: { b: 2 } };
const clone = structuredClone(original); // deep copy of data
clone.nested.b = 9; // original.nested.b still 2

const shallow = { ...original };
shallow.nested.b = 7; // original.nested.b is also 7 — same nested object
```

| API | What you get |
|---|---|
| `Object.create(p)` | New object whose **prototype** is `p` (shared via lookup) |
| `{...obj}` / `Object.assign` | **Shallow** own-enumerable copy |
| `structuredClone(obj)` | **Deep** clone of cloneable data (not functions / class methods) |

Rarely the interview winner. Say: *clone when the value already exists; factory when you choose a type; don’t confuse the prototype chain with Prototype the pattern.* `class` / `[[Prototype]]` is the **language** mechanism from the prototypes unit.

**Do not use** when construction is cheap; when you needed a **deep** copy and used spread; when you `structuredClone` a class instance and expect methods to survive.

---

## Abstract Factory (short — only for the contrast)

Abstract Factory builds a **family of related products** without naming concretes. If “prod” means production email + production push, you must not mix prod email with a mock push by accident.

```ts
interface NotificationFactory {
  email(): { send(to: string, body: string): Promise<void> };
  push(): { send(token: string, body: string): Promise<void> };
}
```

**Factory Method:** one product (`PaymentGateway`). **Abstract Factory:** several products that **belong together**. In Nest, `PaymentsModule` + `NotificationsModule` already compose that family — a GoF Abstract Factory class is almost never worth drawing. Mention it if they ask how it differs; do not lead with it.

**Do not use** when you only have one product type, or when the “family” is just “all my services” (that is a module).

---

## How they differ

| Pattern | Decision | JS / Nest stand-in | Do not use when |
|---|---|---|---|
| Singleton | How many + where to get it | Module cache; Nest `DEFAULT` scope | The data is per-request / per-user |
| Factory Method / simple factory | *Which* concrete class | `createX()`; `useFactory` / `useClass` | There is only one class forever |
| Abstract Factory | *Which family* of products | Rare; a Nest module wiring a set | You don’t have matching families |
| Builder | *How* to assemble many parts | Fluent API; TypeORM QueryBuilder | A typed options object is enough |
| Prototype | Copy an existing instance | `structuredClone` / `Object.create` | Construction is cheap and clear |

A factory **returns** a gateway; **Strategy** is “I already have an object and I pick which algorithm to run.” DI often does both: the container is the factory; the injected port is the strategy.

---

## Common mistakes and misconceptions

1. **Hand-rolling `getInstance()` in Nest.** The container already is the singleton registry — and tests can replace providers.
2. **“Singleton means one instance in the company.”** It means one per **process**. Three Node instances = three singletons.
3. **Storing `currentUser` on a singleton service.** Shared field + overlapping requests = crossed users. Fix: REQUEST scope, CLS, or pass the user in.
4. **Tests sharing module state.** A `let n = 0` in an imported module leaks across cases — same singleton.
5. **`new BogGateway()` inside a controller.** The controller now owns a vendor. Factory / `useClass` belongs in the module.
6. **Factory Method vs Abstract Factory mashed together.** One product vs a matching set.
7. **Builder for a 2-field DTO.** Options object. Conversely: a 12-arg constructor with no named steps.
8. **QueryBuilder as default.** `find()` while it stays readable.
9. **`Object.create` as a deep clone.** It sets `[[Prototype]]`. Spread is shallow. `structuredClone` is deep data, not methods.
10. **`useFactory` is “only for async config.”** It is the DI spelling of a factory for any computed provider.

---

## Connections to other concepts

```
module evaluated once → cached exports → natural singleton
  → Nest DEFAULT provider scope (same idea, container-managed)

hidden getInstance() / module mutable lets → untestable / leaked state
  → constructor injection + useValue fakes

caller must not `new` BogGateway → factory / useFactory / useClass
  → swap BOG vs Flitt (Adapter is the API-shape problem)

many optional / ordered steps → Builder / fluent API → TypeORM QueryBuilder
  ↔ find({ ... }) options object when the shape is static

clone existing value → Prototype / structuredClone
  ↔ Object.create = prototype link, not a copy

family of products that must match → Abstract Factory
  ↔ Factory Method = one product → Nest module already wires the family
```

JS modules are why you almost never need a Singleton class. Nest DI is why you almost never need a Factory class. QueryBuilder is Builder you already ship.

---

## Interview perspective

You should be able to:

1. Define Singleton **and** say the JS module / Nest default-scope version in 30–60 seconds (rehearse the block above).
2. Explain why `currentUser` on a singleton is wrong, and name REQUEST / pass-the-user / CLS as fixes.
3. Define Factory without UML: *caller does not `new` the concrete type.* Rehearse the 30–60s payment version (BOG vs Flitt).
4. Contrast simple factory, Factory Method, and Abstract Factory in one sentence each.
5. Contrast Builder with a TypeScript options object; name **QueryBuilder** vs `find()`.
6. Say Prototype in two sentences (`structuredClone` vs `Object.create`) and that it rarely wins the round.
7. Answer “when would you **not** use this?” for Singleton, Factory, and Builder without pausing.

If they ask “what creational patterns do you use?”, do not list all five. Lead with **Nest singleton services**, **`useFactory` / payment gateway**, **QueryBuilder**. Mention Prototype / Abstract Factory only on follow-up.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
