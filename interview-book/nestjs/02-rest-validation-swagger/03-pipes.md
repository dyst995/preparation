# 03. Pipes

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] What a pipe does: transform and/or validate arguments before the handler runs
- [ ] Built-in pipes: `ValidationPipe`, `ParseIntPipe`, `ParseUUIDPipe`, `ParseBoolPipe`, `ParseEnumPipe`, `DefaultValuePipe`
- [ ] `ValidationPipe` options: `whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions`
- [ ] Global vs controller-level vs parameter-level pipes
- [ ] Writing a custom pipe (`PipeTransform` interface)

### Global ValidationPipe (the config you should know cold)

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // strips properties not declared in the DTO
    forbidNonWhitelisted: true,   // throws 400 instead of silently stripping unknown props
    transform: true,              // auto-transforms payloads into DTO class instances (and query/param strings into numbers/booleans per @Type)
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

- `whitelist: true` alone silently drops unexpected fields - good for tolerance, but can hide client bugs.
- `forbidNonWhitelisted: true` makes unexpected fields a hard 400 error - stricter, catches integration bugs early. Many teams (and I'd argue VetApp's admin APIs) prefer this for internal/admin clients, and the more tolerant mode for public-facing APIs with many third-party consumers.
- `transform: true` is what makes `@Param('id', ParseIntPipe)`-style number coercion and nested `@Type()` DTOs actually work end to end.

### Custom pipe example

```typescript
@Injectable()
export class ParseAppointmentStatusPipe implements PipeTransform {
  transform(value: string): AppointmentStatus {
    if (!Object.values(AppointmentStatus).includes(value as AppointmentStatus)) {
      throw new BadRequestException(`Invalid status: ${value}`);
    }
    return value as AppointmentStatus;
  }
}
```

### Interview questions

**Q: What's the difference between `whitelist` and `forbidNonWhitelisted`?**
> "`whitelist` silently strips any property not defined in the DTO - safe by default. `forbidNonWhitelisted` goes further and rejects the request with a 400 if it contains extra properties at all. I use the stricter option for internal/admin APIs where I want to catch client bugs fast, and the lenient one for public APIs where I don't want to break every client on a minor extra field."

**Q: Where do pipes run in the request lifecycle, and why does that matter?**
> "After guards, before the route handler. That ordering matters because by the time validation runs, we already know the caller is authenticated/authorized - so validation errors don't leak information to unauthenticated callers, and we don't waste validation work on requests that would be rejected anyway."

---
