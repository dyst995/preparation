# Design patterns in NestJS / backend — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] Nest’s IoC container is applying which SOLID principle, via which technique? Name both and do not treat them as the same word.
- [ ] Name Nest’s three provider scopes and the lifetime of each. What is the default? If a `REQUEST`-scoped provider is injected into another provider, what happens to that consumer’s scope?
- [ ] What is the classic bug of storing the authenticated user on a default-scoped service? Why is it a concurrency bug, not merely a style issue?
- [ ] Injecting `@InjectRepository(User) repo: Repository<User>` is already which pattern? When is a custom repository class justified? How does Active Record (`user.save()`) differ?
- [ ] In `@Module()`, what is the difference between `providers` and `exports`? Why is exporting `Repository<Appointment>` a broken facade?
- [ ] Recite the Nest HTTP pipeline hops in order. Which GoF pattern is that pipeline? What is each hop for, in one phrase: middleware, guards, interceptors, pipes, filters?
- [ ] Name the three shapes in the “adapter at the edges” story. Give one concrete signal that a Nest CRUD module has too many pattern layers.

## Predict / debug

State the result **and explain why**. For debug items, diagnose and fix.

- [ ] Two overlapping HTTP requests. A default-scoped service does this:
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

- [ ] A JWT guard returns `false` (or throws `UnauthorizedException`) for a POST with a valid-looking JSON body. Do `ValidationPipe` and the controller method run?

- [ ] Clinic staff intermittently see another user’s name on a “current user” header. `CurrentUserService` is `@Injectable()` with no scope, and a middleware does `currentUserService.user = req.user`. Diagnose and fix (prefer the Nest-idiomatic fix).

- [ ] `NotificationsModule` needs to create appointment reminders. It injects `@InjectRepository(Appointment)`. Tests pass; production double-books because `AppointmentsService.create` is the only place that checks conflicts. What boundary was broken, and how should notifications get data?

## Say it out loud

- [ ] Explain design patterns in NestJS in 30–60 seconds as if an interviewer asked.
- [ ] “What design patterns do you actually use in NestJS?”  
  **Follow-ups:** Is DI the same as DIP? Do you need a custom repository for every entity? When would you not add a pattern?
- [ ] “Walk me through a request hitting a Nest app — as a pattern, not as a trivia list.”  
  **Follow-ups:** Where does JWT/RBAC live? Where does DTO validation live? What happens if a guard fails?
