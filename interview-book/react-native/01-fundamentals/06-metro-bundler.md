# 06. Metro bundler

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] Metro�s role: bundle JS for RN
- [ ] Fast Refresh vs full reload
- [ ] Resolution of platform extensions
- [ ] Asset handling basics
- [ ] Dev bundle vs release bundle
- [ ] Common issues: cache, monorepo resolution, symlinks

### Key ideas

- Metro transforms and bundles your JS/TS for the app.
- In dev, it serves bundles and supports Fast Refresh.
- In release, JS is packaged into the binary (and Hermes bytecode when enabled).
- Module resolution understands `.ios.js`, `.android.js`, `.native.js`, etc.

### Interview question

**Q: What does Metro do?**

> �Metro is React Native�s bundler. It resolves modules, transforms JS/TS, handles platform-specific extensions, and serves or packages the bundle. In development it enables Fast Refresh; in production it creates the optimized bundle shipped inside the app.�

---
