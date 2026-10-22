# Behavioral design patterns — Answers

## Core recall

1. **How objects communicate and how work/algorithms/state-dependent behavior are assigned.** Creational = how instances are obtained. Structural = how objects are composed into a shape. Behavioral = notify, delegate, queue, swap an algorithm, or change behavior with status.

2. **Observer: a subject notifies dependents when something changes, without hard-coding who they are.** Pub-Sub puts a **broker/topic** in the middle so publishers never hold the listener list. Same one-to-many idea; EventEmitter is Observer-shaped, Nest `EventEmitter2` is Pub-Sub-shaped.

3. **Push:** the notification carries the new data (`emit('paid', payload)`). **Pull:** the subject says “changed” and observers read `getState()` / a store slice. Zustand is hybrid: callback receives state (push) but you typically select a slice (pull-like).

4. **The subject retains a reference to the listener.** If the component unmounts without unsubscribe, it cannot be GC’d and still runs. Node `EventEmitter.on` returns the **emitter**, not an unsubscribe function — you must `off` with the same function. Zustand `subscribe` returns `unsub`.

5. **Interchangeable algorithms behind one interface.** The context calls `strategy.charge()` instead of a growing `if (method === 'bog')` / `'flitt'` ladder. New providers are new classes; the context stays closed.

6. **A request packed as an object** (`execute`, optionally `undo`). You can **queue** it, **retry** it, **undo** it, **log** it, or send it across a process boundary — none of which a vanished function call can do.

7. **middleware → guards → interceptors (pre) → pipes → handler → interceptors (post) → exception filters (on throw) → response.**

8. **Middleware:** omit `next()`. **Guards:** return `false` or throw. **Interceptors:** skip `next.handle()`. **Pipes:** throw (validation). **Handler** throw jumps to **filters**. Filters are the error path’s end, not a “pass along.”

9. **Algorithm skeleton in a base; subclasses override hooks** without changing step order (`run` = fetch → map → serialize).

10. **Behavior changes with internal status; transitions are explicit.** Boolean soup is many independent flags (`isPaid && isCancelled`) that encode illegal combinations.

11. **The iterator protocol:** `next()` → `{ value, done }`. **Generators** (`function*`) produce iterators. `for...of` consumes any iterable.

12. **Colleagues communicate only through a hub**, not with each other. A store or event bus can play this role — and can rot into a god object.

---

## Explain why

1. **Direct calls couple modules and invite circular imports** (`Appointments` → `Billing` → maybe back). An event lets billing and notifications subscribe independently; adding a third listener does not edit `AppointmentsService`. The producer does not need to know the consumer list.

2. **`off` needs the same function reference.** An arrow created at `on` and a *new* arrow at `off` are different functions, so the original stays registered. Combined with a long-lived bus, that is a leak / duplicate handler.

3. **Each new provider edits the same function** (and its tests, and every call site that knows the union of names). Strategy adds a class and a DI binding; `CheckoutService` stays closed (OCP). The variation is `charge`, not a switch on strings.

4. **The user does not need the email to finish for booking to succeed.** A third-party mailer is slow and flaky; awaiting it couples appointment creation to that provider. Packing “send confirmation for `appointmentId`” as a job (Command) returns HTTP immediately and retries independently.

5. **Queues redeliver** (crash mid-job, ack lost, worker retry). `execute` must be safe twice: check “already sent for this appointment” (or an idempotency key) so you do not double-email or double-charge.

6. **The request is passed along a sequence of handlers**, each with one job, each able to stop or continue — that *is* CoR. Interceptors additionally **wrap** before and after (Decorator/onion). Name CoR for the **pipeline**; do not claim interceptors *are* CoR and nothing else.

7. **Middleware runs before Nest has bound handler metadata.** `@Roles()` / `Reflector` live on the route handler — guards run with `ExecutionContext` and can read that. Middleware is for transport (CORS, request id, raw body), not RBAC.

8. **Nest already composes with DI.** Injecting a strategy is the native style. Template Method forces an inheritance tree and a sacred step order. Use it only when many types share a **fixed** lifecycle and only hooks differ; otherwise Strategy (or functions) stay flatter.

9. **Two booleans are four combinations;** `paid && cancelled` is meaningless but representable. A single `status: 'pending' | 'paid' | 'cancelled'` makes that state unrepresentable; `pay()` / `cancel()` reject illegal transitions.

10. **A hub that knows every domain** (checkout, chat, maps, auth) recouples the app in one file. Screens do not talk to each other — they all talk to a god module. Split stores; keep the hub thin. That is Mediator gone wrong, not Observer done well.

---

## Compare and contrast

1. **Observer:** subject holds the list (`on`/`off`/`emit` on one object). **Pub-Sub:** named events on a broker; publishers never see subscribers. EventEmitter ≈ Observer; Nest `EventEmitter2` / `@OnEvent` ≈ Pub-Sub. Same notification idea, different coupling to the subject.

