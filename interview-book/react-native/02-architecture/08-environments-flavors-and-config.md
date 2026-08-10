# 08. Environments, flavors, and config

> Source: `interview-prep/react-native/02-architecture.md`

### Topics to learn
- [ ] dev / staging / prod backends
- [ ] Separate bundle IDs / applicationIds for side-by-side installs (often useful)
- [ ] `.env` strategies and what must NOT go in env (secrets)
- [ ] Build-time vs runtime config
- [ ] Feature flags / remote config for risky rollouts

### What belongs in config

- API base URLs
- Feature flag defaults
- Analytics keys that are public by nature
- Deep link hostnames

### What does not

- Private API secrets that grant privileged access
- Raw production signing passwords in JS
- Anything that would be catastrophic if extracted from the bundle

### Interview question

**Q: How do you manage environments in RN?**

> �I use build flavors/schemes for platform identity and compile-time config, plus a small typed config module. Staging and prod are clearly separated. Secrets that must remain private stay off-device or in secure native storage flows. For risky features I prefer remote flags so I can disable without waiting for store review when appropriate.�

---
