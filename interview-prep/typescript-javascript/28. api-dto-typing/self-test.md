# Practical API DTO Typing — End to End — Self-test

## Core recall

1. What are the three usual layers: entity, request DTO, response DTO?
2. Where should request validation run?
3. Why doesn’t `Omit<User, 'passwordHash'>` remove the property from JSON?
4. What service discipline prevents leaking entities?
5. Name two runtime tools Nest uses for validation / response stripping.
6. Name two ways FE and BE keep types aligned (awareness).
7. Why is `as UserResponseDto` on `res.json()` a trap?
8. What does `whitelist` on ValidationPipe help prevent?

## Explain why

1. Why keep password on `CreateUserDto` but never on `UserResponseDto`?
2. Why map to a **new** object instead of casting the entity?
3. Why validate at the boundary rather than deep in every service method?
4. Why can shared TypeScript types still leave the client unsafe?
5. Why is returning `user` with return type `UserResponseDto` especially dangerous under structural typing?
6. Why mention OpenAPI/GraphQL codegen in an interview about DTOs?

## Compare and contrast

1. Entity vs Create DTO vs Response DTO  
2. Compile-time `Omit` vs runtime `@Exclude` / explicit map  
3. `class-validator` (Nest) vs `zod` (general/FE)  
4. Shared types package vs hand-duplicated interfaces  
5. Trusting BE JSON vs parsing with a schema on the client  
6. Type assertion (`as`) vs constructing a DTO instance/object  

## Predict the behavior

1.
```ts
const user = { id: '1', passwordHash: 'x', email: 'a@b.com' };
function pub(u: User): Omit<User, 'passwordHash'> {
  return u;
}
JSON.stringify(pub(user as User));
// Does passwordHash appear? Why?
```

2.
```ts
return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
// Can passwordHash appear in this object’s JSON?
```

3.
```ts
const data = (await res.json()) as UserResponseDto;
// If server sends passwordHash, is it on `data` at runtime?
```

4.
```ts
CreateUser.parse({ email: 'not-an-email', name: 'ab', password: 'short' });
// zod — success or throw? Why?
```

## Debugging

1. Production response includes `passwordHash` though controller return type is `Omit<User, 'passwordHash'>`. Root cause?

2. Invalid emails reach `UsersService.create`. What’s missing at the boundary?

3. FE crashes on `createdAt.toFixed` because API sends a string date. What sync/validation gap?

4. Extra field `isAdmin: true` in POST body gets saved on the user row. Fix?

5. Serializer configured but entity returned without going through interceptor path / plain object bypass. What happened?

## Application

1. Given `User` with `id`, `email`, `passwordHash`, write `CreateUserDto` fields (conceptual) and `UserResponseDto` fields.

2. Write a `toUserResponse(user: User): UserResponseDto` mapper.

3. Sketch a zod `UserResponse` schema matching the safe fields.

4. List the Nest pipe + interceptor settings you’d enable for this stack.

5. Describe how a monorepo shared package would export `UserResponse` for Nest + React (types only vs zod schema).

## Interview questions

1. `Omit<User, 'passwordHash'>` response still leaks the hash. How? Structural prevention?  
   **Follow-ups:** Nest-specific second layer? FE side?

2. How do you structure entity vs request vs response types end to end?

3. Why isn’t typing the API enough without runtime validation?

4. How would you keep FE and BE types from drifting?

5. What’s wrong with `return user as UserResponseDto`?

## Connections

1. How does erasure make this unit necessary?
2. How does the Nest DTO unit implement the inbound half of this story?
3. How do `Pick`/`Omit` help and where do they stop?
4. How does the unknown-vs-any boundary rule apply to `fetch` responses?
5. How does `strictNullChecks` interact with response DTOs that use optional fields?