2. **Push** sends data in the event. **Pull** notifies then observers read state. Zustand: subscribe callback gets state (push) but selectors/`getState()` are pull for slices.

3. **Ladder:** all variants live in one function; adding a variant edits it. **Strategy:** variants are types behind one interface; context closed, family open. Two frozen branches can stay an `if`.

4. **Command = this request** (queue/undo/retry). **Strategy = how a step is done** (swap algorithm, caller usually awaits). **Observer = a listener** (publisher typically does not wait for outcomes).

5. **Template Method:** inherit, override hooks, **order fixed in the base**. **Strategy:** inject an object, **swap the whole algorithm**. TS default: Strategy. Template Method when the skeleton *is* the product.

6. **CoR (guards, pipes, middleware):** pass or stop. **Decorator/onion (interceptors):** run before **and** after `next.handle()`. The Nest pipeline as a whole is CoR; interceptors are the wrap-shaped link.

7. **State / one status union:** one current mode, legal transitions, illegal combos unrepresentable. **Booleans:** independent flags, `2^n` soup, `isLoggedIn && isExpired` possible. Auth session and order status want the former.

8. **Observer:** one subject, many listeners, no hub required. **Mediator:** many colleagues only talk through the hub. A store can be both; a bloated store is a Mediator that recouples.

9. **Iterator pull:** consumer asks for the next item (`for...of`, generators). **Observer push:** subject fires when it wants. Do not implement a custom Iterator class to “use the pattern”; `for...of` already is it.

---

## Predict the output

1. **Logs `2`.** Two `emit`s, one listener; each call runs `n += 1`. Synchronous EventEmitter notification.

2. **Logs `a` then `b`.** Multiple listeners on the same event run in registration order. Still push Observer on one subject.

3. **Logs `flitt`.** `checkout` only knows `Pay`; the Flitt strategy is injected. No `if` on provider names — that is Strategy.

4. **Logs `mail,sms`.** Two command objects stored, then executed later. The array is a tiny queue — Command’s “request as object.”

5. **First run logs `stop` only. Second logs `handler`.** `auth` short-circuits when `ok` is false (no `next()`). When true, the chain reaches `handler`. Classic CoR pass-or-stop.

6. **Logs `start-A-end`.** `run()` is the template; `A.step()` fills the hook. Subclass cannot skip `start`/`end` without overriding `run`.

7. **First `pay()` succeeds; second throws `no`.** Status is `paid`; `pay()` is illegal from `paid`. State rejects the transition instead of toggling a second flag.

8. **Logs `[1, 2]`.** The generator is iterable; `for...of` pulls `1` then `2` then `done`. Iterator protocol, not a custom class.

---

## Debugging

1. **`socket.on` without `socket.off` in the effect cleanup.** After unmount (or Strict Mode remount), the handler still runs `setRow` on a dead component / duplicates. Fix: named handler + `return () => socket.off('appt', handler)`. This is Observer: the socket is the subject.

2. **`off` is passed a new arrow, not the function that was registered.** EventEmitter compares references. Keep `const onPaid = () => sendReceipt();` and `on`/`off` that same `onPaid`.

3. **Every new method edits `charge` and its callers.** Use **Strategy**: `CashOnDelivery implements PaymentStrategy`, bind it in DI / a factory. `CheckoutService.pay` unchanged.

4. **Booking latency and failure now depend on the mailer.** If the provider is down, the appointment request fails after the row may already be saved (or the user waits). **Command/job:** `save` then `queue.add('appointment-confirmation', { appointmentId })` and return. Worker sends mail; retries + idempotency.

5. **This is a yes/no gate using handler metadata — a Guard (`CanActivate`), not an interceptor.** Interceptors wrap I/O. Putting RBAC here confuses CoR layers. Use `RolesGuard` + `@Roles()`.

6. **Boolean soup.** `isPaid && !isCancelled && !isShipped` is one of eight combinations; setting `isCancelled` on a paid order may skip refund. Use `status: 'pending' | 'paid' | 'shipped' | 'cancelled'` and `cancel()` that only allows `pending` (paid → refund path).

7. **The subclass overrode `run()`, so the template is gone** — Template Method failed. PDF is a **different algorithm**, not a hook in the same skeleton. Use **Strategy** (`ExportStrategy { run(): Promise<Buffer> }` with `CsvExport` / `PdfExport`) or a separate pipeline.

---

## Application

1.
```ts
interface PaymentStrategy {
  charge(cents: number): Promise<{ ok: boolean }>;
}
class BogPayment implements PaymentStrategy {
  charge(cents: number) { return this.bog.charge(cents); }
}
class FlittPayment implements PaymentStrategy {
  charge(cents: number) { return this.flitt.charge(cents); }
}
class CheckoutService {
  constructor(private readonly gateway: PaymentStrategy) {}
  pay(cents: number) { return this.gateway.charge(cents); }
}
// Nest: { provide: PAYMENT, useClass: BogPayment }
```

