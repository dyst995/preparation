# Structural design patterns

## What you need to know

**Structural** patterns compose objects so a client talks to a **stable shape** while an SDK, extra behavior, or a whole subsystem sits behind it. Not creational (“how is it built?”) and not behavioral (“how do they collaborate over time?”). Interview bar: **name it, draw the wrap, say whether the interface is shared or translated, point at Nest / RN, say when you would not use it.**

Checklist: **Adapter** (Nest payments, RN native module, Axios analogy) · **Decorator** (GoF wrap vs TS/Nest `@Decorator()`; pipes as “around”) · **Facade** (TypeORM + mail + payment) · **Proxy** (lazy / cache / auth; same interface vs Adapter) · **Composite** (brief; React tree is analogy) · **GoF Bridge vs RN Bridge** (dedicated) · **Flyweight** (one-line).

Related: [RN Bridge (transport)](../../react-native/2.%20bridge/notes.md), [Nest DTO / pipes](../../typescript-javascript/26.%20typing-nestjs-patterns/notes.md).

---

## The family in one map

| Pattern | You wrap… | Client sees… | Difference |
|---|---|---|---|
| Adapter | An **incompatible** API | A **different** target | **Translate** |
| Decorator | Something you could already call | **Same** interface, **more** behavior | **Add** |
| Proxy | The real subject | **Same** interface, **gated** access | **Control** |
| Facade | **Several** subsystem objects | **One** simpler API | **Simplify** |
| Composite | Children that share the interface | One node **or** a tree | **Uniform tree** |
| GoF Bridge | An **implementor** the abstraction holds | Abstraction API; impl varies | **Decouple two hierarchies** |

Stuck? Ask: **who is the client, what interface do they depend on, what sits behind it — translate, add, control, or simplify?**

---

## Adapter

**What:** make an **existing** object usable where it does not match the interface your code depends on. The adapter **implements the target**, **holds the adaptee**, **translates** calls and data.

**Why:** Stripe / native SDKs / legacy helpers are not written for *your* app. If `CheckoutService` calls Stripe types directly, PayPal (or Stripe vN+1) rewrites business code. The adapter localizes that mess.

**How:**

```ts
interface PaymentGateway {
  charge(input: { amountCents: number; currency: string; token: string }): Promise<{ id: string }>;
}

class StripeSdk {
  async createCharge(amountDollars: number, currency: string, source: string) {
    return { chargeId: 'ch_123' };
  }
}

class StripePaymentAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeSdk) {}
  async charge(input: { amountCents: number; currency: string; token: string }) {
    const raw = await this.stripe.createCharge(input.amountCents / 100, input.currency, input.token);
    return { id: raw.chargeId };
  }
}
```

In TypeScript you write an **object** adapter (composition). Class adapter (inherit the adaptee) is textbook trivia.

**Nest:** the service depends on `PaymentGateway`; the module binds the adapter.

```ts
export const PAYMENTS = Symbol('PAYMENTS');

@Injectable()
class CheckoutService {
  constructor(@Inject(PAYMENTS) private readonly payments: PaymentGateway) {}
  checkout(token: string) {
    return this.payments.charge({ amountCents: 1999, currency: 'usd', token });
  }
}
// providers: [{ provide: PAYMENTS, useClass: StripePaymentAdapter }]
```

`CheckoutService` never imports `StripeSdk`. `PaypalPaymentAdapter` is a new class + provider swap.

**RN:** JS wants a Promise API; the native SDK wants callbacks and platform names. The **native module** (or a thin JS wrapper around `NativeModules.Foo`) is the Adapter. The **RN Bridge** is the **pipe** those messages travel on — not the pattern name for the wrapper.

```ts
interface ReceiptPrinter { print(text: string): Promise<void>; }

declare const NativeModules: {
  ZebraPrinter: { printLine: (p: { body: string }, cb: (err: string | null) => void) => void };
};

class ZebraPrinterAdapter implements ReceiptPrinter {
  print(text: string) {
    return new Promise<void>((resolve, reject) => {
      NativeModules.ZebraPrinter.printLine({ body: text }, (err) => {
        err ? reject(new Error(err)) : resolve();
      });
    });
  }
}
```

