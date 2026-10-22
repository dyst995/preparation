# Behavioral design patterns — Self-test

## Core recall

1. What problem do behavioral patterns address, compared with creational and structural?
2. In one sentence, what is Observer? How does Pub-Sub differ?
3. What is push vs pull notification in Observer?
4. Why must a React `useEffect` that subscribes also unsubscribe? What does Node `EventEmitter.on` return?
5. What is Strategy, and what `if`/`else` problem does it replace?
6. What is Command? Name three things you can do with a command object that you cannot do with a bare function call.
7. Recite the Nest request pipeline order from incoming request to response.
8. Which Nest layers can **stop** the chain, and how?
9. What is Template Method?
10. What is the State pattern in one sentence? What is “boolean soup”?
11. What protocol does `for...of` use? How do generators relate?
12. What is Mediator, in one sentence?

## Explain why

1. Why does emitting `appointment.cancelled` beat `AppointmentsService` calling `BillingService` and `NotificationsService` directly?
2. Why does an anonymous `bus.on('x', () => ...)` become a leak or a stuck listener?
3. Why is Strategy a better fit than a growing `if (method === 'bog')` payment ladder?
4. Why is a VetApp confirmation email a Command (job) rather than work inside the HTTP handler?
5. Why must that job’s `execute` be idempotent?
6. Why is the Nest pipeline Chain of Responsibility even though interceptors also wrap like Decorator?
7. Why does auth/RBAC belong in a **guard**, not in middleware “because middleware runs first”?
8. Why default to Strategy over Template Method in TypeScript/Nest?
9. Why is `isPaid && isCancelled` a smell that State (or a single status) would catch?
10. Why can a Zustand “everyone talks through me” store become a Mediator anti-pattern?

## Compare and contrast

1. Observer vs Pub-Sub (subject holds listeners vs broker/topics).
2. Push Observer vs pull Observer (and where Zustand sits).
3. Strategy vs `if`/`else` ladders.
4. Command vs Strategy vs Observer (what the object represents).
5. Template Method vs Strategy (inheritance skeleton vs injected algorithm).
6. Chain of Responsibility vs Decorator, using Nest guards vs interceptors.
7. State vs a handful of booleans for auth session or order status.
8. Observer vs Mediator (decouple vs hub).
9. Iterator pull (`for...of`) vs Observer push.

## Predict the output

State what happens **and explain why**.

1.
```ts
const bus = new EventEmitter();
let n = 0;
bus.on('tick', () => {
  n += 1;
});
bus.emit('tick');
bus.emit('tick');
console.log(n);
```

2.
```ts
const bus = new EventEmitter();
bus.on('x', () => console.log('a'));
bus.on('x', () => console.log('b'));
bus.emit('x');
```

3.
```ts
type Pay = { charge(): string };
class Bog implements Pay {
  charge() { return 'bog'; }
}
class Flitt implements Pay {
  charge() { return 'flitt'; }
}
function checkout(p: Pay) {
  return p.charge();
}
console.log(checkout(new Flitt()));
```

4.
```ts
const jobs: Array<{ execute(): string }> = [];
jobs.push({ execute: () => 'mail' });
jobs.push({ execute: () => 'sms' });
console.log(jobs.map((j) => j.execute()).join(','));
```

5.
```ts
type Next = () => void;
type Mw = (ok: boolean, next: Next) => void;
const auth: Mw = (ok, next) => {
  if (!ok) { console.log('stop'); return; }
  next();
};
const handler: Mw = () => console.log('handler');
function run(chain: Mw[], ok: boolean) {
  const d = (i: number): void => chain[i]?.(ok, () => d(i + 1));
  d(0);
}
run([auth, handler], false);
run([auth, handler], true);
```

6.
```ts
abstract class Job {
  run() {
    return `start-${this.step()}-end`;
  }
  protected abstract step(): string;
}
class A extends Job {
  protected step() { return 'A'; }
}
console.log(new A().run());
```

7.
```ts
type S = 'pending' | 'paid';
class Order {
  constructor(private s: S = 'pending') {}
  pay() {
    if (this.s !== 'pending') throw new Error('no');
    this.s = 'paid';
  }
}
const o = new Order();
o.pay();
o.pay();
```

