# 05. Exception filters

> Source: `interview-prep/nestjs/02-rest-validation-swagger.md`

### Topics to learn
- [ ] `HttpException` and its subclasses (`BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`, etc.)
- [ ] Default global exception filter behavior (what Nest does if you throw nothing custom)
- [ ] `@Catch()` decorator, `ExceptionFilter` interface
- [ ] Global filters (`app.useGlobalFilters`) vs controller/route-scoped filters
- [ ] Catching specific exception types vs a catch-all filter
- [ ] Mapping unexpected errors (e.g. TypeORM `QueryFailedError`) to safe, consistent HTTP responses
- [ ] Never leaking stack traces / internal details to clients in production

### Custom global exception filter

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
```

```typescript
app.useGlobalFilters(new GlobalExceptionFilter());
```

### Mapping database errors

```typescript
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const driverError = (exception as any).driverError;
    if (driverError?.code === 'ER_DUP_ENTRY' || driverError?.code === '23505') {
      return response.status(409).json({ statusCode: 409, message: 'Resource already exists' });
    }
    response.status(500).json({ statusCode: 500, message: 'Database error' });
  }
}
```

(`ER_DUP_ENTRY` is MySQL's duplicate-key error code, `23505` is Postgres's unique-violation code - worth knowing both given your MySQL/Postgres exposure.)

### Interview questions

**Q: What happens if you don't write any exception filter at all?**
> "Nest's built-in global filter catches everything: known `HttpException`s are serialized with their status and message, and anything else becomes a generic 500 with a safe message - it won't leak stack traces by default. I usually still add my own global filter to get consistent response shape, logging, and to translate infrastructure errors like duplicate-key DB errors into proper 409s instead of raw 500s."

**Q: Why catch `QueryFailedError` specifically instead of letting it become a generic 500?**
> "Because some DB errors map cleanly to a client-meaningful HTTP status - a unique constraint violation is a 409 Conflict, not a server failure. Translating that at the filter layer keeps services from needing try/catch boilerplate around every write, while still giving clients an actionable response."

---