**Axios (short):** `axios.get` stays the same; an **adapter function** `(config) => Promise<response>` swaps transport (XHR vs Node `http` vs a test mock). Same Axios API, incompatible mechanisms underneath. Analogy, not “Axios *is* the GoF sheet.”

**When not to:** do not wrap your own function that already matches the target — no translation, just noise.

---

## Decorator (GoF objects vs `@Decorator()`)

**What:** a GoF Decorator **wraps** a collaborator that already has the **same** interface and **adds** behavior (logging, retry, metrics) by forwarding plus work before/after.

**Why:** extra behavior **without editing** `EmailNotifier` and without `LoggingEmailNotifier` / `RetryLoggingEmailNotifier` subclass explosion. Wrap, stack, keep the core small.

**How:**

```ts
interface Notifier { send(message: string): string; }

class EmailNotifier implements Notifier {
  send(message: string) { return `email:${message}`; }
}

class LoggingNotifier implements Notifier {
  constructor(private readonly inner: Notifier) {}
  send(message: string) { return `log(${this.inner.send(message)})`; }
}

class RetryNotifier implements Notifier {
  constructor(private readonly inner: Notifier) {}
  send(message: string) {
    try { return this.inner.send(message); } catch { return this.inner.send(message); }
  }
}

const notifier: Notifier = new RetryNotifier(new LoggingNotifier(new EmailNotifier()));
notifier.send('hi'); // Retry first, then Logging, then Email. Core unchanged.
```

Outermost wrapper runs first on the way in — same *shape* as middleware.

### TypeScript / Nest `@Decorator()` is not that mechanism

`@Injectable()`, `@Get()`, `@IsEmail()` are **TypeScript decorators**: functions that run at **definition time** and attach **metadata** (or wrap a method descriptor). Related *idea* (“annotate this declaration”). **Different mechanism** from a runtime object that implements `Notifier` and holds another `Notifier`.

```ts
class CreateUserDto {
  @IsEmail()
  email: string;
}
```

`@IsEmail()` does **not** wrap a user at runtime. It **records a rule**. `ValidationPipe` later **reads that metadata** and validates the body — that pipeline step is “add behavior around the handler.” Nest **pipes / guards / interceptors** are the closer design story.

Spoken: *GoF Decorator is an object with the same interface that forwards and adds behavior. Nest `@Get()` / `@IsEmail()` are TS metadata. The pipe / interceptor chain is what actually wraps the controller.*

**When not to:** a one-off `if` in the core class beats three wrapper types. Do not call every Nest annotation “the Decorator pattern.”

---

## Facade

**What:** **one simple front** for a **subsystem**. The client calls one method; the facade sequences TypeORM + payment + mail.

**Why:** a controller should not know “charge, then insert, then email.” That order is a use-case. The facade **hides the wiring**, not the fact that work happened.

**How:**

```ts
@Injectable()
class PlaceOrderService { // Nest-shaped facade — not a class named Facade
  constructor(
    private readonly orders: OrderRepository,  // TypeORM
    private readonly mail: MailService,
    private readonly payments: PaymentGateway, // often an Adapter
  ) {}

  async place(dto: { userId: string; amountCents: number; token: string }) {
    const charge = await this.payments.charge({ amountCents: dto.amountCents, currency: 'usd', token: dto.token });
    const order = await this.orders.save({ userId: dto.userId, chargeId: charge.id });
    await this.mail.sendOrderConfirmation(order.id);
    return { orderId: order.id };
  }
}
```

The controller calls `place(...)` and returns `{ orderId }`. It does not import Stripe, a TypeORM `QueryBuilder`, or nodemailer.

**When not to:** returning `{ order, stripeCharge, mailInfo }` **leaked** the subsystem. A 40-method `AppFacade` is a God object. One application service per use-case is the Nest version.

Adapter translates **one** foreign API. Facade **composes many** APIs you already own (some of which may be adapters).

---

## Proxy

**What:** a **stand-in** for a real subject. **Same** interface; **controls access** — whether the real object runs, when it is created, whether a cache hit is enough, whether the caller is allowed.

**Why:** the client keeps writing `directory.findById(id)` while you add lazy SDK init, a cache, or an auth check without sprinkling that at every call site.

**How:**

