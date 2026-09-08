# Typing NestJS Patterns Precisely — Self-test

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
