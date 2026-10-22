# Structural design patterns — Answers

## Core recall

1. **Answer:** They compose objects/classes so a client talks to a **stable shape** while an SDK, extra behavior, or a subsystem sits behind it. Creational is how an object is **built**; behavioral is how objects **collaborate over time**.  
   **Why:** The wrap (translate / add / control / simplify) is the load-bearing idea, not a vocabulary list.

2. **Answer:** Wrap an **incompatible** existing API (the adaptee) and present a **target** interface the rest of the app depends on.  
   **Why:** Translation is localized in one class so business code never speaks Stripe/native method names.

3. **Answer:** The **same** interface as the wrappee. It forwards the call and adds work before/after.  
   **Why:** Clients keep depending on `Notifier`; you can stack wrappers without changing the core.

4. **Answer:** One **simple front** for a **subsystem** of several objects (e.g. TypeORM + mail + payment behind `place()`).  
   **Why:** The client should not know the wiring order of those collaborators.

5. **Answer:** **Lazy/virtual** init, **caching**, **protection/auth** (also remote, but those three are the interview set).  
   **Why:** Same interface, gated access — not a translated API.

6. **Answer:** A tree where **leaves and groups share one interface**, so one operation runs on a node or a whole subtree.  
   **Why:** Avoid `if (isGroup)` at every call site.

7. **Answer:** The **abstraction** (e.g. `Notification`) and the **implementor** (e.g. `MessageSender`). The abstraction **holds** the implementor and delegates.  
   **Why:** Each hierarchy can grow without a subclass explosion.

8. **Answer:** RN’s **legacy transport**: async, serialized, batched messages between the **JS runtime** and **native**. **No — it is not GoF Bridge.**  
   **Why:** It is a **pipe**, not two independently varying class hierarchies.

9. **Answer:** Share heavy immutable (“intrinsic”) state across many objects to save memory (classic: font glyphs). **Do not reach for it** in a typical Nest/React interview.  
   **Why:** Stretching it onto `React.memo` or a Nest singleton is cargo-cult.

---

## Explain why

1. **Answer:** Checkout then depends on **your** `PaymentGateway`, not Stripe types. A PayPal adapter (or Stripe vN+1) is a new class + DI swap, not a rewrite of every charge site. Translation (cents vs dollars, token vs source) lives in one place.  
   **Why:** Third-party APIs are not written for your app; the adapter localizes that mess.

2. **Answer:** Each decorator implements `Notifier` and holds a `Notifier`. `EmailNotifier` stays a core sender. `Retry` and `Logging` wrap it from the outside. Outermost runs first on the way in.  
   **Why:** Open for extra behavior, closed for edits to the core — without `RetryLoggingEmailNotifier` subclasses.

3. **Answer:** TS/Nest decorators run at **definition time** and attach **metadata** (or wrap a method descriptor). GoF Decorator is a **runtime object** with the same interface that forwards and adds behavior. `@IsEmail()` records a rule; `ValidationPipe` is what actually wraps the handler.  
   **Why:** Same English word, different mechanism. Interviewers listen for this split.

4. **Answer:** One use-case method (`place`) sequences collaborators and returns a **small** result (`{ orderId }`). Coupling drops because the controller does not import TypeORM/Stripe/mail. It stays small because it is **one** application action, not a 40-method `AppFacade`.  
   **Why:** Hide wiring, not “hide the entire backend behind one God object.”

5. **Answer:** The client already knows the subject’s API (`findById`). The proxy must be **substitutable** so call sites do not change when you insert cache/auth/lazy. If the interface changed, you would be translating — that is Adapter.  
   **Why:** Same interface is the cheap test that separates Proxy from Adapter.

6. **Answer:** JSX being a tree is an **analogy** (parent and child both participate in render). Composite as a pattern means **you** wrote a shared component interface, leaf vs composite, and a recursive operation. “I write React” does not prove that.  
   **Why:** Same trap as “I used Observer because I used `useEffect`.”

7. **Answer:** Interviewers often say “Bridge” meaning either GoF (abstraction × implementor) or RN (JS ↔ native transport). If you answer “yes, RN has a Bridge” as if that were GoF, you sound like you memorized a word. Disambiguate first.  
   **Why:** The words collide; the ideas do not.

---

## Compare and contrast

1. **Adapter vs Proxy:** Adapter **translates** an **incompatible** API to a **target**. Proxy presents the **same** interface as the real subject and **controls access** (lazy, cache, auth). Client of an adapter never talks to the adaptee; client of a proxy thinks it *is* the subject.

2. **Adapter vs Facade:** Adapter fits **one** foreign object to one target. Facade is **one simple API** over **several** objects you already own (some of which may be adapters). Stripe → `PaymentGateway` is Adapter. `PlaceOrderService` coordinating TypeORM + mail + payments is Facade.

