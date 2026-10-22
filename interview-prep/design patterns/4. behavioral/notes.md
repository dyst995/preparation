# Behavioral design patterns

## What you need to know

**Behavioral** patterns are about **who talks to whom** and **how work is split** — not how objects are created (creational) or composed into a shape (structural).

Interview bar: name the pattern, draw the shape, give a TypeScript example from **your** stack, and say **when you would not use it**.

Curriculum this unit completes:

- Observer / Pub-Sub — EventEmitter, Nest `EventEmitter2`, React/Zustand; push vs pull; unsubscribe leaks
- Strategy — swap an algorithm behind an interface vs `if`/`else` ladders
- Command — request as an object (queue, undo, jobs); VetApp-style background job
- Chain of Responsibility — Nest pipeline: middleware → guards → interceptors → pipes → handler → interceptors → filters
- Template Method — skeleton in the base, hooks in the subclass; vs Strategy
- State — behavior follows internal status vs boolean soup
- Iterator (brief) — `for...of` / generators; Mediator (brief) — “everyone talks through me”

---

## What “behavioral” means

Creational: how do I get an instance. Structural: how do I compose objects. Behavioral: **how does this object react, delegate, or notify.**

The same Nest service can be created by DI, injected behind an interface, **and** emit an event or enqueue a job. In an interview, pick the pattern that matches the **problem they asked**, not every label that could apply.

```
created → creational | wrapped → structural
notifies / swaps algorithm / queues work / changes behavior with status → behavioral
```

---

## Observer / Pub-Sub

A **subject** keeps observers and **notifies** them on change. Observers depend on the event, not on each other’s internals.

**Observer** (classic): the subject holds listeners (`subscribe` / `unsubscribe` / `notify`). **Pub-Sub**: a **broker** (event bus, topic) sits in the middle; publishers never list subscribers. Same idea — **one-to-many notification without hard-coding dependents**. Node `EventEmitter` is Observer-shaped (listeners on one object). Nest `@nestjs/event-emitter` (`EventEmitter2`) is Pub-Sub-shaped (process-wide named events).

Without it, `AppointmentsService` would import `BillingService` and `NotificationsService` after cancel — a circular-dependency magnet. Emit `appointment.cancelled`; let billing and notifications subscribe independently.

### Push vs pull

| | **Push** | **Pull** |
|---|---|---|
| Subject sends | The new data | “Something changed” |
| Observer | Uses the payload | Calls `getState()` / reads a store |
| Typical | `emit('paid', { id, cents })` | Zustand: subscribe, then `getState()` |

Push fits a small, universal payload. Pull fits observers that need **different slices** of large state. Zustand is hybrid: the callback **receives** state (push) but you usually **select** a slice (pull-like).

### Stack examples

```ts
import { EventEmitter } from 'events';
const bus = new EventEmitter();
function onPaid(payload: { id: string }) {
  console.log('receipt', payload.id);
}
bus.on('paid', onPaid);
bus.emit('paid', { id: 'apt-1' }); // push
bus.off('paid', onPaid);           // same function reference
```

```ts
this.events.emit('appointment.cancelled', { id });

@OnEvent('appointment.cancelled')
handleCancel(payload: { id: string }) {
  return this.billing.refundForAppointment(payload.id);
}
```

Zustand `subscribe` and React `useSyncExternalStore` are Observer. `useEffect` must return unsubscribe or the screen leaks.

```ts
useEffect(() => {
  const unsub = useClinicStore.subscribe((s) => {
    if (s.status === 'expired') resetSession();
  });
  return unsub;
}, []);
```

### Memory leaks

The subject **retains** every listener. No unsubscribe → that React screen, socket handler, or REQUEST-scoped Nest listener **cannot be GC’d**.

- `emitter.on` in `useEffect` with no `emitter.off` in cleanup. `.on` returns the **emitter**, not an unsubscribe — unlike Zustand `subscribe`.
- Anonymous `bus.on('x', () => ...)` — you cannot `off` that function later.
- `@OnEvent` on a **singleton** is fine for process lifetime; registering on a global bus from a **REQUEST-scoped** provider without teardown is not.

Do not replace a single synchronous call with an event “for decoupling.” If there is **one** consumer and the producer **must** know the outcome (charge failed → booking fails), call it and await the Promise. Events hide the call graph — that is the point and the debugging cost.

---

## Strategy

A family of **interchangeable algorithms** behind one interface. The context holds a `Strategy` and calls it; the implementation can change at runtime or at DI wiring without rewriting the context.

```ts
// ladder: every new gateway edits this function
async function charge(method: 'bog' | 'flitt', cents: number) {
  if (method === 'bog') return bogCharge(cents);
  if (method === 'flitt') return flittCharge(cents);
  throw new Error('unknown method');
}

interface PaymentStrategy {
  charge(cents: number): Promise<{ ok: true } | { ok: false; reason: string }>;
}
class CheckoutService {
  constructor(private readonly gateway: PaymentStrategy) {}
  pay(cents: number) {
    return this.gateway.charge(cents);
  }
}
```

