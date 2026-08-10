# 03. Providers & Dependency Injection

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] What a "provider" is (anything with an injection token: class, value, factory)
- [ ] Constructor injection and how Nest resolves the dependency graph
- [ ] Custom providers: `useClass`, `useValue`, `useFactory`, `useExisting`
- [ ] Injection tokens (string/Symbol) for non-class dependencies, `@Inject()`
- [ ] Provider scopes: `DEFAULT` (singleton), `REQUEST`, `TRANSIENT`
- [ ] Circular dependencies and `forwardRef()`
- [ ] Why DI makes testing easier (swap real providers for mocks)

### The four provider shapes

```typescript
// 1. useClass (most common) - Nest instantiates the class and injects its deps
{ provide: PaymentGateway, useClass: BogPaymentGateway }

// 2. useValue - inject a plain value/object (config, constants, mocks in tests)
{ provide: 'APP_CONFIG', useValue: { retries: 3 } }

// 3. useFactory - compute the provider, optionally injecting other providers
{
  provide: 'DB_CONNECTION',
  useFactory: (config: ConfigService) => createConnection(config.get('DB_URL')),
  inject: [ConfigService],
}

// 4. useExisting - alias one token to another existing provider
{ provide: 'LegacyLogger', useExisting: LoggerService }
```

`useClass` with an interface-like token is how you keep controllers/services decoupled from concrete implementations - e.g. inject an abstract `PaymentGateway` token and swap `BogPaymentGateway` for `FlittPaymentGateway` per module/environment (relevant: VetApp uses Bank of Georgia, Wizer integrates Flitt).

### Provider scopes

| Scope | Lifetime | When to use |
|---|---|---|
| `DEFAULT` (singleton) | One instance for the whole app | Almost everything - stateless services, repositories |
| `REQUEST` | New instance per incoming request | Need per-request state (e.g. current user context threaded through nested services) - has a perf cost, use sparingly |
| `TRANSIENT` | New instance every time it's injected | Rare - e.g. a provider that must never share state between consumers |

**Gotcha:** if a provider is `REQUEST`-scoped, everything that depends on it (directly or transitively) becomes request-scoped too - this can quietly tank performance if applied high in the graph. Prefer passing request-scoped data explicitly (e.g. via a param) over scoping a whole service tree.

### Circular dependencies

Two providers/modules depend on each other. Nest resolves this with `forwardRef()`:

```typescript
@Injectable()
export class AppointmentsService {
  constructor(@Inject(forwardRef(() => NotificationsService)) private notifications: NotificationsService) {}
}
```

**Senior take:** `forwardRef` is a valid escape hatch, but a circular dependency is often a sign the domain boundary is wrong - consider extracting shared logic into a third module both can depend on, rather than reaching for `forwardRef` reflexively.

### Interview questions

**Q: How does Nest resolve constructor dependencies?**
> "At bootstrap, Nest builds a dependency graph from providers and their constructor parameter types (or injection tokens for non-class deps). It instantiates providers in dependency order, wires singletons once, and injects them wherever they're requested. If it can't resolve a token - not provided, not exported from the right module - you get a clear runtime error identifying the missing provider."

**Q: Why use an injection token/interface instead of injecting a concrete class directly?**
> "It decouples consumers from implementation. On VetApp I'd define a `PaymentGateway` token and provide `BogPaymentGateway` for that binding; tests can swap in a fake gateway via `useValue`/`useClass` without touching business logic, and if we ever added a second processor, only the provider registration changes."

**Q: What's the risk of `REQUEST` scope?**
> "It creates a new instance per request for that provider *and* everything depending on it, which adds instantiation overhead and can silently make otherwise-stateless services request-scoped. I only reach for it when I genuinely need per-request state that's awkward to pass explicitly, e.g. deep request context/tracing."

---
