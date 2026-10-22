# Structural design patterns — Self-test

## Core recall

1. What problem do structural patterns solve, as opposed to creational or behavioral ones?
2. State Adapter in one sentence: what do you wrap, and what do you present to the client?
3. What interface relationship must a GoF Decorator have with the object it wraps?
4. State Facade in one sentence.
5. Name three reasons you introduce a Proxy (not an Adapter).
6. What is Composite, in one sentence?
7. In GoF Bridge, what two things are decoupled so they can vary independently?
8. What is the React Native Bridge, in one sentence? Is it the GoF Bridge pattern?
9. Flyweight in one line — when would it matter, and should you reach for it in a typical Nest/React interview?

## Explain why

1. Why wrap Stripe (or any payment SDK) behind `PaymentGateway` instead of calling the SDK from `CheckoutService`?
2. Why can you stack GoF Decorators (`new RetryNotifier(new LoggingNotifier(new EmailNotifier()))`) without changing `EmailNotifier`?
3. Why is `@Injectable()` / `@Get()` / `@IsEmail()` not the GoF Decorator pattern, even though the word is the same?
4. Why does a well-sized Facade reduce coupling without becoming a God object?
5. Why must a Proxy present the **same** interface as the real subject?
6. Why is “I used Composite because I wrote React components” a weak interview answer?
7. Why can mixing the word “Bridge” in a fullstack / RN interview fail you if you only know one meaning?

## Compare and contrast

1. Adapter vs Proxy.
2. Adapter vs Facade.
3. GoF Decorator vs TypeScript/Nest `@Decorator()` vs Nest pipes / interceptors.
4. Decorator vs Proxy (both wrap a collaborator).
5. GoF Bridge vs Adapter (both connect two sides).
6. GoF Bridge vs React Native Bridge.
7. Composite vs Decorator.

## Predict the output

State the result **and explain why**.

1.
```ts
class LegacyPay {
  pay(dollars: number) {
    return `paid ${dollars}`;
  }
}

interface Gateway {
  charge(cents: number): string;
}

class LegacyPayAdapter implements Gateway {
  constructor(private readonly legacy: LegacyPay) {}
  charge(cents: number) {
    return this.legacy.pay(cents / 100);
  }
}

console.log(new LegacyPayAdapter(new LegacyPay()).charge(250));
```

2.
```ts
interface N { send(m: string): string; }

class Core implements N {
  send(m: string) { return `core:${m}`; }
}

class Bracket implements N {
  constructor(private inner: N) {}
  send(m: string) { return `[${this.inner.send(m)}]`; }
}

class Bang implements N {
  constructor(private inner: N) {}
  send(m: string) { return `${this.inner.send(m)}!`; }
}

const n = new Bang(new Bracket(new Core()));
console.log(n.send('hi'));
```

3.
```ts
let hits = 0;

class Real {
  get(id: string) {
    hits += 1;
    return id;
  }
}

class CacheProxy {
  private cache = new Map<string, string>();
  constructor(private real: Real) {}
  get(id: string) {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const v = this.real.get(id);
    this.cache.set(id, v);
    return v;
  }
}

const p = new CacheProxy(new Real());
console.log(p.get('a'), p.get('a'), p.get('b'), hits);
```

4.
```ts
interface Printer { print(t: string): string; }

class SlowPrinter implements Printer {
  print(t: string) { return `print:${t}`; }
}

class SecurePrinter implements Printer {
  constructor(private inner: Printer, private ok: boolean) {}
  print(t: string) {
    if (!this.ok) throw new Error('denied');
    return this.inner.print(t);
  }
}

try {
  console.log(new SecurePrinter(new SlowPrinter(), false).print('x'));
} catch (e) {
  console.log((e as Error).message);
}
```
Which pattern is `SecurePrinter` — Adapter, Decorator, or Proxy — and why?

## Debugging

1. Four Nest services import `Stripe` and call `stripe.paymentIntents.create` with Stripe-shaped payloads. A new requirement is “add PayPal.” What is the design bug, and what pattern fixes the seam?

2. Diagnose this decorator:
```ts
interface Notifier { send(message: string): void; }

class EmailNotifier implements Notifier {
  send(message: string) { /* send */ }
}

class MetricsDecorator {
  constructor(private inner: Notifier) {}
  send(message: string) { this.inner.send(message); }
  report() { return 1; }
}

function notifyAll(n: Notifier) { n.send('hi'); }
const m = new MetricsDecorator(new EmailNotifier());
notifyAll(m);
m.report();
```
What broke, and what do clients start depending on?

3. `PlaceOrderService.place()` returns `{ order, stripeCharge, mailResult }`. The controller then reads `stripeCharge.outcome.network_status`. What went wrong with the Facade?

4. A candidate says: “Yes, I used the Bridge pattern — React Native’s Bridge between JS and native, plus our Native Module wrapping Zebra’s SDK.” What did they conflate? How should they relabel the pieces?

## Application

1. Given `StripeSdk.createCharge(dollars, currency, source)` returning `{ chargeId }`, write a `StripePaymentAdapter` that implements:
```ts
interface PaymentGateway {
  charge(input: { amountCents: number; currency: string; token: string }): Promise<{ id: string }>;
}
```

2. Write a `CachingUserDirectory` that implements `UserDirectory { findById(id: string): Promise<string> }` and delegates to an inner `UserDirectory`.

3. Sketch a Nest `PlaceOrderService` facade: constructor collaborators and a `place` method that charges, saves via TypeORM, sends mail, and returns only `{ orderId }`.

4. Sketch GoF Bridge: a `Notification` abstraction that holds a `MessageSender` implementor, plus one concrete notification and two senders. Show how you mix them without a subclass explosion.

## Interview questions

1. What structural patterns do you actually use in Nest and React Native?  
   **Follow-ups:** When would you *not* name a pattern? How does DI fit?

2. We need to add PayPal next to Stripe. Walk me through the change.  
   **Follow-ups:** What does `CheckoutService` import after the change? Where does amount/currency translation live?

3. People say Nest is “full of decorators.” Is that the Decorator pattern?  
   **Follow-ups:** Where *does* “add behavior around” live in Nest? What about `class-validator`?

4. Adapter vs Proxy — give one example of each from your stack.  
   **Follow-ups:** Could a caching wrapper around Stripe still be a Proxy? When does that wrapper become an Adapter?

5. Someone says “React Native uses the Bridge pattern.” How do you answer?  
   **Follow-ups:** If you wrap a native SDK for JS, what pattern is that? What is JSI changing?

## Connections

1. How does Adapter + Nest DI let you swap implementations in a way that looks like Strategy from the client’s seat — and how is it still Adapter?

2. How do Nest pipes / guards / interceptors connect GoF Decorator and Chain of Responsibility?

3. Facade vs a TypeORM Repository — related but not the same. What does each hide?

4. In RN, how do these three sit together: Native Module Adapter, RN Bridge transport, GoF Bridge?
