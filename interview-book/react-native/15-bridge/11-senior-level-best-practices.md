# 11. Senior-Level Best Practices

> Source: `interview-prep/react-native/15-bridge.md`

### Decision framework
- Measure first: JS profile vs native vs message volume
- If high-frequency UI: prefer native driver / Reanimated / Fabric-friendly paths
- If occasional commands: Bridge-era modules may still be fine in legacy apps
- If new module on New Arch: prefer Turbo Module (see chapter 17)

### Production checklist
- [ ] No unbounded event emitters into JS
- [ ] Payload sizes reviewed for native APIs
- [ ] Startup path audited for eager module costs
- [ ] Release builds profiled, not only debug
- [ ] Migration plan documented for legacy modules

### Failure modes

| Failure | Debug approach |
|---|---|
| App hitching on gesture-heavy screens | Sample JS thread; count native events; throttle |
| Slow TTI | Trace native module init; defer non-critical modules |
| Random delayed callbacks | Log correlation IDs across JS/native; check queue delays |
| Memory spikes on module calls | Inspect payload size; avoid base64 files |

### Harder follow-ups

**Q: If Fabric and Turbo Modules exist, why interview Bridge at all?**
> "Because production reality is mixed. Seniors debug hybrid systems and can explain tradeoffs historically and practically."

**Q: Can you make Bridge 'fast enough' instead of migrating?**
> "Sometimes, by reducing chatter and payload size. But you cannot invent efficient sync JSI-style interop on pure Bridge. Migration is about the model, not only micro-opts."

### Staff monologue
> "The Bridge taught RN teams an important lesson: boundaries have physics. Serialization and asynchrony are not abstractions you can ignore at scale. My native work - DataWedge, custom iOS preview, Turbo Modules - is all about choosing the right boundary technology for the job, not sprinkling native code everywhere."

---
