# 04. Controllers

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] `@Controller('path')` and route prefixes
- [ ] HTTP method decorators: `@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`
- [ ] Param decorators: `@Param`, `@Query`, `@Body`, `@Headers`, `@Req`, `@Res`
- [ ] Status codes: `@HttpCode`, default codes per verb
- [ ] Route ordering (static routes before dynamic `:id` routes)
- [ ] API versioning (`URI`, `HEADER`, `MEDIA_TYPE` versioning types)
- [ ] Why controllers should stay thin (delegate to services)

### Example controller (VetApp-style)

```typescript
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll(@Query() query: FindAppointmentsDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.remove(id);
  }
}
```

### Thin controllers, why it matters

Controllers should only:
1. Extract/validate input (via DTOs + pipes, decorators).
2. Call the appropriate service method.
3. Return the result (or let an interceptor/filter shape the response).

Business logic, transactions, and persistence access belong in services (and repositories). This keeps controllers trivially testable and keeps HTTP concerns (status codes, headers) separate from domain logic that might later be reused by a queue consumer, a CLI command, or a cron job.

### Interview questions

**Q: Why keep business logic out of controllers?**
> "Controllers are the HTTP adapter layer. If I put business logic there, I can't reuse it from a background job or a different transport (e.g. a message consumer), and testing requires spinning up HTTP concerns unnecessarily. On VetApp, appointment-creation logic lives in `AppointmentsService` so the same logic path also feeds a background job for confirmation emails without duplicating rules."

**Q: How do you handle route ordering pitfalls?**
> "Static segments must be declared before dynamic ones on the same prefix - e.g. `@Get('search')` before `@Get(':id')` - otherwise `search` gets swallowed as an `:id` param."

---