8.
```ts
function* ids() {
  yield 1;
  yield 2;
}
const out: number[] = [];
for (const id of ids()) out.push(id);
console.log(out);
```

## Debugging

1.
```ts
useEffect(() => {
  socket.on('appt', (row) => setRow(row));
}, []);
```
Diagnose the leak. How do you fix it? Why is this Observer?

2.
```ts
emitter.on('paid', () => sendReceipt());
// later
emitter.off('paid', () => sendReceipt());
```
Why does the listener stay attached?

3.
```ts
async function charge(method: string, cents: number) {
  if (method === 'bog') return bog(cents);
  if (method === 'flitt') return flitt(cents);
}
// product adds cash-on-delivery next sprint
```
What decays? What pattern, and where does the new code live?

4.
```ts
async createAppointment(dto: CreateDto) {
  const apt = await this.repo.save(dto);
  await this.mailer.sendConfirmation(apt.id); // third-party
  return apt;
}
```
What fails in production? How does Command/jobs change the shape?

5.
```ts
@Injectable()
export class RolesInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const roles = this.reflector.get('roles', ctx.getHandler());
    if (!roles?.includes(userRole(ctx))) throw new ForbiddenException();
    return next.handle();
  }
}
```
Wrong layer. Which pattern/layer is this, and where should it live?

6.
```ts
if (order.isPaid && !order.isCancelled && order.isShipped === false) {
  order.isCancelled = true;
}
```
Name the smell. What breaks? How would State (or one status union) look instead?

7.
```ts
abstract class ExportJob {
  async run() {
    return this.serialize(await this.fetch());
  }
  protected abstract fetch(): Promise<unknown[]>;
  protected abstract serialize(rows: unknown[]): string;
}
class Pdf extends ExportJob {
  protected async fetch() { return []; }
  protected serialize() { return ''; } // skip mapping — PDF needs a different pipeline
  async run() { return this.renderPdf(); } // overrides the skeleton
}
```
What did Template Method just lose? What would you use instead?

## Application

1. Sketch TypeScript for a `PaymentStrategy` with two implementations and a `CheckoutService` that does not `if` on provider names.
2. Write a `useEffect` that subscribes to a Zustand store (or `EventEmitter`) and cleans up correctly. Call out push vs pull in one line.
3. Write a job payload + `process(job)` sketch for VetApp “appointment-confirmation”. Note the idempotency check.
4. Draw (in text) the Nest pipeline and mark which hop is CoR-stop vs onion-wrap.
5. Replace boolean soup `isLoggedIn` / `isExpired` / `isLoggingOut` with a small session status union and two legal transitions.

## Interview questions

1. “What design patterns do you use?” — give a 45-second answer that includes at least Observer, Strategy, and Chain of Responsibility, each tied to your stack.  
   **Follow-ups:** When would you *not* use Observer? How is Nest’s pipeline CoR if interceptors wrap?

2. Walk the Nest request lifecycle as Chain of Responsibility.  
   **Follow-ups:** Guard vs interceptor vs pipe vs filter. Why not auth in middleware?

3. Explain Strategy vs Template Method as if they asked “inheritance or composition for swapping behavior?”  
   **Follow-up:** Payment providers (Bog / Flitt) — which pattern, and why not Template Method?

4. You booked an appointment in VetApp. Why is the confirmation email a background job (Command) and not part of the request?  
   **Follow-up:** What if the worker runs the job twice?

5. How do you avoid memory leaks with Observer in React Native / web?  
   **Follow-up:** `EventEmitter.on` vs Zustand `subscribe` return values.

## Connections

1. How does Nest DI make Strategy natural (`useClass` for a payment token)?
2. How is a BullMQ job payload a serialized Command? How does that connect to idempotency on VetApp payments/notifications?
3. How does Observer (EventEmitter2) prevent the circular module import that `forwardRef()` was papering over?
4. How do interceptors sit on both Chain of Responsibility **and** Decorator?
5. How does State on an auth session connect to “logout is a reset,” not flipping `isLoggedIn`?
6. When does a store stop being a healthy Mediator/Observer hub and become a god object?
