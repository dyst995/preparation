# Structural design patterns — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] State Adapter in one sentence: what do you wrap, and what do you present to the client?
- [ ] Name three reasons you introduce a Proxy (not an Adapter). Adapter vs Proxy.
- [ ] Why is `@Injectable()` / `@Get()` / `@IsEmail()` not the GoF Decorator pattern, even though the word is the same?
- [ ] State Facade in one sentence. Adapter vs Facade.
- [ ] In GoF Bridge, what two things are decoupled so they can vary independently? GoF Bridge vs React Native Bridge.
- [ ] Why is “I used Composite because I wrote React components” a weak interview answer?

## Predict / debug

State the result **and explain why**. For debug items, diagnose the bug.

- [ ]
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

- [ ]
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

- [ ] `PlaceOrderService.place()` returns `{ order, stripeCharge, mailResult }`. The controller then reads `stripeCharge.outcome.network_status`. What went wrong with the Facade?

- [ ] A candidate says: “Yes, I used the Bridge pattern — React Native’s Bridge between JS and native, plus our Native Module wrapping Zebra’s SDK.” What did they conflate? How should they relabel the pieces?

## Say it out loud

- [ ] Explain structural design patterns in 30–60 seconds as if an interviewer asked.
- [ ] Someone says “React Native uses the Bridge pattern.” How do you answer?  
  **Follow-ups:** If you wrap a native SDK for JS, what pattern is that? What is JSI changing?
- [ ] We need to add PayPal next to Stripe. Walk me through the change.  
  **Follow-ups:** What does `CheckoutService` import after the change? Where does amount/currency translation live?