```ts
interface UserDirectory { findById(id: string): Promise<string>; }

class TypeOrmUserDirectory implements UserDirectory {
  async findById(id: string) { return `db:${id}`; }
}

class CachingUserDirectory implements UserDirectory {
  private readonly cache = new Map<string, string>();
  constructor(private readonly inner: UserDirectory) {}
  async findById(id: string) {
    const hit = this.cache.get(id);
    if (hit !== undefined) return hit;
    const user = await this.inner.findById(id);
    this.cache.set(id, user);
    return user;
  }
}
```

Same interface, other variants: **protection/auth** (`if (role !== 'admin') throw` then forward); **virtual/lazy** (`this.real ??= new StripePaymentAdapter(...)` on first `charge`). Nest guards / interceptors often play protection and cache at the HTTP boundary.

### Proxy vs Adapter

| | Proxy | Adapter |
|---|---|---|
| Interface | **Same** as the real subject | **Different** — that is the point |
| Job | **Control** access | **Translate** an incompatible API |
| Client | Thinks it *is* the subject | Depends on the **target**, never the adaptee |

Caching `UserDirectory` is Proxy. Turning `createCharge(dollars)` into `charge(cents)` is Adapter. Same “object that forwards,” different reason.

**Decorator vs Proxy:** both wrap and share an interface. Decorator **adds** (logging, retry) and usually still forwards. Proxy **controls** whether/when/how often the real thing runs; an auth proxy may not forward at all.

**When not to:** a `Map` in one service is enough for a single cached lookup. Do not proxy a cheap, trusted function.

---

## Composite (brief)

**What:** a tree where **leaves and groups share one interface**, so the client can `draw()` / `total()` on one node or a whole subtree.

**Why:** recursive structure without `if (isGroup)` at every call site.

**How:**

```ts
interface Graphic { draw(): string; }
class Circle implements Graphic { draw() { return 'circle'; } }
class Group implements Graphic {
  constructor(private readonly children: Graphic[]) {}
  draw() { return this.children.map((c) => c.draw()).join('+'); }
}
new Group([new Circle(), new Group([new Circle()])]).draw(); // 'circle+circle'
```

**React analogy:** parent and child are both elements that participate in render — *shaped like* Composite. That is **not** proof you “used Composite at work.” Interviewers who want the pattern want a **shared component interface**, explicit leaf vs composite, and a **recursive operation you wrote**. “JSX is a tree” is an analogy. Stop there unless you built that API.

---

## GoF Bridge vs React Native Bridge (do not confuse)

Same English word. **Two different ideas.** This mix-up fails otherwise-strong RN candidates.

### GoF Bridge — decouple abstraction from implementation

**What:** split a **high-level abstraction** from its **implementors** so each hierarchy can grow **independently**. The abstraction **holds** an implementor and delegates.

**Why:** without it you get `OrderEmailSmtp`, `OrderEmailSendGrid`, `ResetEmailSmtp`, `ResetEmailSendGrid`, then SMS copies of all of them.

**How:**

```ts
interface MessageSender { send(to: string, body: string): Promise<string>; }
class SmtpSender implements MessageSender {
  async send(to: string, body: string) { return `smtp:${to}:${body}`; }
}
class SendGridSender implements MessageSender {
  async send(to: string, body: string) { return `sg:${to}:${body}`; }
}

abstract class Notification {
  constructor(protected readonly sender: MessageSender) {}
  abstract notify(user: { email: string }): Promise<string>;
}
class OrderShipped extends Notification {
  notify(user: { email: string }) { return this.sender.send(user.email, 'shipped'); }
}
// PasswordReset would be another Notification subclass — mix with any MessageSender
new OrderShipped(new SendGridSender()).notify({ email: 'a@b.c' });
```

**Bridge vs Adapter:** Adapter is usually **after the fact** (Stripe exists; you fit it to `PaymentGateway`). GoF Bridge is **planned** (two sides designed to vary). Wrapping an existing SMTP library to fit `MessageSender` is Adapter; the Notification × Sender split is the Bridge.

### React Native Bridge — JS ↔ native message passing

**What:** RN’s **legacy transport** — an **asynchronous, serialized, batched** channel between the **JS runtime** and **native** code. JS cannot call `UIView` like a local function. It **queues messages**; native runs them; results come back the same way.

**What it is not:** **not** GoF Bridge. There are not two class hierarchies you independently subclass. There is a **pipe**.

```text
JS thread  →  serialize / batch  →  native modules / UI
           ←  serialize events / results ←
```