Add `StripePayment` as a class; `CheckoutService` does not change. Nest `{ provide: PAYMENT, useClass: BogPayment }` **is** Strategy (Bank of Georgia on VetApp, Flitt on Wizer). Same shape: **sort comparators**, **validation rules**, **retry/backoff**.

Put **shared** flow in the context (`pay` still logs / records the attempt). Define the interface around the **variation**. Two branches that will never grow are an `if`. Strategy swaps **how** a step is done — it does not store a request for later (Command) or retitle the whole object by mode (State).

---

## Command

A **request packed as an object**: receiver + action + args, with `execute()` (optionally `undo()`). You can queue, log, retry, undo, or send it across a process boundary. A function call disappears when it returns; a command **survives**.

```ts
interface Command {
  execute(): Promise<void>;
}
class SendConfirmationCommand implements Command {
  constructor(
    private readonly appointmentId: string,
    private readonly mailer: { sendConfirmation(id: string): Promise<void> },
  ) {}
  execute() {
    return this.mailer.sendConfirmation(this.appointmentId);
  }
}
```

You do not need that class in Nest. A **job payload** is the same idea:

```ts
await this.notificationsQueue.add('appointment-confirmation', {
  appointmentId: appointment.id,
});
// worker: execute(job.data)
```

VetApp: HTTP creates the appointment and **returns**. Confirmation email / payment reconciliation is a **command on a queue** — slow, retryable, **idempotent** (same `appointmentId` twice must not double-send). Do not `await` the third-party mailer in the request. Undo (keep small): store `{ execute, undo }` on a stack — not “emit the opposite event and hope.”

| | **Command** | **Strategy** | **Observer** |
|---|---|---|---|
| Object is | **This request** | **How** to do a step | **A listener** |
| Extra | Queue, retry, undo | Swap algorithm | Many dependents |
| Outcome | Job status | Caller awaits | Publisher usually does not wait |

If it runs **now**, in-process, once — a function call is enough. Command earns its keep with **indirection in time** (jobs) or **history** (undo).

---

## Chain of Responsibility

A request travels a **chain of handlers**. Each **handles**, **passes on**, or **handles and still passes**. The sender does not know who will run.

```ts
type Next = () => void;
type Middleware = (req: { user?: string }, next: Next) => void;

const auth: Middleware = (req, next) => {
  if (!req.user) throw new Error('401'); // stop
  next();
};
const log: Middleware = (_req, next) => next();

function run(chain: Middleware[], req: { user?: string }) {
  const dispatch = (i: number): void => chain[i]?.(req, () => dispatch(i + 1));
  dispatch(0);
}
```

Classic CoR (“first match wins”: support tickets, discount rules) **stops** after a hit. Express/Nest middleware usually runs **every** layer unless one short-circuits.

### Nest request pipeline (memorize)

This is the high-value interview mapping. Draw CoR (plus an onion for interceptors):

```
incoming request
  → middleware          (Express-level; omit next() → stop)
  → guards              (yes/no; false / throw → stop — auth, RBAC)
  → interceptors (pre)  (wrap; start timer)
  → pipes               (validate/transform DTO; throw → filters)
  → route handler       (controller → service)
  → interceptors (post) (shape response)
  → exception filters   (only if something threw)
  → response
```

| Layer | Question | Can stop? |
|---|---|---|
| Middleware | Transport (CORS, request id) before route metadata | Yes — omit `next()` |
| Guard | May this caller hit this handler? | Yes — `false` / throw |
| Interceptor | Wrap in + out (timing, map response) | Yes — skip `next.handle()` |
| Pipe | Is input valid / what type? | Yes — throw |
| Handler | Business entry | Throw → filters |
| Filter | How do we shape this error? | End of the error path |

Honest caveat: interceptors are **Decorator/onion** (before **and** after). Guards/pipes/middleware are closer to classic CoR (**pass or stop**). The **pipeline as a whole** is the Chain of Responsibility you should name.

Do not put RBAC in an interceptor, or response mapping in a guard. Auth in middleware “because it runs first” fails: middleware lacks handler metadata (`@Roles()`). Auth/RBAC belong in **guards**.

A chain of ten handlers for a flow that is always A→B→C is just a function. CoR pays off when **membership and order can change** (new guard, new pipe) without editing the sender.

---

## Template Method

The **algorithm skeleton lives in a base**. Subclasses fill **hooks** — they must not reorder the steps.

```ts
abstract class ExportJob {
  async run(): Promise<string> {
    const rows = await this.fetch();
    return this.serialize(this.map(rows));
  }
  protected abstract fetch(): Promise<Record<string, unknown>[]>;
  protected abstract map(rows: Record<string, unknown>[]): unknown[];
  protected serialize(data: unknown[]): string {
    return JSON.stringify(data);
  }
}
class VetCsvExport extends ExportJob {
  protected async fetch() { return this.repo.find(); }
  protected map(rows: Record<string, unknown>[]) { return rows.map((r) => r.id); }
  protected serialize(data: unknown[]) { return data.join('\n'); }
}
```

### Template Method vs Strategy

