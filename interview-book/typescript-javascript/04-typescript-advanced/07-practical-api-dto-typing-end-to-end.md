# 07. Practical API DTO typing - end to end

> Source: `interview-prep/typescript-javascript/04-typescript-advanced.md`

### Topics to learn
- [ ] Single source of truth: entity type/class, then derive request/response types
- [ ] Request validation at the boundary (`class-validator` in Nest, `zod`/`yup` elsewhere)
- [ ] Response shape stripping sensitive fields (compile-time `Omit` + runtime `@Exclude()`/serializer)
- [ ] Keeping frontend and backend types in sync (shared types package, or codegen from OpenAPI/GraphQL schema) - awareness level
- [ ] Why "type the API response and trust it" is a common trap without runtime validation

### End-to-end example

```ts
// 1. Entity - source of truth
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

// 3. Response DTO - compile-time safe AND runtime-stripped
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  // no passwordHash field exists on this class at all
}

// 4. Service - maps entity to response DTO explicitly (never returns the raw entity)
@Injectable()
export class UsersService {
  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await hash(dto.password);
    const user = await this.repo.save({ name: dto.name, email: dto.email, passwordHash });
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  }
}
```

The key discipline: the **entity never leaves the service layer directly** - the controller/service always maps to an explicit response DTO, so a compile-time `Omit`-style intention (chapter 3) is backed by an actual runtime object that genuinely does not contain the sensitive field, rather than trusting a type annotation alone to "hide" a property that's still present on the real object at runtime.

### Interview question

**Q: Your `User` entity type says the response is `Omit<User, 'passwordHash'>`, but a bug still lets the password hash leak in a JSON response. How is that possible, and how do you prevent it structurally?**

**Strong answer:**
> "TypeScript types are erased at compile time and have zero effect on runtime behavior - `Omit<User, 'passwordHash'>` only changes what the compiler *thinks* the object's shape is; if the actual object returned still has a real `passwordHash` property on it, `JSON.stringify` or a serializer will happily include it, because nothing at runtime enforces the type. The structural fix is to construct an explicit new object (or DTO class instance) containing only the fields that should be exposed, rather than casting or type-asserting the original entity object down to a narrower type. In Nest specifically, combining that with `class-transformer`'s `@Exclude()` on the entity and a global `ClassSerializerInterceptor` adds a second, runtime-enforced layer of protection instead of relying on the type system alone."

---
