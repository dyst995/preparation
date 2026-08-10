# 03. Part 2 - System-design-flavored questions (backend-scoped)

> Source: `interview-prep/nestjs/07-interview-questions.md`

**Q18: Design the appointment-booking flow for VetApp end to end - what are the moving pieces?**
> Model answer structure:
> 1. `POST /appointments` - validated DTO (vetId, ownerId, scheduledAt, type), guarded by auth + RBAC (receptionist/admin can book on behalf of others; a vet might only book for themself depending on rules).
> 2. Service layer checks for scheduling conflicts (vet double-booking) - likely a DB constraint or an explicit query inside a transaction to avoid a race between two simultaneous bookings for the same slot.
> 3. Persist the appointment, return 201.
> 4. Enqueue a background job for confirmation notification (email/SMS/push) - doesn't block the response.
> 5. If payment is required upfront, authorize payment via Bank of Georgia's API (ideally outside/around the DB transaction, not nested inside it - chapter 05), persist the result, reconcile asynchronously if needed.
> 6. Swagger-documented, versioned if this is a public-facing booking API consumed by a separate client app.

**Q19: How would you prevent two receptionists from double-booking the same vet slot at the exact same time?**
> A unique constraint at the DB level on (vetId, scheduledAt) if slots are fixed-size, or a transaction that re-checks for conflicts immediately before insert with appropriate row locking (`SELECT ... FOR UPDATE` scoped to that vet/time window) so a concurrent request can't slip through the check-then-insert race. The unique constraint is the more robust guarantee since application-level checks alone are still racy without locking.

**Q20: You need to add "clinic" as a new concept to VetApp - vets and appointments now belong to a specific clinic, and clinics shouldn't see each other's data. What changes?**
> Add a `Clinic` entity, a `clinicId` FK on relevant entities (vets, appointments, owners if clinic-scoped), extend the JWT payload or user record with the caller's clinic, and add a scoping check (either a global query filter/interceptor or explicit `WHERE clinicId = :clinicId` on every relevant query) so RBAC (role) and clinic scoping (tenant isolation) are enforced as two separate, composable checks rather than conflated into one.

---
