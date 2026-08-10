# 05. Typing NestJS patterns precisely

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] DTOs with `class-validator`/`class-transformer` decorators as the runtime+type source of truth
- [ ] Why Nest DTOs are classes, not plain `interface`/`type` (decorators require a real runtime construct)
- [ ] Generic services/repositories (recap, now end-to-end with validation)
- [ ] Custom parameter decorators with typed return values
- [ ] Guards/interceptors typing (`CanActivate`, `ExecutionContext`, `NestInterceptor`)
- [ ] `ConfigService` generic `get<T>()` typing patterns

### Why NestJS DTOs must be classes

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

`interface` and `type` are erased at compile time (chapter 3, section 1) - decorators like `@IsEmail()` need to attach metadata to something that **exists at runtime** so Nest's `ValidationPipe` can read it and actually validate incoming request bodies. A `class` compiles to a real JS constructor function that decorators can attach `reflect-metadata` to; an `interface` has nothing left to attach anything to. This is the concrete, mechanical reason - not convention - that DTOs are classes in Nest.

### Deriving response shapes safely

```ts
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  // passwordHash intentionally omitted - never expose it
}
```

Combined with a `ClassSerializerInterceptor` and `@Exclude()`/`@Expose()` from `class-transformer`, this pattern gives you both a compile-time DTO type and a runtime guarantee that sensitive fields are stripped before serialization - type safety alone (an `Omit<>` type) only protects you at compile time; it does nothing to stop an object with an actual `passwordHash` property from being JSON-serialized by mistake if the type is only enforced at the boundary and not runtime-stripped.

### Custom decorator with a typed return

```ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

@Get('me')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

The decorator factory's return type (`User`) flows through to the `@CurrentUser() user: User` parameter - this is why the decorator itself is typed to return `User`, not `any`, even though the underlying mechanism is just reading a property off the request object at runtime.

### Interview question

**Q: Why are NestJS DTOs written as classes instead of TypeScript interfaces?**

**Strong answer:**
> "Because validation decorators like `@IsEmail()` or `@MinLength()` need a real runtime target to attach metadata to via `reflect-metadata` - Nest's `ValidationPipe` reads that metadata at request time to actually validate the incoming body. Interfaces and type aliases are fully erased during compilation, so there's nothing left at runtime for a decorator to attach to. A class compiles down to an actual constructor function, which is why it's the only one of the three that can carry both the compile-time type checking and the runtime validation metadata simultaneously."

---
