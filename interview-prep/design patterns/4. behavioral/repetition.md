# Behavioral design patterns — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Recite the Nest request pipeline order from incoming request to response. Which layers can stop the chain, and how?
- [ ] Observer in one sentence vs Pub-Sub. Push vs pull. Why `useEffect` must unsubscribe, and what `EventEmitter.on` returns.
- [ ] Strategy vs a growing `if (method === 'bog')` payment ladder. Where Bog vs Flitt live in Nest.
- [ ] Command vs Strategy vs Observer — what each object represents. Why a VetApp confirmation email is a job, and why `execute` must be idempotent.
- [ ] Template Method vs Strategy (inheritance skeleton vs injected algorithm). When you would *not* use Template Method in TypeScript.
- [ ] State vs boolean soup (`isPaid && isCancelled`). One status union for orders or auth session.
- [ ] Auth/RBAC in a guard, not middleware “because it runs first.” Interceptors wrap; they are not the whole Chain of Responsibility.

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ]
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

- [ ] Diagnose:
```ts
emitter.on('paid', () => sendReceipt());
// later
emitter.off('paid', () => sendReceipt());
```
Why does the listener stay attached?

- [ ] Diagnose:
```ts
async createAppointment(dto: CreateDto) {
  const apt = await this.repo.save(dto);
  await this.mailer.sendConfirmation(apt.id);
  return apt;
}
```
What fails in production? How does Command/jobs change the shape?

- [ ] Wrong layer:
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
Which pattern/layer is this, and where should it live?

## Say it out loud

- [ ] Explain behavioral patterns in 30–60 seconds as if an interviewer asked “what design patterns do you use?” Include Observer, Strategy, and Chain of Responsibility, each tied to your stack, plus one **when not**.
- [ ] Walk the Nest request lifecycle as Chain of Responsibility.  
  **Follow-ups:** Guard vs interceptor vs pipe vs filter. Why not auth in middleware? How can interceptors also be Decorator?
- [ ] You booked an appointment in VetApp. Why is the confirmation email a background job (Command)?  
  **Follow-up:** What if the worker runs the job twice?
