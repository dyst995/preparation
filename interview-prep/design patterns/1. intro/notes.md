# Intro to design patterns

## What you need to know

A **design pattern** is a **named, reusable shape** for a recurring design problem — not a library, not TypeScript syntax, not “the architecture.” Later units teach specific patterns; this one is the map so you do not treat them as a vocabulary quiz.

Curriculum this unit completes:

- What a design pattern is (problem + context + trade-offs, not a UML copy)
- Why shared names exist (communication, not cargo-cult)
- Three categories: **creational / structural / behavioral**
- **Composition over inheritance** in JS/TS (prototypes and classes exist; composition is still the default)
- Patterns vs language features vs libraries vs architecture
- When to name a pattern in an interview vs cargo-cult
- SOLID **only as it relates**: SRP, OCP, DIP (not a SOLID textbook)
- Anti-patterns: god object, singleton soup, premature abstraction

---

## What a design pattern is

### What it is

A documented **solution shape** for a problem that keeps recurring: how objects (or modules, functions, components) are **created, connected, or talk**. Classic source: Gang of Four (*Design Patterns*, 1994) — 23 OO patterns. You do **not** memorize all 23. You need the idea, the three categories, and the handful fullstack/RN interviewers probe.

A pattern has a **problem**, a **context** (when it fits), a **structure** (who talks to whom), and **trade-offs**. Copying a class diagram without the trade-off is not knowing the pattern.

### Why it matters

Without the idea you reinvent the same wiring or sprinkle GoF names on random classes. With it you can say: “this is Strategy — the algorithm is injected; the caller does not `switch` on type.” Faster than walking a call graph.

### How it works

You already use patterns whether you named them or not.

```ts
type Charge = (amountCents: number) => Promise<void>;

async function checkout(charge: Charge, amountCents: number) {
  await charge(amountCents);
}
```

`checkout` does not know Stripe vs Apple Pay. That **shape** is Strategy (behavioral). Nest does it with constructor injection; React with a `pay` prop or a hook. The **name** is optional; the **decoupling** is the point.

### Practical consequences

- Patterns are **design**, not runtime magic. TypeScript does not “run a Factory.”
- The same pattern looks different as Java classes vs TS functions + modules.
- A pattern that fights the language (deep React class hierarchies) is usually the wrong tool.

### Interview angle

**Named solution to a recurring design problem, with trade-offs.** Then one example from *your* stack (Nest DI, payment Adapter, React composition) — not 23 names.

---

## Why names exist

### What it is

The name is a **compression of a conversation**. “Adapter” means: wrap an incompatible API so callers depend on *our* shape. You do not walk `StripeSdk` vs `PaymentPort` line by line first.

### Why it matters

Interviews, PRs, and onboarding need shared vocabulary. A precise name saves time **if both people mean the same shape**. A fake name (“I used a Factory” for `new Foo()`) costs trust.

### How it works

Names point at **roles**. Adapter: translate *their* API into *ours*. Repository: persistence boundary, not the domain. Observer: notify dependents on change. Facade: a narrow door in front of a messy subsystem. The compiler does not care; **humans** do.

### Practical consequences

Use the name in design discussion when the shape is non-obvious. Do not rename `UserService` to `UserFactorySingletonFacade`. If you cannot state the **problem** the name solves, you are decorating, not designing.

### Interview angle

Drop a name only if you can answer immediately: **what problem, what is swapped/wrapped, what I would not use it for.** Follow-ups kill empty name-drops.

---

## Three categories

### What it is

GoF groups patterns by **what they vary**:

| Category | Question it answers | Examples this track covers |
| --- | --- | --- |
| **Creational** | How is this object **created** and **lifetime-managed**? | Singleton, Factory, Builder |
| **Structural** | How are objects **composed** so APIs fit / subsystems hide? | Adapter, Decorator, Facade, Proxy |
| **Behavioral** | How do objects **communicate**, or how does an algorithm **vary** independently of clients? | Observer, Strategy, Command, Chain of Responsibility, Template Method, State |

### Why it matters

“What kinds of patterns are there?” is a common opener. The three buckets are the expected map. They also stop you calling every wrapper a Factory.

### How it works

