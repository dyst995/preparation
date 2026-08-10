# 02. DTOs: class-validator & class-transformer

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] DTO = Data Transfer Object; separate from entities
- [ ] `class-validator` decorators: `@IsString`, `@IsEmail`, `@IsInt`, `@IsEnum`, `@IsOptional`, `@ValidateNested`, `@ArrayMinSize`, etc.
- [ ] `class-transformer`: `@Type()` for nested objects, `plainToInstance`
- [ ] Mapped types: `PartialType`, `PickType`, `OmitType`, `IntersectionType` (from `@nestjs/mapped-types` / `@nestjs/swagger`)
- [ ] Response serialization: `@Exclude()`, `@Expose()`, `ClassSerializerInterceptor`
- [ ] Why DTOs should never be your TypeORM entities directly

### Why DTOs, not entities, at the boundary

Entities describe the *database shape*. DTOs describe the *wire contract* for a specific operation. Reusing entities as request/response bodies:
- Leaks internal columns (password hash, internal flags) into responses.
- Makes it impossible to have different validation rules for create vs update.
- Couples your API contract to your schema - a column rename breaks clients.

### Example DTOs

```typescript
export class CreateAppointmentDto {
  @IsInt()
  vetId: number;

  @IsInt()
  ownerId: number;

  @IsDateString()
  scheduledAt: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

// Update DTO - all fields optional, reusing the create DTO's validation rules
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}

// Nested validation
export class CreateOwnerWithPetsDto {
  @IsString() name: string;

  @ValidateNested({ each: true })
  @Type(() => CreatePetDto)
  pets: CreatePetDto[];
}
```

### Response shaping with `class-transformer`

```typescript
export class UserResponseDto {
  id: number;
  email: string;

  @Exclude()
  passwordHash: string; // never leaves the server, even if accidentally spread onto the DTO
}
```

`ClassSerializerInterceptor` (global or per-controller) applies `@Exclude`/`@Expose` rules automatically when returning class instances, so a developer forgetting to manually strip a field doesn't leak sensitive data.

### Interview questions

**Q: Why not just validate against your TypeORM entity directly?**
> "Entities represent storage, not the API contract. They often carry fields that should never be client-writable (id, timestamps, internal flags) or client-visible (password hash). DTOs give me a purpose-built, per-operation shape - `CreateAppointmentDto` has different required fields than `UpdateAppointmentDto` - and keep the API contract stable even if the schema changes."

**Q: How do you make sure a password hash never accidentally gets returned in a response?**
> "Two layers: the query itself should avoid selecting sensitive columns when not needed, and at the serialization layer I mark sensitive entity fields `@Exclude()` and rely on `ClassSerializerInterceptor` globally, so even if a service accidentally returns the full entity, the interceptor strips it before it reaches the client."

---
