# Practical API DTO Typing — End to End — Answers

## Core recall

1. **Entity** = persistence/domain; **request DTO** = validated inbound; **response DTO** = public outbound fields.
2. At the **HTTP (or IPC) boundary** — pipe/schema parse before business logic trusts the data.
3. Types are **erased**; `Omit` doesn’t delete runtime properties from the object.
4. **Never return the raw entity** — always map to an explicit response object/DTO.
5. **`class-validator` + ValidationPipe**; **`class-transformer` `@Exclude` + ClassSerializerInterceptor** (and/or explicit mapping).
6. **Shared types package**; **OpenAPI/GraphQL codegen** (or similar schema-first flow).
7. Assertion doesn’t validate — wrong/extra fields can still be present at runtime.
8. Strips (or can forbid) **properties without validation metadata** — blocks unexpected body keys.

## Explain why

1. Create needs the plaintext password to hash; responses must never expose hashes (or plaintext).
2. A new object **physically lacks** the secret key; a cast only changes the compiler’s view of the same object.
3. One enforcement point — DRY, consistent errors (`400`), services stay free of ad-hoc checks.
4. Shared types erase on the client too; network JSON is still untrusted until parsed.
5. Structural typing may allow returning a wider object where a narrower return type is declared; the extra props remain for JSON.
6. Shows you know drift is a real failure mode and schema/codegen is how larger systems stay aligned.

## Compare and contrast

1. **Entity:** full stored shape. **Create:** input fields (+ password). **Response:** safe public subset.
2. **`Omit`:** compile-time only. **Map/`@Exclude`:** runtime shape for serializers.
3. Both validate at boundaries; Nest decorators hang on **classes**; zod is often **schema-first** + `infer` (great on FE too).
4. **Shared package:** one definition. **Duplication:** easy silent drift.
5. **Trust:** `as` / hope. **Parse:** schema succeeds or errors before UI use.
6. **`as`:** lie to compiler. **Construct:** real object with chosen keys.

## Predict the behavior

1. **Yes** — same object reference/shape still has `passwordHash`; stringify includes it. (Exact assignability of `return u` may error under some settings; the leak pattern holds when the entity is returned/asserted through.)
2. **No** — those keys were never copied onto the new object.
3. **Yes** — assertion doesn’t strip; property exists on the parsed object if the server sent it.
4. **Throw** (ZodError) — email and password fail schema checks.

## Debugging

1. Returned/serialized the **entity** (or cast it); type lied; JSON used runtime keys.
2. Missing/disabled **ValidationPipe** / non-class DTO / no schema parse.
3. No shared contract or client parse — assumed `Date` vs ISO **string**; validate/coerce at boundary.
4. Enable **`whitelist`** (and optionally `forbidNonWhitelisted`); don’t map unknown keys into `save`.
5. Interceptor only serializes class instances on the path it wraps — returning a raw plain entity bypass or wrong setup skips `@Exclude`.

## Application

1. **Create:** `name`, `email`, `password`. **Response:** `id`, `email` (and other public fields) — **not** `passwordHash`.
2.
```ts
function toUserResponse(user: User): UserResponseDto {
  return { id: user.id, email: user.email /* + public fields */ };
}
```
3.
```ts
const UserResponse = z.object({
  id: z.string(),
  email: z.string().email(),
  // …
});
```
4. Global `ValidationPipe({ transform: true, whitelist: true })`; `ClassSerializerInterceptor`; map in service anyway.
5. Export zod schemas + `z.infer` types from `packages/api-types`; Nest reuses or mirrors; React parses with same schema — types-only export is weaker without parse.

## Interview questions

1. **Spoken:** Erasure — `Omit` doesn’t remove runtime props; stringify leaks. Build a new DTO/object; Nest `@Exclude` + serializer as second layer.  
   **Follow-ups:** FE: parse JSON with zod; don’t `as` trust.

2. **Spoken:** Entity canonical; create/update DTOs validated in; response DTO mapped out; entity stays in service/persistence.

3. **Spoken:** Types don’t run at runtime; untrusted JSON needs schema/pipe; outbound needs real field stripping/mapping.

4. **Spoken:** Shared package or OpenAPI/GraphQL codegen; avoid dual hand-maintained interfaces with no process.

5. **Spoken:** Assertion doesn’t change the object — secrets remain enumerable for JSON.

## Connections

1. Without erasure awareness, people treat types as runtime filters — this unit exists to correct that.
2. Nest unit: class DTOs + ValidationPipe are the inbound implementation of boundary validation.
3. `Pick`/`Omit` document intent and help map typings; they **stop** at the runtime object.
4. `res.json()` → `unknown` → parse — same as not using `any` for untrusted data.
5. Optional response fields must be `| undefined` / optional in the DTO and handled in UI under strict null checks.