Same feature, three *kinds* of decision:

```ts
const logger = { info: (m: string) => console.log(m) }; // creational: module-as-singleton

type PaymentPort = { charge(cents: number): Promise<void> };
const stripeAdapter: PaymentPort = {
  charge: (cents) => stripe.charges.create({ amount: cents }), // structural
};

type Notify = (msg: string) => void;
function onUserCreated(notify: Notify) { notify('welcome'); } // behavioral
```

Nest (preview): **provider scope / factories** creational; **Stripe / native SDK adapters** structural; **guards → interceptors → pipes → handler** a request **chain** (behavioral). React: you rarely `new` UI (creational is often the module or a store); **wrapping** a native map view is structural; **store subscriptions** and **strategy-by-variant** are behavioral.

### Practical consequences

- Pain is **construction** (`new`, optional deps, test doubles) → creational.
- Pain is **shape mismatch** (third-party SDK, legacy DTO) → structural.
- Pain is **`switch` on type / copy-pasted workflows / event fan-out** → behavioral.

### Interview angle

Three categories in one breath, then **one Nest or React example each**. Do not list 23. If they say Bridge: later unit — **GoF Bridge ≠ React Native Bridge**.

---

## Composition over inheritance

### What it is

**Inheritance:** B *is-a* A; B reuses A by extending. **Composition:** C *has-a* collaborator (or is given a function) and **delegates**. “Composition over inheritance” means prefer **has-a / inject-a / pass-a-function** unless you have a genuine stable is-a.

JS/TS **has** prototypes and `class extends`. That does not make deep hierarchies the default. Prototypes are how JS implements objects; **your design** should still compose.

### Why it matters

Inheritance couples **lifetime, API surface, and reuse**. Change the base, subclasses break. `UserService extends Logger` now *is* a logger. JS has no multiple inheritance; mixins get messy. React class-component inheritance for reuse is a known trap; hooks and `children` are composition.

### How it works

```ts
class Logger { log(msg: string) { console.log(msg); } }
class UserService extends Logger { // smell: is-a for reuse
  createUser() { this.log('created'); }
}
```

```ts
type Logger = { log(msg: string): void };
class UserService {
  constructor(private readonly logger: Logger) {} // default: has-a
  createUser() { this.logger.log('created'); }
}
```

In Nest that constructor is **DI** — composition by the container. In React you wrap (`<Page>{children}</Page>`), pass props, or call hooks (`useAuth()`). You do not `class HomeScreen extends Page`. The prototype chain still exists under `class`; you do not use it as the reuse strategy. `checkout(charge)` is composition too — no `abstract class` required.

### Practical consequences

- Test by passing `{ log: jest.fn() }` — no subclass, no `super`.
- Cross-cutting reuse belongs in **injected collaborators**, Nest guards/interceptors, or hooks — not base classes.
- `extends` is still fine for **framework types** (`Error`, Nest `ExceptionFilter`) or a **narrow, stable** is-a (`extends HttpException`). That is not a five-level domain tree.

### Interview angle

> “JS has prototypes and classes, but for app design I compose: inject collaborators, pass functions, wrap React components. Nest DI is composition. Inheritance for reuse in UI or services usually becomes a fragile base class.”

Follow-up they like: **Square extends Rectangle** (LSP) — a `Rectangle` API that resizes width independently lies about a square. Composition would not pretend a square *is* a resizable rectangle.

---

## Patterns vs language features vs libraries vs architecture

### What it is

Four layers people mash together:

| Layer | What it is | Example |
| --- | --- | --- |
| **Language feature** | JS/TS syntax / semantics | `class`, prototypes, modules, closures, generics |
| **Design pattern** | A *shape* you could implement in many languages | Strategy, Adapter, Observer |
| **Library / framework** | Concrete implementation + opinions | Nest DI, React, Redux, RxJS |
| **Architecture** | System-level boundaries and rules | Modular monolith, feature modules, RN app shell |

### Why it matters

“React *is* Observer” or “Nest *is* DI” is sloppy. React **uses** observer-like subscriptions; Nest **implements** DI as a framework feature. Architecture **uses** many patterns; it is not one pattern.

### How it works

