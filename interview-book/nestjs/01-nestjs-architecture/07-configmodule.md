# 07. ConfigModule

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] `@nestjs/config`: `ConfigModule.forRoot()`, `.env` loading, multiple env files
- [ ] `ConfigService.get()` with typed generics
- [ ] Validation of env vars at startup (Joi schema, or class-validator + `plainToInstance`)
- [ ] Namespaced/registered config (`registerAs`) and `forFeature`
- [ ] Failing fast: crash on missing/invalid config instead of failing later at runtime
- [ ] Secrets management awareness (never commit `.env`, use secret managers in production)

### Setup with validation

```typescript
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsEnum(['development', 'production', 'test']) NODE_ENV: string;
  @IsNumber() PORT: number;
  @IsString() DATABASE_URL: string;
  @IsString() JWT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) throw new Error(errors.toString());
  return validated;
}
```

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
  validate,
})
```

### Namespaced config with `registerAs`

```typescript
export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
}));

// consume with strong typing
constructor(@Inject(databaseConfig.KEY) private dbConfig: ConfigType<typeof databaseConfig>) {}
```

### Interview questions

**Q: Why validate environment variables at startup instead of trusting them?**
> "Because a missing or malformed env var should fail the deploy immediately with a clear error, not surface three hours later as a cryptic runtime bug - e.g. a missing `JWT_SECRET` shouldn't silently sign tokens with `undefined`. I validate with a schema at bootstrap so the process refuses to start if config is invalid."

**Q: How do you keep config type-safe instead of stringly-typed `process.env.X` everywhere?**
> "Centralize access through `ConfigService` (or namespaced config via `registerAs`), typed with generics, so the rest of the app never touches `process.env` directly. That also makes it trivial to mock config in tests."

---
