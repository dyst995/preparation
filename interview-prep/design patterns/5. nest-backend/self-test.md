# Design patterns in NestJS / backend — Self-test

## Core recall

1. Nest’s IoC container is applying which SOLID principle, via which technique? Name both and do not treat them as the same word.
2. What is constructor injection, and what does the class declare versus what the container does?
3. Why do interface dependencies need `@Inject(TOKEN)` while class dependencies often do not?
4. Name Nest’s three provider scopes and the lifetime of each.
5. What is Nest’s **default** provider scope?
6. What is the classic bug of storing the authenticated user on a default-scoped service?
7. If a `REQUEST`-scoped provider is injected into another provider, what happens to that consumer’s scope?
8. In one request, you inject the same provider twice. How many instances do you get if it is `REQUEST`? If it is `TRANSIENT`?
9. Injecting `@InjectRepository(User) repo: Repository<User>` is already which pattern?
10. When is a custom `UsersRepository` / `AppointmentsRepository` class justified? When is it not?
11. What is TypeORM Active Record, and how does a call like `user.save()` differ from `this.repo.save(user)`?
12. In `@Module()`, what is the difference between `providers` and `exports`?
13. Recite the Nest HTTP pipeline hops **in order**.
14. Which GoF pattern is that pipeline? What is each hop for, in one phrase: middleware, guards, interceptors, pipes, filters?
15. Which GoF pattern is wrapping Bank of Georgia (or Flitt) behind `PaymentGateway`?
16. Name the three shapes in the “adapter at the edges” story.
17. Give one concrete signal that a Nest CRUD module has too many pattern layers.

## Explain why

1. Why does constructor injection beat Service Locator (`moduleRef.get` inside methods) and beat `import { payments } from './payments.singleton'` for tests and for reading a class?
2. Why is `this.user = request.user` on a singleton a **concurrency** bug, not merely a style issue?
3. Why does Nest bubble `REQUEST` scope to consumers instead of letting a singleton hold a request-scoped collaborator?
4. Why prefer passing `user` as a method argument over making `UsersService` request-scoped “just in case”?
5. Why does Nest bother injecting `Repository<User>` instead of calling static `User.find()` everywhere?
6. Why is exporting `Repository<Appointment>` from `AppointmentsModule` a broken facade even if it compiles?
7. Why is a **guard** the right hop for JWT/RBAC, not an interceptor or a filter?
8. Why adapt vendor SDK types at the edge instead of letting `order_id` / `amountTetri` appear in `PaymentsService`?
9. Why is a 15-file ports/use-cases/mappers stack for `PATCH /users/:id` usually **not** more senior?

## Compare and contrast

1. DIP vs DI.
2. Constructor injection vs Service Locator vs a module-level singleton import.
3. `DEFAULT` (singleton) vs `REQUEST` vs `TRANSIENT`.
4. Pass `user` as an argument vs `Scope.REQUEST` context service vs a field on a singleton.
5. TypeORM `Repository<T>` vs a custom repository class vs Active Record (`BaseEntity`).
6. Module `providers` vs `exports` (facade).
7. Guard vs interceptor vs pipe vs exception filter vs middleware.
8. HTTP DTO vs domain/service types vs payment SDK payload.
9. Adapter vs Facade in Nest (payment wrapper vs module `exports`).
10. “Nest already structured this CRUD module” vs “clean architecture ceremony.”

## Predict the output

State what happens **and explain why**.

1. Two overlapping HTTP requests. A default-scoped service does this:
```ts
@Injectable()
export class RequestContext {
  user?: { id: number; role: string };
  setUser(u: { id: number; role: string }) { this.user = u; }
  getUser() { return this.user; }
}
```
Request A: `setUser({ id: 1, role: 'receptionist' })`, then `await` a DB call, then `getUser()`.  
Request B (during A’s await): `setUser({ id: 2, role: 'admin' })`.  
What can `getUser()` return on request A?

2. `AuthService` is `Scope.REQUEST`. `AppointmentsService` (no scope set) injects `AuthService`. What scope does `AppointmentsService` effectively have, and what is the cost?