- **ES modules are singletons** (one instance per graph). Language + runtime implementing the Singleton *shape* with no `getInstance()`.
- **Closures** can hold private state for a Factory. Closure is the language; Factory is the design.
- **`@Injectable()`** is a **library** applying DI (pattern + DIP).
- **TypeORM `Repository`** is a library class named after a pattern. `repository.find` does not mean you understood it if the service still mixes SQL and HTTP.
- **“We use microservices”** is architecture. **Adapter** at the payment boundary is a pattern *inside* it.

### Practical consequences

Do not reimplement a container or React Context to “show Observer.” Use the library; **name the shape** if it helps. Redux is a state library, not “the architecture.” Modules/closures/classes = language; the *decision* to have one shared instance or a swappable algorithm = pattern.

### Interview angle

**“DI is the pattern; Nest is how we do it here. The RN Bridge is platform architecture, not GoF Bridge.”** That split shows you will not mix vocabularies.

---

## When to name a pattern in an interview vs cargo-cult

### What it is

**Naming:** the GoF (or common) name is the shortest accurate description. **Cargo-cult:** the *ceremony* of a pattern — extra interfaces, abstract factories, singletons — **without the problem**, or because a blog used the name.

### Why it matters

Seniors **delete** unnecessary abstraction as much as they introduce it. Interviewers listen for: two real implementations, a test seam, a third-party boundary — or theater.

### How it works

Name it when the interviewer asks, when a PR needs a shared word (“this adapter exists because Stripe’s payload is not our `Payment`”), or when choosing among options (“Strategy vs a `switch`” — and you can say when the `switch` wins).

Do **not** call `userService.create` “the Command pattern.” Do not ship `AbstractPaymentFactoryFactory` for one Stripe client.

Cargo-cult tells: interface + one impl + no test double; Singleton for “easy global access”; Strategy for a branch that will never get a third variant; a Facade that only forwards.

### Practical consequences

Default interview list: **DI, Repository, Adapter, Observer, Strategy, Chain of Responsibility (Nest pipeline).** Name others only if the follow-up needs them.

YAGNI: the **second** payment provider is when a port + Adapter earns its keep. The first can be a concrete client, or a thin interface if you already know a second is coming.

### Interview angle

> “I name a pattern when it compresses the design. I don’t introduce Factory/Strategy/Singleton until I have a real variation, a test seam, or a lifetime problem. In Nest a lot of this is already DI.”

If they push “so you don’t use patterns?”: you **do** — composition, DI, adapters at boundaries — you just do not **theater** them.

---

## SOLID only as it relates (SRP, OCP, DIP)

Not a SOLID unit. Three letters that **explain why** several patterns exist. ISP/LSP are out of scope except LSP as a reason inheritance is dangerous (Square/Rectangle).

### What it is

- **SRP:** a module has **one reason to change**. `UsersController` should not also send email, charge cards, and know SQL.
- **OCP:** open for **extension**, closed for **modification**. Add a notifier without editing a 200-line `switch` in `UserService`.
- **DIP:** high-level policy depends on an **abstraction**, not a concrete SDK. `CheckoutService` depends on `PaymentPort`, not `Stripe`.

### Why it matters

Patterns are often **how** you get these in code. Strategy → OCP. Adapter → DIP. Facade → SRP at a boundary.

### How it works

```ts
interface Payments { charge(cents: number, source: string): Promise<void>; }

@Injectable()
class CheckoutService {
  constructor(private readonly payments: Payments) {} // DIP; Nest binds StripeAdapter
}
```

OCP: add `PaypalAdapter`; `CheckoutService` does not change. SRP: checkout does not parse Stripe webhooks.

### Practical consequences

- One interface per vanity class is **not** DIP; DIP needs a **real** abstraction at a **boundary**.
- OCP is not “never edit a file.” It is “don’t reopen a central `switch` for every new variant” *when variants are expected*.
- SRP is not “one function per file.” A Nest `PaymentsModule` can hold several small classes that share **one reason**.

### Interview angle

**SRP → split god services / Facade. OCP → Strategy/Decorator. DIP → DI + ports.** Then stop. Do not recite all five letters unless asked.

---

## Anti-patterns

