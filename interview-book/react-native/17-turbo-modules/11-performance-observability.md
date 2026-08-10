# 11. Performance & observability

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Watch
- Cold start time before/after migration
- First call latency to lazy modules
- JS thread stalls around sync methods
- Native crash rate attributed to module
- Event emit rate for streaming modules

### Production checklist
- [ ] Spec committed and reviewed like a public API
- [ ] No heavy sync methods
- [ ] Lazy modules not forced at startup accidentally
- [ ] JS facade is the only access point
- [ ] Crashlytics breadcrumbs around native entry points
- [ ] Documented Android/iOS threading notes in module README

---
