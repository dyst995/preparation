# 05. Services

> Source: `interview-prep/nestjs/01-nestjs-architecture.md`

### Topics to learn
- [ ] Services as the home for business logic
- [ ] `@Injectable()` and how services get registered as providers
- [ ] Composing services (a service can inject other services/repositories)
- [ ] Keeping services framework-agnostic where possible (easier to test, easier to reuse)
- [ ] Repository pattern preview (full detail in chapter 05)

### Example

```typescript
@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment) private readonly repo: Repository<Appointment>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateAppointmentDto, user: AuthUser): Promise<Appointment> {
    const appointment = this.repo.create({ ...dto, createdBy: user.id });
    const saved = await this.repo.save(appointment);
    await this.notifications.queueAppointmentConfirmation(saved.id);
    return saved;
  }
}
```

### Interview question

**Q: What's the responsibility split between controller, service, and repository?**
> "Controller: HTTP in/out. Service: business rules, orchestration, transactions. Repository: persistence/query concerns. Each layer only knows about the one below it - the controller never talks to TypeORM directly, and the service doesn't know about HTTP status codes."

---
