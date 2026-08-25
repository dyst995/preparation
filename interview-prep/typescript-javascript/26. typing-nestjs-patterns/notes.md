# Typing NestJS Patterns Precisely

## What you need to know

Nest sits on TypeScript + Express (or Fastify) + decorators. The patterns that matter in interviews:

- **DTO classes** as the joint **compile-time type** and **runtime validation** source of truth (`class-validator` / `class-transformer`)
- Why **`class`**, not `interface`/`type` (erasure + `reflect-metadata`)
- **Generic** services/repositories wired end-to-end with validated DTOs
- **Custom param decorators** with typed returns (`CurrentUser`)
- Typing **guards** / **interceptors** (`CanActivate`, `ExecutionContext`, `NestInterceptor`)
- **`ConfigService.get<T>()`** so config isn’t secretly `any`

Prerequisites: [type erasure / structural typing](../14.%20typescript-structural-erased/notes.md), [declaration merging](../24.%20declaration-merging/notes.md) (`Request.user`), [generics](../18.%20generics/notes.md).

---

## DTOs: runtime + type source of truth

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Pipeline (mental model)

1. HTTP body arrives as a plain object (untrusted).  
2. `ValidationPipe` (with `transform: true`) uses **class-transformer** to instantiate `CreateUserDto`.  
3. **class-validator** reads decorator metadata and validates.  
4. Controller method receives a **typed** `CreateUserDto` instance (or Nest throws `400`).

```ts
@Post()
create(@Body() dto: CreateUserDto) {
  return this.users.create(dto);
}
```

Without the pipe + class DTO, `dto: CreateUserDto` is **only a TypeScript annotation** — erasure means nothing validates at runtime.

Enable typically:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

- **`transform`:** plain object → class instance  
- **`whitelist`:** strip properties without decorator metadata (helps block unexpected fields)

---

## Why Nest DTOs must be classes

Preserved mechanical reason:

> `interface` / `type` are **erased**. Decorators like `@IsEmail()` need a **runtime target** so metadata can attach via `reflect-metadata`. Nest’s `ValidationPipe` reads that metadata to validate. A **`class`** compiles to a real constructor function; an interface leaves nothing to decorate.

### Interview answer (preserved)

> Validation decorators need a real runtime target for `reflect-metadata`. Interfaces/types vanish at compile time. A class becomes a constructor, so it carries **both** compile-time checking and runtime validation metadata.

### What “metadata” means (enough for interviews)

Decorators record “this property should be an email / min length 8” on the prototype/constructor. The pipe reflects that and runs checks. No class → no place to hang those rules → no automatic validation from decorators.

---

## Response shapes: types vs runtime stripping

```ts
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  // passwordHash intentionally omitted
}
```

Compile-time `Omit<User, 'passwordHash'>` only constrains **what you write in TS**. If you `return userEntity` and Nest JSON-serializes the real object, **`passwordHash` can still leak**.

Safer pattern:

- Response DTO class + **`ClassSerializerInterceptor`**
- `@Exclude()` / `@Expose()` from **class-transformer** on entity/DTO fields

So you get:

| Layer | Role |
| --- | --- |
| TypeScript DTO / `Omit` | Catch mistakes in your code |
| Serializer + `@Exclude` | Strip sensitive fields at **runtime** before JSON |

Interview line: **type safety alone is not an output filter.**

---

## Generic services / repositories (end-to-end)

```ts
injectable abstract pattern — sketch:

abstract class CrudService<TEntity, TCreate, TUpdate> {
  abstract create(dto: TCreate): Promise<TEntity>;
  abstract update(id: string, dto: TUpdate): Promise<TEntity>;
}

@Injectable()
class UsersService extends CrudService<User, CreateUserDto, UpdateUserDto> {
  create(dto: CreateUserDto) { /* persist */ }
  update(id: string, dto: UpdateUserDto) { /* … */ }
}
```

Generics keep **entity** and **validated DTO** roles distinct:

- `CreateUserDto` — inbound, validated  
- `User` / entity — persistence shape  
- `UserResponseDto` — outbound, safe fields  

