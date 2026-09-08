# Practical API DTO Typing — End to End

## What you need to know

This unit is the **discipline** that ties Nest DTOs, erasure, and utility types together:

1. One **entity** (or domain model) as the persistence source of truth  
2. **Request DTOs** validated at the HTTP boundary  
3. **Response DTOs** that actually omit secrets at **runtime**, not only in types  
4. Awareness of **FE/BE sync** (shared package / OpenAPI codegen)  
5. Why **“typed response ⇒ safe”** is a trap without validation / mapping  

Prerequisites: [typing Nest patterns](../26.%20typing-nestjs-patterns/notes.md), [type erasure](../14.%20typescript-structural-erased/notes.md), [utility types / Omit](../19.%20utility-types/notes.md), [unknown vs any](../20.%20unknown-vs-any/notes.md).

---

## Single source of truth, then derive

```ts
// 1. Entity - source of truth (persistence / domain)
export class User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// 2. Request DTO - validated at the boundary
export class CreateUserDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

// 3. Response DTO - public fields only
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  // no passwordHash
}
```

### Mental model

| Layer | Owns | Contains secrets? |
| --- | --- | --- |
| Entity | DB / domain | Often yes (`passwordHash`) |
| Create/Update DTO | Inbound HTTP | Passwords in **plain** for input only; never hashes outbound |
| Response DTO | Outbound HTTP | **No** secrets |

“Derive” can mean:

- Hand-written response/request classes aligned with the entity  
- `Pick` / `Omit` **types** for compile-time helpers (not sufficient alone for JSON)  
- Codegen from OpenAPI/GraphQL (FE/BE share a schema)

The entity is the **canonical field list**; request/response are **projections** for directions of travel.

---

## Request validation at the boundary

Untrusted JSON enters as a plain object. Types on `@Body()` erase — they do not parse or validate.

**Nest:** `class-validator` + `ValidationPipe` (`transform`, `whitelist`) on DTO **classes**.  
**Elsewhere:** `zod` / `yup` / Valibot schemas — parse → typed value or error.

```ts
// zod sketch (non-Nest)
const CreateUser = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
type CreateUser = z.infer<typeof CreateUser>;
const dto = CreateUser.parse(req.body); // throws or returns validated data
```

**Rule:** validate/parse **once** at the edge; inner code trusts the DTO type because the boundary already enforced it.

---

## Response shape: compile-time + runtime

### The leak

```ts
function toPublic(user: User): Omit<User, 'passwordHash'> {
  return user; // often compiles (excess property / return compatibility pitfalls)
}
// JSON.stringify(toPublic(user)) may still include passwordHash
```

`Omit` only changes the **type**. The **object** still has the property. Serializers walk **runtime** keys.

### Structural fixes

1. **Explicit map** to a new object / `UserResponseDto` (preferred discipline in the curriculum example).  
2. Nest: `@Exclude()` on sensitive entity fields + `ClassSerializerInterceptor`.  
3. Never `return user as UserResponseDto` as your only defense.

Preserved service pattern:

```ts
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await hash(dto.password);
    const user = await this.repo.save({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
```

**Key discipline:** the **entity never leaves the service layer directly** — always map to a response DTO so the runtime object genuinely lacks secrets.

---

## End-to-end flow

```
Client JSON
  → validate CreateUserDto (pipe / zod)
    → service: hash password, save User entity
      → map to UserResponseDto (no passwordHash)
        → (optional) ClassSerializerInterceptor
          → JSON response

Client fetch
  → should parse with zod/unknown narrow
    → UI types (shared package or local mirrors)
```

Both directions are boundaries: **inbound** validation and **outbound** stripping/mapping; FE should not blindly trust network JSON either.

---

## Keeping frontend and backend in sync (awareness)

Options teams use:

| Approach | Idea |
| --- | --- |
| Shared types package | Monorepo `packages/api-types` imported by Nest + React |
| OpenAPI / Swagger codegen | Backend schema → generated TS client + types |
| GraphQL codegen | Schema → typed operations/hooks |
| Duplicate types by hand | Drifts; fine only for tiny apps |

Interview level: know **why** drift hurts (FE expects `createdAt: string` ISO, BE sends Date serialization quirks; field renamed on one side). Prefer schema-first or shared DTOs over copy-paste `interface User` in two repos with no process.

Shared **types** still don’t validate runtime JSON — pair with zod on the client or a generated client that decodes.

---

## Trap: “type the API response and trust it”

```ts
const data = (await res.json()) as UserResponseDto;
// passwordHash might still be there if BE bug; also any extra fields
setUser(data);
```

Problems:

1. **Assertion** lies — no check that JSON matches.  
2. BE bug or proxy can add fields; XSS-ish assumptions and logic bugs follow.  
3. Types erase on both sides.

Safer FE pattern: `unknown` → **schema parse** (`UserResponseSchema.parse`) → typed value. Same boundary idea as Nest pipes.

---

## Interview question (preserved)

**Q:** Response typed as `Omit<User, 'passwordHash'>`, but hash still leaks in JSON. How? How prevent structurally?

**Strong answer:**

> Types erase — `Omit` only changes what the compiler thinks. If the real object still has `passwordHash`, `JSON.stringify` includes it. Fix: build an explicit new object/DTO with only public fields (don’t cast the entity). In Nest, add `@Exclude()` + `ClassSerializerInterceptor` as a runtime second layer.

---

## Common mistakes and misconceptions

1. Returning entities from controllers “because the return type omits secrets.”  
2. `as UserResponseDto` / `as Omit<…>` as a security control.  
3. Validating only in the UI or only in TS types.  
4. One mega-type for create/update/response/entity.  
5. Shared TS types without runtime parse on the client.  
6. Forgetting `whitelist` so extra body keys reach persistence.

---

## Connections to other concepts

```
erasure
  → Omit/casts don't strip JSON fields

Nest DTO classes + ValidationPipe
  → inbound boundary

explicit map / @Exclude + serializer
  → outbound boundary

unknown + zod (FE)
  → same boundary idea for responses

shared package / OpenAPI
  → reduce type drift across FE/BE
```

---

## Interview perspective

You should be able to:

1. Draw entity → create DTO → response DTO → map in service.  
2. Explain the Omit leak with erasure.  
3. Name Nest validation + serializer layers.  
4. Mention FE parse / shared schema at awareness level.  
5. Reject “trust `as ResponseType`” as a strategy.

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
