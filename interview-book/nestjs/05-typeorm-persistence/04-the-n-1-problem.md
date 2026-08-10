# 04. The N+1 problem

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Topics to learn
- [ ] What N+1 actually is: 1 query for a list + N queries for each item's relation
- [ ] How lazy-loaded/unloaded relations trigger it (especially if code loops and accesses a relation per item)
- [ ] Fixing it with eager joins (`relations` option or `leftJoinAndSelect`) in a single query
- [ ] `DataLoader`-style batching as an alternative pattern (more common in GraphQL, but useful concept)
- [ ] Detecting it: query logging (`logging: true`), APM tools, or just counting queries in a test

### The bug, concretely

```typescript
// BAD: N+1 - one query for appointments, then one more query PER appointment for its vet
const appointments = await this.repo.find(); // 1 query
for (const appt of appointments) {
  console.log(appt.vet.name); // triggers a lazy load per iteration -> N queries
}
```

```typescript
// GOOD: single query with a join
const appointments = await this.repo.find({ relations: { vet: true } });
// or
const appointments = await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .getMany();
```

### Detecting it

```typescript
TypeOrmModule.forRoot({ ..., logging: ['query'] }); // watch query count in dev logs
```

In practice: if a list endpoint's query count scales linearly with the number of returned rows, that's the smoking gun.

### Interview questions

**Q: How would you detect an N+1 problem in a NestJS + TypeORM app you didn't write?**
> "Turn on query logging in a non-prod environment and hit a list endpoint that touches relations - if the number of queries scales with the number of returned rows instead of staying constant, that's N+1. An APM tool or just counting queries in an integration test against a seeded dataset of, say, 50 rows works too - constant query count regardless of row count is the target."

**Q: Fix this: a list of 100 appointments each lazily accessing `.vet.name` in a loop.**
> "Load the relation eagerly for that specific query - either `relations: { vet: true }` on `find()`, or `leftJoinAndSelect('appointment.vet', 'vet')` with QueryBuilder - turning it into a single query with a join instead of 1+N round trips. I wouldn't reach for `eager: true` on the entity itself, since that would force the join on every query against `Appointment`, not just this one."

---
