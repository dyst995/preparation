# 05. The N+1 query problem (and TypeORM specifically)

> Source: `interview-prep/sql-databases/02-indexing-performance.md`

### Topics to learn
- [ ] What N+1 means: 1 query to get a list, then N more queries, one per row, for related data
- [ ] Why lazy-loaded ORM relations are the most common source of N+1
- [ ] How to fix it: eager loading via JOIN, batching, or DataLoader-style batching
- [ ] TypeORM specifics: `relations` option, `leftJoinAndSelect`, lazy relations, `QueryBuilder`
- [ ] N+1 isn't just an ORM problem - it can happen with hand-written code too (a loop that queries per item)

### The problem illustrated

```typescript
// Naive: 1 query for appointments, then N queries - one per appointment - for its pet
const appointments = await appointmentRepository.find(); // 1 query
for (const appt of appointments) {
  const pet = await petRepository.findOne({ where: { id: appt.petId } }); // N queries!
  console.log(pet.name);
}
```

If there are 500 appointments, that's 501 round trips to the database instead of 1 or 2. This is one of the most common real-world performance bugs, and interviewers ask about it constantly because it is so easy to introduce by accident with an ORM's convenience APIs.

### How it sneaks in with TypeORM specifically

```typescript
// If Appointment.pet is a lazy relation, or if you access .pet after
// fetching without eager loading, TypeORM issues a separate query per access.
@Entity()
class Appointment {
  @ManyToOne(() => Pet)
  pet: Pet; // if not eager-loaded, accessing appointment.pet can trigger extra queries
}

const appointments = await appointmentRepository.find();
for (const appt of appointments) {
  console.log((await appt.pet).name); // N+1 if `pet` is a lazy relation
}
```

### The fix: eager load with a JOIN

```typescript
// Option 1: relations option (TypeORM builds the JOIN for you)
const appointments = await appointmentRepository.find({
  relations: ['pet', 'vet'],
});

// Option 2: QueryBuilder with explicit joins - more control, especially with filtering
const appointments = await appointmentRepository
  .createQueryBuilder('appointment')
  .leftJoinAndSelect('appointment.pet', 'pet')
  .leftJoinAndSelect('appointment.vet', 'vet')
  .where('appointment.status = :status', { status: 'completed' })
  .getMany();
```

Both approaches turn N+1 queries into a single query with JOINs, at the cost of a wider result set (some data duplicated across joined rows) - almost always a good trade for read performance.

### When JOIN isn't ideal: batching / DataLoader pattern

If you're loading multiple different one-to-many relations and a single mega-JOIN would cause row fan-out multiplying result size badly (e.g. an appointment with many medical records AND many payments joined at once), a better fix is often to issue a small, fixed number of batched queries - one per relation, using `WHERE id IN (...)` - and stitch the results together in application code. This is the same idea behind GraphQL's DataLoader: instead of N queries, do 1 query per relation type using an `IN` clause, keeping the total query count constant regardless of N.

```typescript
const appointments = await appointmentRepository.find();
const ids = appointments.map(a => a.id);

// 1 query for all medical records across all appointments, not one per appointment
const records = await medicalRecordRepository.find({ where: { appointmentId: In(ids) } });
```

### Model spoken answer

"N+1 happens when you fetch a list with one query, then trigger a separate query per row to get related data - very easy to introduce accidentally with ORM lazy relations. With TypeORM I fix it by eager loading with `relations` or `leftJoinAndSelect` in QueryBuilder so it becomes a single JOIN query. When a JOIN would cause too much row fan-out across multiple one-to-many relations, I batch instead - one `WHERE id IN (...)` query per relation type, so the query count stays constant regardless of list size, which is the same idea as GraphQL's DataLoader pattern."

---