3. **GoF Decorator vs `@Decorator()` vs pipes:** GoF = runtime wrapper, same interface, add behavior. TS/Nest `@Get()` / `@IsEmail()` = definition-time **metadata**. Nest **pipes / guards / interceptors** wrap the request/handler at runtime — closer to GoF Decorator (and to Chain of Responsibility). `class-validator` records rules; the pipe runs them.

4. **Decorator vs Proxy:** Both wrap and share an interface. Decorator **adds** (logging, retry) and usually still forwards. Proxy **controls** whether/when/how often the real thing runs; an auth proxy may throw and never forward. Intent is the split, not the wrapping syntax.

5. **GoF Bridge vs Adapter:** Both sit between two sides. Adapter is usually **after the fact** — the SDK already exists; you fit it. Bridge is **planned** — abstraction and implementor designed to vary independently. Wrapping SMTP to fit `MessageSender` is Adapter; `Notification` holding `MessageSender` is Bridge.

6. **GoF Bridge vs RN Bridge:** GoF = abstraction holds a swappable implementor; two hierarchies grow independently. RN Bridge = **async serialized batched** JS ↔ native **transport**. Native Module wrapping a vendor SDK is **Adapter on that transport**. JSI changes the transport, not GoF.

7. **Composite vs Decorator:** Both can nest objects with the same interface. Composite is a **tree of children** (part-whole; `draw` everyone). Decorator is a **chain of wrappers** adding behavior around **one** component. A `Group` of graphics is Composite; `LoggingNotifier` around `EmailNotifier` is Decorator.

---

## Predict the output

1. **`paid 2.5`.** Adapter implements `Gateway.charge(cents)` and translates to `LegacyPay.pay(dollars)` via `/ 100`. 250 cents → 2.5 dollars. That translation is the pattern.

2. **`[core:hi]!`.** `Bang.send` runs first (outermost), then `Bracket`, then `Core`. Core returns `core:hi`; Bracket wraps with `[]` → `[core:hi]`; Bang appends `!`. Outermost decorator sees the call first.

3. **`a a b 2`.** First `'a'` misses, `hits` becomes 1, stores `'a'`. Second `'a'` is a cache hit — inner not called. `'b'` misses, `hits` becomes 2. Proxy: same `get` API, **controls** how often `Real` runs.

4. **`denied`.** `SecurePrinter` implements **the same** `Printer` interface and **gates** the call — **Proxy** (protection), not Adapter (no translation) and not Decorator (it does not add behavior; it may refuse). `ok === false` throws before `SlowPrinter` runs.

---

## Debugging

1. **Diagnosis:** Business services are coupled to a **foreign** API (Stripe types, method names, payload shape). Adding PayPal means rewriting four call sites.  
   **Fix:** Introduce `PaymentGateway` as the target; `StripePaymentAdapter` / `PaypalPaymentAdapter` translate; inject `PAYMENTS` into those services (or better, into one Facade). Checkout never imports `Stripe`.

2. **Diagnosis:** `MetricsDecorator` does **not** `implements Notifier`. It happens to have `send`, so `notifyAll(m)` works structurally, but `report()` is an **extra** surface. Clients that take `m` start depending on metrics, so you can no longer substitute a plain `Notifier`.  
   **Fix:** `class MetricsDecorator implements Notifier` and keep extra methods off the client-facing type (or hide them). GoF Decorator stays substitutable.

3. **Diagnosis:** The facade **leaked the subsystem**. The controller now speaks Stripe (`network_status`) and mail internals, so swapping Stripe or changing mail still ripples into HTTP.  
   **Fix:** Return `{ orderId }` (or a domain DTO). Map failures to your errors inside `place()`. A Facade hides wiring **and** foreign types.

4. **Conflation:** They treated the **RN Bridge (transport)** as **GoF Bridge (pattern)** and also used “Bridge” for the **Zebra wrapper**.  
   **Relabel:** RN Bridge = JS ↔ native **message channel**. Native Module wrapping Zebra = **Adapter** (JS `print()` vs native SDK). GoF Bridge would be something like `Notification` × `MessageSender`, which they did not describe. Disambiguate; do not say “yes, RN has a Bridge” as if that were GoF.

---

## Application

1. **Answer:**
```ts
class StripePaymentAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeSdk) {}
  async charge(input: { amountCents: number; currency: string; token: string }) {
    const raw = await this.stripe.createCharge(
      input.amountCents / 100,
      input.currency,
      input.token,
    );
    return { id: raw.chargeId };
  }
}
```
   **Why:** Implements the **target**, holds the **adaptee**, translates cents→dollars, `token`→`source`, `chargeId`→`id`.

