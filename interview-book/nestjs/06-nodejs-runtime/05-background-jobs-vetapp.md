# 05. Background jobs (VetApp)

> Source: `interview-prep/nestjs/06-nodejs-runtime.md`

### Topics to learn
- [ ] Why some work doesn't belong inline in the HTTP request/response cycle (slow, unreliable, or fire-and-forget work)
- [ ] Queue-based processing: BullMQ (Redis-backed) as the standard NestJS choice (`@nestjs/bullmq` / `@nestjs/bull`)
- [ ] Job producers (enqueue) vs consumers/processors (dequeue and execute)
- [ ] Retries with backoff, dead-letter handling for jobs that keep failing
- [ ] Idempotency in job processors (a job might run more than once - must be safe to retry)
- [ ] Scheduled/cron jobs with `@nestjs/schedule` (`@Cron()`, `@Interval()`, `@Timeout()`) for periodic tasks
- [ ] VetApp use case: asynchronous payment processing/webhooks, appointment confirmation notifications

### Why background jobs, concretely

Two VetApp scenarios that shouldn't block the HTTP response:
1. **Payment processing follow-up**: after initiating a payment with Bank of Georgia's API, reconciling the final status (via webhook or polling) and updating records shouldn't hold the original request open.
2. **Notifications**: sending an appointment confirmation email/SMS/push after booking shouldn't make the booking request wait on a third-party notification provider's latency - if that provider is slow or briefly down, appointment creation shouldn't fail because of it.

### BullMQ setup (concept)

```typescript
// Producer - enqueue a job from the service handling the HTTP request
@Injectable()
export class AppointmentsService {
  constructor(@InjectQueue('notifications') private notificationsQueue: Queue) {}

  async create(dto: CreateAppointmentDto) {
    const appointment = await this.repo.save(dto);
    await this.notificationsQueue.add(
      'appointment-confirmation',
      { appointmentId: appointment.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
    return appointment; // HTTP response returns immediately, notification sends async
  }
}
```

```typescript
// Consumer - processes jobs from the queue, in a separate concern from the HTTP request lifecycle
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  async process(job: Job<{ appointmentId: number }>) {
    const appointment = await this.appointmentsService.findOne(job.data.appointmentId);
    await this.emailService.sendConfirmation(appointment); // safe to retry - idempotent by appointment id
  }
}
```

### Idempotency matters

Because a queue can redeliver a job (consumer crashes mid-processing, network blip acking the job, etc.), job processors must be safe to run more than once for the same input - e.g. checking "has a confirmation already been sent for this appointment" before sending again, or using the payment gateway's own idempotency key so a retried "authorize payment" job doesn't double-charge.

### Cron/scheduled jobs

```typescript
@Injectable()
export class PaymentReconciliationJob {
  @Cron('0 */15 * * * *') // every 15 minutes
  async reconcilePendingPayments() {
    const pending = await this.paymentsService.findStalePending();
    for (const payment of pending) {
      await this.paymentsService.reconcileWithGateway(payment);
    }
  }
}
```

Useful as a safety net even when webhooks are the primary mechanism - webhooks can be missed/delayed, so a periodic reconciliation job catches anything that fell through.

### Interview questions

**Q: Why not just send the confirmation email synchronously inside the appointment-creation request?**
> "Because it couples the success of booking an appointment to the availability and latency of a third-party email/SMS provider. If that provider is slow or briefly down, the user's booking request would hang or fail for a reason that has nothing to do with whether the appointment itself was successfully created. Queuing it lets the booking succeed immediately and the notification retry independently with backoff if it fails."

**Q: How do you handle a background job that fails halfway through, gets retried, and might run twice?**
> "Design the job to be idempotent - checking existing state before acting (e.g. 'has a confirmation already been recorded for this appointment') or using an idempotency key with any external API involved (many payment gateways support this explicitly, so a retried authorize call doesn't double-charge). I also configure limited retries with exponential backoff, and route jobs that exhaust retries to a dead-letter/failed state that's visible for manual investigation rather than silently disappearing."

**Q: For VetApp's payment flow, would you rely purely on the payment provider's webhook, or something else too?**
> "Primarily the webhook for near-real-time reconciliation, but webhooks can be delayed, missed, or received out of order, so I'd back it with a periodic reconciliation job - a cron task that polls the gateway's status for any payment stuck in a pending state past a reasonable window. That way a missed webhook doesn't leave a payment permanently unreconciled."

---
