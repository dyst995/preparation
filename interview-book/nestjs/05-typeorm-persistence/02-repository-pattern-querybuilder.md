# 02. Repository pattern & QueryBuilder

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Topics to learn
- [ ] `@InjectRepository(Entity)` and the standard `Repository<T>` API (`find`, `findOne`, `save`, `create`, `delete`, `softDelete`)
- [ ] Custom repositories (extending base repository logic for domain-specific queries)
- [ ] `find()` options (`where`, `relations`, `order`, `take`/`skip`) vs `QueryBuilder` - when each is appropriate
- [ ] `QueryBuilder` for complex joins, conditional filters, aggregations, raw SQL fallback when needed
- [ ] `save()` vs `insert()`/`update()` - `save` does an upsert-like check (extra query) vs `insert`/`update` being more direct

### `find()` options vs QueryBuilder

```typescript
// Simple - find() options are enough
const appointments = await this.repo.find({
  where: { status: AppointmentStatus.CONFIRMED },
  relations: { vet: true, owner: true },
  order: { scheduledAt: 'ASC' },
  take: 20,
  skip: 0,
});

// Complex - QueryBuilder gives full control
const results = await this.repo
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .leftJoinAndSelect('appointment.owner', 'owner')
  .where('appointment.status = :status', { status: 'confirmed' })
  .andWhere('vet.clinicId = :clinicId', { clinicId })
  .andWhere(new Brackets((qb) => {
    qb.where('owner.name LIKE :search', { search: `%${search}%` })
      .orWhere('owner.phone LIKE :search', { search: `%${search}%` });
  }))
  .orderBy('appointment.scheduledAt', 'ASC')
  .take(20)
  .getMany();
```

**Rule of thumb:** reach for `find()` options while they're readable; switch to `QueryBuilder` once you need dynamic conditions, complex joins, aggregations (`COUNT`, `GROUP BY`), or raw SQL fragments the declarative API can't express cleanly.

### `save()` vs `insert()`

`save()` checks whether the entity has a primary key already set to decide insert vs update, runs lifecycle hooks/cascades, and can be slightly slower due to that extra logic. `insert()`/`update()` are more direct/performant for bulk or simple operations where you don't need cascades or entity-level hooks.

### Interview question

**Q: When do you drop down to `QueryBuilder` instead of the repository's `find()`?**
> "Once I need dynamic filtering built from multiple optional query params, joins with conditions beyond a simple relation load, aggregate functions, or raw SQL for something the ORM's declarative layer doesn't express well - like a full-text search fallback or a vendor-specific function. For straightforward CRUD with static shape, `find()` options are more readable and I don't reach for `QueryBuilder` prematurely."

---
