# Typing NestJS Patterns Precisely — Answers

## Core recall

1. Decorators need a **runtime class** for `reflect-metadata`; interfaces/types are **erased**.
2. **`class-validator`** (e.g. `@IsEmail`) and **`class-transformer`** (e.g. `@Exclude` / `@Expose`).
3. Transforms the plain body into a **DTO class instance** (then validation can run on it).
4. Strips properties **without** validation metadata — blocks unexpected fields.
5. Documents/propagates the parameter type (e.g. **`User`**) instead of `any`.
6. **`CanActivate`**; method **`canActivate(context)`**.
7. The current execution (HTTP/RPC/WS) — e.g. **`switchToHttp().getRequest()`**.
8. An **RxJS `Observable`** of the route handler result.
9. **Runtime JSON can still include secrets** — types don’t strip properties from real objects.

## Explain why

1. There’s no runtime constructor/prototype left after compile — nowhere for decorator metadata to live for the pipe to read.
2. Annotations erase; without `ValidationPipe` (+ transform), Nest doesn’t run class-validator on that type.
3. Returning a real entity serializes **own enumerable fields**; TS return types don’t remove properties from the object.
4. Controllers get autocomplete and checking; `any` hides mistakes when `user` shape changes.
5. The generic is compile-time intent; env vars are strings unless you parse/validate at config load.
6. Different boundaries: inbound validation, persistence, outbound safety — one shape usually leaks concerns (e.g. password).

## Compare and contrast

1. **Class:** runtime metadata + TS type. **Interface:** TS only — no decorator validation target.
2. **`Omit`:** compile-time shape for your code. **`@Exclude`/serializer:** runtime field removal on output.
3. **Guard:** allow/deny before handler (`canActivate`). **Interceptor:** wrap handler stream (before/after, transform result).
4. **`@Body()` + pipe:** Nest instantiates/validates DTO. **Assertion:** trust without checks — unsafe.
5. **`get<T>`:** local cast-like typing per key. **Typed config module:** validated object with real parsed types.
6. **`Repository<User>`:** ORM entity type. **`CreateUserDto`:** HTTP input validation type — not interchangeable.

## Predict the behavior / resulting typing

1. Invalid — you can’t put parameter decorators on interface fields that way; interfaces aren’t runtime DTO targets for ValidationPipe metadata.
2. **Nothing safe** — TS types erased; invalid body can reach the method as a plain object.
3. **Yes** — return type doesn’t strip `passwordHash` from the actual object Nest serializes.
4. **Compiles** (if types say `User`); **runtime** `user` may be `undefined` → crashes or wrong behavior.
5. Often still a **string** `"3000"` at runtime without parse — `typeof` is `'string'`.

## Debugging

1. Is `ValidationPipe` global/route-enabled? `transform: true`? DTO is a **class** with decorators? `emitDecoratorMetadata` / `reflect-metadata` imported? Correct `@Body()` type?
2. Augment Express `Request` (`declare global` / module augmentation), or type `getRequest<{ user: User }>()`; ensure `.d.ts` included.
3. Enable **`whitelist: true`** (and often `forbidNonWhitelisted` if you want hard errors).
4. Treat as **`Observable`** (`NestInterceptor` + `CallHandler`); use RxJS operators, not raw `await next.handle()` unless you convert.
5. Env string used as number without validation/transform — `get<number>` didn’t coerce.

## Application

1.
```ts
export class CreateUserDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
```

2.
```ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as User;
  },
);
```

3.
```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    return Boolean(req.headers.authorization);
  }
}
```

4.
```ts
constructor(private readonly config: ConfigService) {}
const url = this.config.getOrThrow<string>('DATABASE_URL');
```

5.
```ts
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
}
// Entity: @Exclude() on passwordHash + ClassSerializerInterceptor
// or map to UserResponseDto explicitly before return
```

## Interview questions

1. **Spoken:** Decorators need a runtime class for metadata; interfaces erase; ValidationPipe reads metadata to validate. Classes give TS + runtime validation together.  
   **Follow-ups:** Pipe transforms/validates body; use serializer/`@Exclude` or response DTO so secrets don’t leak — `Omit` alone isn’t enough.

2. **Spoken:** Type the `createParamDecorator` callback return as `User`; annotate controller param `@CurrentUser() user: User`; augment `Request` if needed.

3. **Spoken:** Guard: `implements CanActivate`, type `ExecutionContext` / `getRequest<Request>()`. Interceptor: `implements NestInterceptor`, `next.handle()` → `Observable`.

4. **Spoken:** `get<T>` / `getOrThrow<T>`, or better a validated typed config object — don’t leave config as implicit `any`.

5. **Spoken:** Create DTO = validated input; entity = DB; response DTO = public fields — separate so passwords never cross the HTTP boundary by accident.

## Connections

1. Erasure removes interfaces → no metadata host → classes required for decorator validation.
2. Augmented `Request.user` makes the decorator’s read type-safe across the app.
3. `Service`/`Repository` generics parameterize entity vs DTO roles without losing type checks.
4. Utilities reshape **types**; serializers reshape **runtime objects** for JSON.
5. Same rule as `unknown`/boundaries: annotate ≠ validate; Nest puts validation on class DTOs + pipes at the edge.