2. **Answer:**
```ts
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
   **Why:** **Same** `UserDirectory` interface; **controls** whether the inner (TypeORM) runs. That is Proxy, not Adapter.

3. **Answer (sketch):**
```ts
@Injectable()
class PlaceOrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly mail: MailService,
    private readonly payments: PaymentGateway,
  ) {}
  async place(dto: { userId: string; amountCents: number; token: string }) {
    const charge = await this.payments.charge({
      amountCents: dto.amountCents, currency: 'usd', token: dto.token,
    });
    const order = await this.orders.save({ userId: dto.userId, chargeId: charge.id });
    await this.mail.sendOrderConfirmation(order.id);
    return { orderId: order.id };
  }
}
```
   **Why:** One front; controller never orchestrates TypeORM + mail + payment. Return type does not leak Stripe.

4. **Answer (sketch):**
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
new OrderShipped(new SendGridSender()).notify({ email: 'a@b.c' });
```
   **Why:** `OrderShipped` × `SmtpSender` / `SendGridSender` without `OrderShippedSendGrid` subclasses. Abstraction holds implementor — GoF Bridge, not the RN pipe.

---

## Interview questions

1. **Spoken:** I compose behind stable interfaces. Payments are an **Adapter** (`PaymentGateway` over Stripe). Checkout/place-order is a **Facade** (TypeORM + mail + payment). Caching or lazy SDK init is a **Proxy**. Nest pipes wrap the handler — related to **Decorator**, while `@IsEmail()` is TS metadata. Native modules wrapping vendor SDKs are Adapters sitting on the **RN Bridge transport**, which is not GoF Bridge.  
   **Follow-ups:** I do not name a pattern for a one-line `if` or a single `Map`. DI **constructs** the adapter/proxy and binds the token; it is not itself a structural wrap.

2. **Spoken:** Keep `PaymentGateway`. Add `PaypalPaymentAdapter` that translates PayPal’s API into `charge({ amountCents, currency, token })`. Register it (or a factory that picks Stripe vs PayPal) on the `PAYMENTS` token. `CheckoutService` still injects `PaymentGateway` — it does not import PayPal or Stripe.  
   **Follow-ups:** After the change, checkout still imports **only** the target interface/token. Amount/currency/token translation lives **inside each adapter**, not in the service.

3. **Spoken:** Nest is full of **TypeScript decorators**, not automatically the GoF pattern. `@Get()` / `@Injectable()` / `@IsEmail()` run at definition time and attach metadata. The GoF idea — wrap and add behavior without editing the core — shows up as **pipes, guards, interceptors** around the handler. `class-validator` records rules; `ValidationPipe` executes them.  
   **Follow-ups:** “Add behavior around” = the request pipeline. Claiming “`@IsEmail()` is the Decorator pattern” is the tell that you mixed the word.

4. **Spoken:** Adapter: `StripePaymentAdapter` or a RN `ZebraPrinterAdapter` turning callbacks into `print(): Promise<void>`. Proxy: `CachingUserDirectory` or an auth wrapper that throws if the role is wrong — **same** `findById` API.  
   **Follow-ups:** A cache around an object that **already** implements `PaymentGateway` is still Proxy (same interface, control frequency). The moment the wrapper’s job is **translating** `createCharge(dollars)` into `charge(cents)`, it is Adapter. You can stack them: Proxy in front of Adapter.

5. **Spoken:** I would disambiguate. The **React Native Bridge** is an async serialized message channel between JS and native — a **transport**, not GoF Bridge. GoF Bridge is an abstraction that delegates to a swappable implementor so both hierarchies vary independently.  
   **Follow-ups:** Wrapping a native SDK for JS is **Adapter**. JSI / Turbo Modules change **how** JS talks to native (less serialize-everything); they still are not GoF Bridge.

---

## Connections

1. **Answer:** Client depends on `PaymentGateway`; Nest binds `StripePaymentAdapter` or `PaypalPaymentAdapter` on a token — from the client, “swap the algorithm/implementation,” which **looks like Strategy**. It is still Adapter because each class **translates a foreign SDK** to the target. Strategy is usually **your** implementations of an interface you designed, not an after-the-fact fit of Stripe. DI is how the swap is **constructed**, not the wrap itself.

2. **Answer:** Each pipe/guard/interceptor **wraps** the handler and adds validation, auth, mapping, caching — GoF Decorator’s “add behavior around without editing the controller.” They also form a **pipeline**: each can pass to the next, which is **Chain of Responsibility** (next unit). TS `@Decorator()` syntax is only how Nest **declares** those hooks; the runtime wrap is the chain.

3. **Answer:** A **Repository** hides **persistence** (TypeORM queries, entity mapping) behind `save` / `findById`. A **Facade** hides a **use-case’s wiring** across several collaborators (repository + payment adapter + mail). `PlaceOrderService` **uses** a repository; it is not a repository. Returning a TypeORM entity from the facade still leaks persistence.

4. **Answer:** **Adapter** = JS target (`ReceiptPrinter.print`) wrapping Zebra’s native SDK (callbacks, platform names). **RN Bridge** = the **pipe** those messages travel on (serialize/batch/async). **GoF Bridge** = a different design (abstraction × implementor). Do not use “Bridge” for the wrapper; do not use “Adapter” for the message queue. JSI replaces the pipe, not GoF.
