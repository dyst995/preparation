# 05. Sync vs async methods

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Topics to learn
- [ ] Turbo Modules can expose sync methods via JSI
- [ ] Sync is powerful and dangerous
- [ ] Sync work runs in a way that can block JS if heavy
- [ ] Prefer async/promises for I/O and slow work
- [ ] Sync reserved for tiny pure reads (flags, small computations, cheap constants-like reads)

### Decision framework

| Method type | Use when | Avoid when |
|---|---|---|
| Async / Promise | Disk, network, hardware I/O, anything slow | Never wrong as default |
| Sync | Tiny deterministic reads needed inline | File I/O, bitmap work, anything unpredictable |
| Events | Streams (scans, progress) | One-shot request/response |

### Senior line

> "JSI making sync possible does not make sync wise. I default to async and require a measured reason for sync."

---