| | **Template Method** | **Strategy** |
|---|---|---|
| Variation | **Steps inside a fixed skeleton** | **The whole algorithm** |
| Mechanism | Inheritance (override hooks) | Composition (inject an object) |
| Order | Sacred (“always fetch → map → write”) | Not sacred; swap policies |
| TS default | Easy to overuse | Prefer this + DI |

Say: “Template Method is an **inheritance skeleton**. Strategy is an **injected algorithm**. I default to Strategy because Nest already composes with DI. I use Template Method when many jobs share a strict lifecycle and only the middle differs.”

If subclasses skip steps with empty overrides, or the base grows `hookA` / `hookB`, the skeleton is a lie — switch to Strategy or a function pipeline.

---

## State

An object’s **behavior changes with its internal status** — illegal combinations should be unrepresentable. Transitions are explicit.

```ts
type OrderStatus = 'pending' | 'paid' | 'cancelled';
class Order {
  constructor(private status: OrderStatus = 'pending') {}
  pay() {
    if (this.status !== 'pending') throw new Error(`cannot pay from ${this.status}`);
    this.status = 'paid';
  }
  cancel() {
    if (this.status === 'paid') throw new Error('use refund, not cancel');
    this.status = 'cancelled';
  }
}
```

Auth session is the same shape: `anonymous` → `authenticated` → `expired`. `logout` / `refresh` are legal **only in some states**. Full State objects (`AnonymousState.login(ctx)`) are worth it when each state has **non-trivial** behavior, not just a label.

```ts
if (isLoggedIn && !isExpired && hasToken && !isLoggingOut) { /* soup */ }
```

Booleans multiply: `2^n` combinations, most illegal (`isPaid && isCancelled`). One **discriminated status** makes `pay()` on a cancelled order a rejected transition. CV: orders, appointment booking, payment `initiated → authorized → captured | failed`, RN auth session. Do not keep parallel flags that contradict the enum. A truly independent flag (`darkMode`) is not a state machine.

---

## Iterator (brief)

**Iterator** is the protocol behind `for...of`: `next()` → `{ value, done }`. You almost never write the class. **Generators** (`function*`) produce iterators. Arrays, `Map`, `Set`, strings are iterable.

```ts
function* appointmentIds(rows: { id: string }[]) {
  for (const row of rows) yield row.id;
}
for (const id of appointmentIds([{ id: 'a' }, { id: 'b' }])) {
  // pull the next value when the loop asks
}
```

“Iterator lets the consumer pull items without knowing if they come from an array, a generator, or a cursor. `for...of` is the language feature; the pattern is the protocol.”

---

## Mediator (brief caution)

**Mediator**: colleagues talk **only** to the hub, not to each other. A Zustand store, Nest event bus, or Redux can play this: screens dispatch, the store updates, others read.

Caution: **“everyone talks through me” becomes a god object.** If `useAppStore` knows checkout, chat, maps, and auth, the Mediator is a god module. Split stores by domain; keep the hub **thin** (state + transitions). Observer/Pub-Sub **decouples** producers from consumers; a bloated mediator **recouples** them in one file.

---

## Common mistakes and misconceptions

1. **Observer without unsubscribe** — subject retains the listener; screens and sockets leak.
2. **Anonymous `emitter.on`** — cannot `off` later.
3. **Observer as “the React pattern” only** — also Nest events and Node `EventEmitter`.
4. **Strategy classes for two `if`s** — cargo-cult; grow when the family will extend (payments).
5. **Command wrapper around a method that always runs now** — jobs/undo/queue are the signal.
6. **Calling interceptors “the Chain of Responsibility”** — the **pipeline** is CoR; interceptors are onion/Decorator. Guards stop; interceptors wrap.
7. **Auth in middleware because it runs first** — no `@Roles()` metadata; use **guards**.
8. **Template Method vs Strategy mixed up** — skeleton+hooks vs injected algorithm.
9. **Boolean soup** for order/auth — `paid && cancelled`. One status.
10. **Mediator store that imports the world** — god object with a pattern name.

---

## Connections to other concepts

```
Observer → EventEmitter2 (Appointments emit; Billing + Notifications listen)
         → Zustand / useSyncExternalStore; leak if no unsubscribe
Strategy → Nest useClass (Bog vs Flitt); vs Template Method; vs if/else (OCP)
Command  → BullMQ payload = serialized command; idempotent VetApp jobs
CoR      → middleware → guards → interceptors → pipes → handler → interceptors → filters
         → interceptors also Decorator (wrap)
State    → order / payment / auth session; vs boolean flags
Iterator → for...of / generators    Mediator → hub; danger: god store
```

DI is how Strategy implementations and Command receivers get into Nest. Adapter (structural) still wraps a payment SDK; Strategy is **which** adapter is chosen.

---

## Interview perspective

Lead with **Observer** (events / Zustand), **Strategy** (payment / validation), and **Chain of Responsibility** (Nest pipeline). Command for “why is this a job.” State for “why not three booleans.” Template Method if they ask inheritance vs composition.

Strong: pattern + stack example + **when not**. Weak: a GoF list with no pipeline, no unsubscribe, and no Strategy vs Template Method.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
