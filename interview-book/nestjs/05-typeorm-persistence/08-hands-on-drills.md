# 08. Hands-on drills

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

- [ ] Model `Vet`, `Owner`, `Appointment`, `Payment`, `VetRecord` entities with correct relations and at least one enum column.
- [ ] Write a query that reproduces N+1 (loop + lazy relation access), turn on query logging, count queries, then fix it and re-count.
- [ ] Write one migration by hand with a correct `down()` that fully reverses the `up()`.
- [ ] Implement `createAppointmentWithPayment` using both the manual `QueryRunner` pattern and the `DataSource.transaction()` convenience wrapper; compare readability.
- [ ] Write out the MySQL vs Postgres comparison table from memory, then check it against this chapter.
- [ ] Rehearse the "VetApp schema compatibility" story out loud in under 90 seconds.

---
