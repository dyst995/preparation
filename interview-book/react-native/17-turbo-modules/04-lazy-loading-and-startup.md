# 04. Lazy loading and startup

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Topics to learn
- [ ] Module factory runs on first access
- [ ] Unused modules don't pay init cost at launch
- [ ] Still pay cost on first use (design APIs accordingly)
- [ ] Avoid first-use on the critical interaction path without warming if needed

### Interview question

**Q: How do Turbo Modules improve TTI?**

> "Legacy modules were often initialized eagerly, so apps paid native setup cost for features never opened on cold start. Turbo Modules initialize lazily when first required from JS, which reduces startup work. The tradeoff is first-call latency later - for critical paths I may warm a module after first frame if needed."

---
