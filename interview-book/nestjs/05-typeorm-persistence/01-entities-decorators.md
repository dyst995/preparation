# 01. Entities & decorators

> Source: `interview-prep/nestjs/05-typeorm-persistence.md`

### Topics to learn
- [ ] `@Entity()`, `@PrimaryGeneratedColumn()`, `@Column()` with type/length/nullable options
- [ ] `@CreateDateColumn`, `@UpdateDateColumn`, `@DeleteDateColumn` (soft deletes)
- [ ] Relations: `@OneToMany`, `@ManyToOne`, `@ManyToMany` (+ join table), `@OneToOne` (+ `@JoinColumn`)
- [ ] Eager vs lazy relations - and why eager is usually a footgun at scale
- [ ] Enums as columns (`type: 'enum'`) - MySQL vs Postgres representation differences
- [ ] Indexes (`@Index()`) and unique constraints (`@Unique()`, `unique: true` on column)

### VetApp-style entities

```typescript
@Entity('vets')
export class Vet {
  @PrimaryGeneratedColumn() id: number;

  @Column() name: string;

  @Column({ unique: true }) email: string;

  @OneToMany(() => Appointment, (appointment) => appointment.vet)
  appointments: Appointment[];

  @CreateDateColumn() createdAt: Date;
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn() id: number;

  @ManyToOne(() => Vet, (vet) => vet.appointments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vet_id' })
  vet: Vet;

  @ManyToOne(() => Owner, (owner) => owner.appointments)
  @JoinColumn({ name: 'owner_id' })
  owner: Owner;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'datetime' }) // 'timestamptz' on Postgres
  scheduledAt: Date;

  @OneToMany(() => VetRecord, (record) => record.appointment)
  records: VetRecord[];

  @DeleteDateColumn() deletedAt?: Date; // soft delete
}
```

### Eager vs lazy

```typescript
@ManyToOne(() => Vet, { eager: true }) vet: Vet; // always joined, every query
```

**Eager relations are convenient but dangerous by default** - they get pulled in on *every* query against that entity, even ones that don't need the relation, silently adding joins and payload everywhere. Prefer explicit loading (`relations: [...]` or `QueryBuilder` joins) so each query loads exactly what it needs; reserve `eager: true` for genuinely always-needed, cheap relations.

### Interview questions

**Q: When would you use `eager: true` vs explicit `relations` on a query?**
> "Almost always explicit. `eager: true` means that relation gets joined on *every* find, including places that don't need it, which silently grows query cost as the app evolves. I only use it for a relation that's genuinely needed everywhere and cheap to join - and even then I'd rather be explicit and let each query author decide what it actually needs."

**Q: How do soft deletes work in TypeORM and why use them?**
> "`@DeleteDateColumn()` marks a column TypeORM uses for `softRemove()`/`softDelete()` - instead of a real `DELETE`, it sets that timestamp, and default `find()` queries automatically exclude soft-deleted rows. It's useful for VetApp-style records where you legally/operationally can't lose veterinary history or payment records even if a client 'deletes' them from their view - you keep an audit trail and can restore if needed."

---