3. `SlotPolicy` is in `AppointmentsModule.providers` but **not** in `exports`. `BillingModule` imports `AppointmentsModule` and injects `SlotPolicy` in `BillingService`. What happens at startup?

4. A JWT guard returns `false` (or throws `UnauthorizedException`) for a POST with a valid-looking JSON body. Do `ValidationPipe` and the controller method run?

5.
```ts
@Injectable({ scope: Scope.TRANSIENT })
export class Counter { n = 0; inc() { this.n += 1; return this.n; } }

@Injectable()
export class ReportsService {
  constructor(private readonly a: Counter, private readonly b: Counter) {}
  pair() { return [this.a.inc(), this.b.inc()]; }
}
```
`ReportsService` is default-scoped. What does `pair()` return on the first call? Why?

## Debugging

1. Clinic staff intermittently see another user’s name on a “current user” header. `CurrentUserService` is `@Injectable()` with no scope, and a middleware does `currentUserService.user = req.user`. Diagnose and fix (prefer the Nest-idiomatic fix).

2. `NotificationsModule` needs to create appointment reminders. It injects `@InjectRepository(Appointment)`. Tests pass; production double-books because `AppointmentsService.create` is the only place that checks conflicts. What boundary was broken, and how should notifications get data?

3. `AppointmentsController.create` imports `BogSdk` and passes `dto` fields straight into `sdk.createPayment`. Tests need the real SDK. Which pattern is missing, and where should it live?

4. A junior adds `create-appointment.use-case.ts`, `appointment.mapper.ts`, `appointment.repo.port.ts`, and `appointment.repo.adapter.ts` for a module whose service is `return this.repo.save(this.repo.create(dto))`. What do you say in review, and what would justify those files later?

## Application

1. Sketch `Test.createTestingModule` for `PaymentsService` so `PAYMENT_GATEWAY.charge` is a mock. Constructor-inject the gateway; do not use `ModuleRef.get`.

2. Write a minimal `PaymentGateway` interface and a `BogPaymentAdapter` that maps `amountCents` → `amountTetri` and `order_id` → `providerRef`. `PaymentsService` must not mention those vendor names.

3. Sketch an `AppointmentsModule` that keeps `SlotPolicy` internal and exports only `AppointmentsService`.

4. Refactor this controller/service pair so the user is not stored on the service:
```ts
@Injectable()
export class AppointmentsService {
  currentUser?: AuthUser;
  create(dto: CreateAppointmentDto) {
    return this.repo.save({ ...dto, createdBy: this.currentUser!.id });
  }
}
```

## Interview questions

1. “What design patterns do you actually use in NestJS?”  
   **Follow-ups:** Is DI the same as DIP? Do you need a custom repository for every entity? When would you not add a pattern?

2. “Walk me through a request hitting a Nest app — as a pattern, not as a trivia list.”  
   **Follow-ups:** Where does JWT/RBAC live? Where does DTO validation live? What happens if a guard fails?

3. “Repository pattern versus TypeORM Active Record — which do you use in Nest, and why?”  
   **Follow-ups:** Is `@InjectRepository(User)` enough? When do you write `AppointmentsRepository`?

4. “How did you structure the VetApp Nest rewrite in terms of patterns — modules, auth, payments?”  
   **Follow-ups:** What did you deliberately *not* introduce? How would Flitt (Wizer) differ from Bank of Georgia at the code level?

## Connections

1. How does DIP make a payment **Adapter** cheap to swap (BoG vs Flitt vs a test fake)?
2. How is a Nest module a **Facade** over a DI graph, and how does that protect invariants that live in a service rather than a repository?
3. How does the pipeline as **Chain of Responsibility** connect to VetApp JWT/RBAC without putting role checks in the payment adapter?
4. HTTP DTOs and `BogPaymentAdapter` are both **Adapter**. How are they the same pattern, and why are they not the same layer?
5. How is “user field on a singleton service” a misuse of the same default singleton that is *correct* for a stateless `AppointmentsService`?
