# 04. App shell responsibilities

> Source: `interview-prep/react-native/02-architecture.md`

`app/` (or `src/app`) should own:

- [ ] Providers composition (`QueryClientProvider`, store providers, SafeArea, theme)
- [ ] Root navigation container
- [ ] Global error boundaries
- [ ] Bootstrap/startup sequencing (fonts, remote config, auth hydrate)
- [ ] Environment config access
- [ ] Global linking config

Avoid dumping business screens into `app/`.

### Startup sequence (interview gold)

Be ready to describe a safe boot order:

1. Load native minimum / splash stays up
2. Init crash reporting
3. Hydrate auth/session from secure storage
4. Init analytics (after consent if required)
5. Mount navigation with correct auth state
6. Defer non-critical init (prefetch, secondary SDKs)

This connects to performance and crash reduction stories.

---