### What it is

A recurring *bad* solution that looks reasonable until it hurts.

**God object.** One type knows too much: auth, payments, email, navigation. Every new feature lands there. Opposite of SRP.

**Singleton soup.** Everything is a process-wide instance **and** everything imports it. Nest’s **default provider scope is singleton** — fine for **stateless** services. Soup is **shared mutable state** + **hidden imports**: `AppState.getInstance().user`, `import { db } from './db'`, a store every screen writes. Tests and request isolation die.

**Premature abstraction.** Interface, factory, and base class **before** a second implementation or a real seam. You pay indirection for a variation that never arrives (`DtoMapperFactoryProvider` with one call site).

### Why it matters

Interviewers would rather hear you **refuse** a Singleton than watch you “apply patterns.” God objects are how a Nest rewrite of a PHP monolith fails again. Soup is untestable ambient state. Premature abstraction hides the business rule behind types that never earn a second implementation.

### How it works

God object: every requirement adds a method to `AppService` / `useApp()`. The class *is* the architecture.

Singleton soup: module-level `let currentUser` imported from 40 files. Nest singleton + **request-scoped user on `REQUEST`** is the opposite — lifetime is explicit. A singleton that **caches per-user data with no key** is soup (and a prod bug).

```ts
interface UserRepo { find(id: string): Promise<User | null>; }
class TypeormUserRepo implements UserRepo { /* only impl, never mocked */ }
class UserRepoFactory { static create() { return new TypeormUserRepo(); } }
```

Three types, zero flexibility. Nest-injected TypeORM was enough until a second persistence or a test double was real.

### Practical consequences

- Split god objects by **reason to change** (`PaymentsModule`, `UsersModule`), not a dump into `app.service.ts`.
- Prefer **constructor injection** over ambient singletons so tests bind a fake. Module-as-singleton for *stateless* helpers is normal.
- Add a port/adapter at a **real** boundary (third-party, native SDK, DB). Not for a function called once.

### Interview angle

> “God object is failed SRP. Singleton soup is failed DIP plus hidden mutable globals — Nest default singleton is not automatically that. Premature abstraction is OCP before a second variant exists.”

---

## Common mistakes and misconceptions

- **“Patterns are classes.”** In TS they are often functions, modules, components, or Nest providers.
- **“I use patterns” = listing 23 names.** They want **when you would not**.
- **“Composition means no classes.”** Classes are fine; **`extends` for reuse** is what you default away from.
- **“Nest singleton scope is an anti-pattern.”** Stateless singleton is the point. Soup is **shared mutable** + **no seams**.
- **“SOLID = patterns.”** SOLID is principles; patterns are *one* way to obey them.
- **“The RN Bridge is GoF Bridge.”** Different word (structural unit).

---

## Connections to other concepts

`problem + trade-off → named pattern → category (create / structure / behave)` · `composition (has-a, inject, wrap) → Nest DI and React children/hooks` · `DIP + Adapter → third-party / native SDK boundaries` · `OCP + Strategy → swap algorithm without editing the caller` · `SRP failed → god object` · `DIP failed + global mutable → singleton soup` · `OCP too early → premature abstraction` · `language (modules, closures) can implement a pattern without ceremony`

Next: [creational](../2.%20creational/notes.md), then structural, behavioral, then Nest- and React-specific units.

---

## Interview perspective

30–60 seconds:

> “A design pattern is a named shape for a recurring design problem — how we create, connect, or vary behavior — with trade-offs, not a library. GoF splits them into creational, structural, and behavioral. In TypeScript I default to composition: inject collaborators, pass functions, wrap React trees. Nest DI is that. I name a pattern when it compresses the discussion — Adapter at Stripe, Observer for events, Strategy when an algorithm is swapped — and I don’t add Factory/Singleton theater. SOLID shows up as SRP on module boundaries, OCP when we extend without editing a switch, DIP via ports. Failure modes: god services, singleton soup, premature interfaces.”

If they ask “what patterns do you use?” lead with **DI, Repository, Adapter, Observer, Strategy, Chain of Responsibility (Nest pipeline)**. Have one **CV story** where you *removed* an abstraction, not only added one.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