A **legacy Native Module** is an **endpoint** on that pipe. Wrapping Zebra’s Android SDK so JS sees `print()` is **Adapter**. The bytes travel on the **RN Bridge**. JSI / Turbo Modules change the **transport**; they still are not GoF Bridge.

**Spoken contrast:** *GoF Bridge is a design pattern: an abstraction that delegates to a swappable implementor so the two can vary independently. The React Native Bridge is a message-passing transport between JavaScript and native. If I wrap a native SDK for JS, that’s Adapter sitting on that transport — I would not call the RN message queue the GoF Bridge pattern.*

If they ask “did you use the Bridge pattern in React Native?” **disambiguate first**. Do not answer “yes, RN has a Bridge” as if that were GoF.

---

## Flyweight (awareness only)

Share **heavy immutable (“intrinsic”) state** across many objects to save memory (classic: font glyphs). Almost never the answer in a Nest/React interview. Do not retrofit it onto `React.memo`, CSS classes, or module singletons.

---

## Common mistakes and misconceptions

1. **Every wrapper is an Adapter.** Translate incompatible APIs → Adapter. Same interface + extra behavior → Decorator. Same interface + access control → Proxy. Many objects, one simple API → Facade.
2. **`@Injectable()` / `@IsEmail()` = GoF Decorator.** Definition-time metadata ≠ a wrapping object. Pipes/interceptors are the closer runtime wrap.
3. **Facade that leaks Stripe/TypeORM types** to the controller — then it is a pass-through, not a front.
4. **Proxy vs Adapter.** Same vs different interface is the cheap test.
5. **“I used Composite because I write React.”** Analogy, not evidence.
6. **“RN Bridge = GoF Bridge.”** Transport vs two independently varying hierarchies.
7. **Adapter vs GoF Bridge.** Fitting an existing SDK is Adapter. Designing abstraction × implementor up front is Bridge.
8. **God facade / decorator stack** for a one-line `if`. Name the pattern when the wrap earns it.
9. **Flyweight as a stretch** for React context or a Nest singleton.

---

## Connections to other concepts

```
incompatible SDK / NativeModules
  → Adapter implements target, translates
    → Nest DI token (PaymentGateway)  ≈  swap like Strategy
    → RN: adapter sits on RN Bridge *transport* (not GoF Bridge)

same interface, add logging / retry / validation
  → GoF Decorator object
    → Nest pipes / interceptors / guards  ≈  wrap the handler
      → also Chain of Responsibility (next unit)
    ≠ TS @Decorator() metadata (class-validator records; pipe runs)

many collaborators for one use-case
  → Facade (PlaceOrderService)
    → may use Adapters (payments) + Repositories (TypeORM)
    → Repository is persistence; Facade is the use-case front

same interface, gate / cache / lazy-create  → Proxy (not Adapter)

leaf + group, one operation  → Composite (do not claim from JSX alone)

abstraction holds implementor, both vary  → GoF Bridge
  ≠ RN Bridge (serialize / batch / async JS ↔ native)
```

Factory/DI **construct** the adapter or proxy. Strategy **swaps an algorithm** behind the same interface — looks like Adapter from the client, but Strategy is usually *your* implementations, not a foreign SDK.

---

## Interview perspective

You should be able to: draw **client → interface → wrapper → real thing** and label it; walk a Nest **payment Adapter** and an RN **native-module Adapter**; say **Decorator vs `@Decorator()`** and point at **ValidationPipe**; give a **Facade** (`PlaceOrderService`) and a **leak** (Stripe objects); distinguish **Proxy vs Adapter**; treat **Composite + React** as analogy; **disambiguate GoF Bridge vs RN Bridge** on the first ask; skip Flyweight unless they name it.

30–60 seconds:

> Structural patterns compose objects behind a stable interface. I wrap Stripe as an Adapter so checkout depends on PaymentGateway. A Facade application service keeps the controller from orchestrating TypeORM, mail, and payments. Cache or lazy-init on the same interface is a Proxy, not an Adapter. Nest’s `@IsEmail()` is TypeScript metadata; the pipe adds behavior around the handler — related to GoF Decorator, not the same mechanism. GoF Bridge decouples an abstraction from its implementor; the React Native Bridge is the JS–native message channel.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
