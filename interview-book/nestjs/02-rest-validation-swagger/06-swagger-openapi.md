# 06. Swagger / OpenAPI

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] `@nestjs/swagger` setup: `DocumentBuilder`, `SwaggerModule.setup()`
- [ ] `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`
- [ ] `@ApiProperty()` on DTOs (and `@ApiPropertyOptional`)
- [ ] Auto-generating schemas from DTOs (`CLI plugin` for zero-decorator inference, or explicit decorators)
- [ ] Bearer auth in Swagger UI (`@ApiBearerAuth()`, `addBearerAuth()`)
- [ ] Versioned/grouped docs, hiding internal endpoints (`@ApiExcludeEndpoint`)
- [ ] Why accurate docs matter for frontend/mobile teams and third-party integrators

### Setup

```typescript
const config = new DocumentBuilder()
  .setTitle('VetApp API')
  .setDescription('Veterinary clinic management API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### DTO decorated for Swagger

```typescript
export class CreateAppointmentDto {
  @ApiProperty({ example: 42, description: 'ID of the vet' })
  @IsInt()
  vetId: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsString()
  @IsOptional()
  notes?: string;
}
```

### Controller documentation

```typescript
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiResponse({ status: 201, description: 'Appointment created', type: AppointmentResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @Post()
  create(@Body() dto: CreateAppointmentDto) { /* ... */ }
}
```

### Interview questions

**Q: How does Swagger stay in sync with your actual validation rules instead of drifting out of date?**
> "Because the same DTO classes drive both `class-validator` validation and `@ApiProperty` documentation - I'm not maintaining a separate OpenAPI YAML by hand. There's still discipline required to keep `@ApiProperty` metadata accurate, but the *shape* (required fields, types) can't silently diverge since it's the same class Nest actually validates against."

**Q: How do you document authenticated endpoints in Swagger so someone can actually try them from the UI?**
> "`addBearerAuth()` on the `DocumentBuilder`, then `@ApiBearerAuth()` on protected controllers/routes - that adds an 'Authorize' button in Swagger UI where you paste a JWT, and it gets sent as the `Authorization` header on 'Try it out' requests."

---