Don’t type the whole stack as one `any`-ish object “user.”

Repositories often look like `Repository<User>` (TypeORM) — the generic parameter is the **entity class** (again a runtime construct for the ORM), separate from HTTP DTOs.

---

## Custom parameter decorators

```ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as User; // ideally typed via Express augmentation
  },
);

@Get('me')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### How typing helps

The factory’s **return type** (`User`) documents what controllers receive. Prefer that over `any`. Still: the decorator only **reads** `request.user` — a **guard/middleware** must set it, and [declaration merging](../24.%20declaration-merging/notes.md) makes `Request.user` known to TS.

`data` is the optional argument to `@CurrentUser('email')`-style usage; type it if you use it (`data: keyof User | undefined`).

---

## Guards and interceptors

### Guard

```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    return Boolean(req.headers.authorization);
  }
}
```

- **`CanActivate`** — implement `canActivate`  
- **`ExecutionContext`** — abstract wrapper; `switchToHttp()` / `switchToRpc()` / `switchToWs()` to get the right request  
- Return `true` to allow, `false`/throw to block  

Typing `getRequest<Request>()` (or a custom request type) avoids `any` on `req`.

### Interceptor

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    return next.handle().pipe(
      tap(() => console.log(`After ${Date.now() - now}ms`)),
    );
  }
}
```

- **`NestInterceptor`** — `intercept(context, next)`  
- **`CallHandler`** — `next.handle()` returns an **`Observable`** (RxJS) of the handler result  
- Map/transform responses here (or use `ClassSerializerInterceptor` for DTO serialization)

You don’t need deep RxJS for interviews — know the signatures and that interceptors wrap the stream before/after the handler.

---

## `ConfigService` and `get<T>()`

```ts
constructor(private readonly config: ConfigService) {}

const port = this.config.get<number>('PORT'); // number | undefined
const url = this.config.getOrThrow<string>('DATABASE_URL');
```

Without `<T>`, values are often loosely typed. Prefer:

- **`get<T>(key)`** / **`getOrThrow<T>(key)`** with an explicit `T`  
- Or a **typed config object** via custom config factory / `ConfigType<typeof appConfig>` so keys aren’t free-form strings everywhere  

Caveat: `get<number>('PORT')` is a **type assertion-shaped generic** — it does not coerce strings from env. Use `transform` in config validation (e.g. Joi/Zod/class-validator on a config class) if you need real parsing. The generic documents intent and improves call-site checking; validation still belongs at config load.

---

## End-to-end request picture

```
HTTP JSON
  → ValidationPipe + CreateUserDto (class + decorators)
    → Controller (@Body dto: CreateUserDto)
      → Service generics / business logic
        → Entity / DB
          → Response DTO + serializer (strip secrets)
            → JSON out

Auth path:
  Guard sets req.user
  → declare global Express.Request.user
  → @CurrentUser() user: User
```

---

## Common mistakes and misconceptions

1. Using `interface` DTOs and expecting `ValidationPipe` decorator validation to work.  
2. Believing `@Body() dto: CreateUserDto` validates without `ValidationPipe` / transform.  
3. Returning entities with secrets and relying only on `Omit<>` types.  
4. `@CurrentUser()` typed as `User` while never setting `req.user` in a guard.  
5. `config.get('PORT')` used as `number` without parse/validation — generic lies if env is a string.  
6. Skipping `whitelist` and accepting unexpected body keys into persistence.  
7. Treating guards/interceptors as “untyped Express middleware” — Nest gives `ExecutionContext` for a reason.

---

## Connections to other concepts

```
type erasure
  → interfaces can't hold decorator metadata
    → DTO classes required

reflect-metadata + decorators
  → ValidationPipe / serializer

declaration merging
  → Request.user for @CurrentUser

generics
  → CrudService / Repository<Entity> / get<T>

Omit / Pick (compile-time)
  ≠ runtime exclude of passwordHash
```

---

## Interview perspective

You should be able to:

1. Explain **why DTO classes**, not interfaces (strong answer above).  
2. Contrast **compile-time Omit** vs **runtime serialization** for secrets.  
3. Sketch `createParamDecorator` returning `User`.  
4. Name `CanActivate` / `ExecutionContext` / `NestInterceptor` roles.  
5. Say how `get<T>()` helps — and what it doesn’t do alone.

---

# Self-test

## Core recall

1. Why are Nest DTOs classes instead of interfaces?
2. What libraries provide `@IsEmail` / `@Exclude` typically?
3. What does `ValidationPipe` + `transform: true` do to a body?
4. What does `whitelist: true` do?
5. What does `createParamDecorator` return typing buy you?
6. What interface do guards implement? What method?
7. What does `ExecutionContext` help you access?
8. What does a `NestInterceptor`’s `next.handle()` return?
9. What is the risk of only using `Omit<User, 'passwordHash'>` on responses?

## Explain why

1. Why can’t `@IsEmail()` attach meaningfully to an `interface`?
2. Why is `dto: CreateUserDto` on `@Body()` insufficient alone for security/validation?
3. Why might `ClassSerializerInterceptor` + `@Exclude()` be required even with careful TS types?
4. Why type `@CurrentUser()` as returning `User` rather than `any`?
5. Why is `config.get<number>('PORT')` not enough to guarantee a number at runtime?
6. Why keep Create DTO, Entity, and Response DTO as separate types/classes?

## Compare and contrast

1. DTO `class` vs DTO `interface` in Nest  
2. `Omit` / mapped types vs `@Exclude` / serializer  
3. Guard vs interceptor (when each runs / purpose)  
4. `@Body() dto: CreateUserDto` vs Express `req.body as CreateUserDto`  
5. `ConfigService.get<T>()` vs a validated typed config module  
6. Generic `Repository<User>` vs HTTP `CreateUserDto`

## Predict the behavior / resulting typing

1. `interface CreateUserDto { @IsEmail() email: string }` — what goes wrong conceptually?

2. ValidationPipe off; controller has `@Body() dto: CreateUserDto`; client sends `{ email: 123 }`. What does TypeScript guarantee at runtime?

3. Entity has `passwordHash`; controller `return userEntity` with only a return type `Omit<User, 'passwordHash'>`. Can JSON still include `passwordHash`?

4. `@CurrentUser() user: User` but no auth guard set `req.user`. What happens at runtime vs compile time?

5. `this.config.get<number>('PORT')` and env has `PORT=3000` (string). What is the runtime typeof without extra parsing?

## Debugging

1. Decorators on DTO ignored; invalid bodies reach the service. Checklist?

2. `request.user` errors in `CurrentUser` decorator: property doesn’t exist on type. Fix approaches?

3. Extra fields like `role: 'admin'` in POST body get saved. What pipe option helps?

4. Interceptor typed poorly; `next.handle()` treated like a Promise. What’s the usual Nest type?

5. Config used as number but concatenation produces `"3000" + 1` style bugs. Root cause?

## Application

1. Write a `CreateUserDto` class with `name` (string, min 2), `email` (email), `password` (string, min 8).

2. Sketch `CurrentUser` param decorator returning `User` from HTTP request.

3. Sketch an `AuthGuard` implementing `CanActivate` that returns false when `Authorization` header is missing.

4. Show `config.getOrThrow<string>('DATABASE_URL')` usage in a constructor-injected service.

5. Sketch a `UserResponseDto` and note how you’d prevent `passwordHash` from serializing (decorator or omit-from-class).

## Interview questions

1. Why are NestJS DTOs written as classes instead of TypeScript interfaces?  
   **Follow-ups:** What role does `ValidationPipe` play? What about response leakage?

2. How do custom param decorators get proper TypeScript types?

3. How do you type guards and interceptors in Nest?

4. How do you avoid `any` with `ConfigService`?

5. Explain Create DTO vs entity vs response DTO.

## Connections

1. How does type erasure force the DTO-class pattern?
2. How does Express `Request` augmentation connect to `@CurrentUser()`?
3. How do generics show up in Nest services/repositories?
4. Why don’t utility types like `Omit` replace class-transformer for output safety?
5. How is this the backend counterpart to “types aren’t runtime validation” from the React/unknown units?