2.
```ts
useEffect(() => {
  const unsub = useClinicStore.subscribe((s) => {
    if (s.status === 'expired') resetSession();
  });
  return unsub;
}, []);
```
Zustand pushes `s` into the callback; you pull the `status` slice. For EventEmitter: named `onPaid` + `return () => bus.off('paid', onPaid)` because `.on` does not return `unsub`.

3.
```ts
await queue.add('appointment-confirmation', { appointmentId: apt.id });

async process(job: { data: { appointmentId: string } }) {
  const apt = await this.repo.findOne(job.data.appointmentId);
  if (!apt || apt.confirmationSentAt) return; // idempotent
  await this.mailer.sendConfirmation(apt.id);
  await this.repo.update(apt.id, { confirmationSentAt: new Date() });
}
```
HTTP already returned; this Command runs later.

4.
```
middleware        CoR stop if no next()
guards            CoR stop if false / throw
interceptors pre  onion wrap (also can skip next.handle())
pipes             CoR stop if throw
handler
interceptors post onion wrap
filters           error path only
```

5.
```ts
type Session = 'anonymous' | 'authenticated' | 'expired';
function login(_s: Session): Session { return 'authenticated'; }
function expire(s: Session): Session {
  if (s !== 'authenticated') return s;
  return 'expired';
}
function logout(_: Session): Session { return 'anonymous'; }
```
No `isLoggedIn && isExpired`. Logout is a transition to `anonymous` (plus the real reset: tokens, caches), not a boolean flip.

---

## Interview questions

1. **Spoken:** “The ones I actually ship: **Observer** — Nest `EventEmitter2` so appointments emit `cancelled` and billing/notifications listen, and Zustand subscribe in the UI, always with unsubscribe. **Strategy** — payment behind `PaymentStrategy`, Bog vs Flitt injected with `useClass`, not an if-ladder. **Chain of Responsibility** — the Nest pipeline: middleware, guards, interceptors, pipes, handler, interceptors, filters. Command shows up as queued confirmation jobs. I don’t name a pattern unless I can say when I wouldn’t use it.”  
   **Follow-ups:** Skip Observer when there is one consumer and you must await the outcome. The pipeline is CoR; interceptors also wrap (Decorator). Guards stop; interceptors wrap.

2. **Spoken:** “Request hits middleware (transport, must `next()`), then guards (auth/RBAC yes/no), interceptors pre, pipes validate the DTO, the controller/service run, interceptors post shape the response. If anything threw, exception filters shape the error.”  
   **Follow-ups:** Guard = may this handler run. Interceptor = wrap in/out. Pipe = validate/transform input. Filter = error response. Middleware has no `@Roles()` metadata, so auth/RBAC is a guard.

3. **Spoken:** “If the **order of steps is the product**, Template Method: base `run()` calls hooks. If I need to **swap the whole algorithm**, Strategy: inject an object. In Nest I default to Strategy because DI is already composition.”  
   **Follow-up:** Payments are Strategy. Bog and Flitt are different algorithms, not subclasses of one skeleton. Template Method would fake a shared `charge()` lifecycle they do not share.

4. **Spoken:** “Booking should succeed even if the mailer is slow or down. I save the appointment, enqueue a SendConfirmation command, return. The worker executes later with retries.”  
   **Follow-up:** Jobs redeliver — `execute` checks `confirmationSentAt` (or an idempotency key) so twice is a no-op, not a second email.

5. **Spoken:** “Subscribe in `useEffect` (or `useSyncExternalStore`) and return the unsubscribe. Named listener for EventEmitter because `.on` returns the emitter, not a disposer. Zustand `subscribe` already returns `unsub`. Anonymous arrows cannot be `off`’d.”  
   **Follow-up:** That return-value difference is the leak people miss when they treat `on` like `subscribe`.

---

## Connections

1. **`{ provide: PAYMENT, useClass: BogPayment }` is Strategy wiring.** The token is the interface; `useClass` picks the algorithm. Tests `useClass` a fake. Same DIP story as Nest providers, applied to “swap payment.”

2. **`queue.add(name, data)` serializes the command** (name + args). The worker deserializes and `execute`s. Idempotency is required because serialization/redelivery can run it twice — VetApp confirmation and payment reconcile both need that.

3. **Appointments emit; Billing `@OnEvent`s.** Neither module imports the other, so you do not need `forwardRef()` for “after cancel, refund.” Observer/Pub-Sub replaces a circular call graph.

4. **The pipeline passes the request along (CoR).** An interceptor is one link that **wraps** `next.handle()` so it can run before and after (Decorator). Both names are honest if you say which part you mean.

5. **Session status is a state machine** (`anonymous` / `authenticated` / `expired`). Logout is a **transition** plus a reset checklist (tokens, RQ cache, nav), not `isLoggedIn = false` while other flags still say “has token.” State makes the illegal combo unrepresentable; the product still has to clear storage.

6. **When the hub imports every feature’s side effects** — one `useAppStore` for checkout, chat, maps, auth. Healthy: domain stores + events. Unhealthy Mediator: everyone talks through a god module that recouples what Observer was meant to split.
