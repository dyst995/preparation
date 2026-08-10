# 10. Patching native Android libraries

> Source: `interview-prep/react-native/07-native-modules.md`

### Topics to learn
- [ ] Why you sometimes can't just "wait for upstream" (blocking bug, abandoned library, security fix needed now)
- [ ] Patch strategies: `patch-package` (JS-level file patches) vs directly editing vendored/forked native Android source
- [ ] Forking a library vs patching in place ? tradeoffs (forks drift from upstream; patches can break on version bumps)
- [ ] Documenting the patch clearly (why, what upstream issue/PR it relates to, what to re-check on library upgrade)
- [ ] Security/compatibility framing ? this is exactly what your MyCreditInfo bullet describes ("patched native Android libraries and bridged native code to improve security and platform compatibility")

### Interview question

**Q: Tell me about patching a native Android library on MyCreditInfo. Why not just wait for an upstream fix or switch libraries?**

**Strong answer (tailor with real specifics):**
> "MyCreditInfo was a legacy codebase with an outdated dependency that had a security or platform-compatibility gap ? newer Android OS versions had tightened behavior the library hadn't been updated for, and switching libraries entirely would have meant a larger, riskier rewrite under time pressure while we were also chasing a 20% crash rate down. So I patched the native Android source directly ? understanding the library's Kotlin/Java implementation well enough to fix the specific incompatibility or security gap ? and bridged/adjusted native code where the JS-level API needed to keep working unchanged for the rest of the app. I documented exactly what was changed and why, so it could be re-evaluated cleanly if we ever upgraded or replaced the dependency later, rather than becoming an invisible landmine for the next engineer."

**Follow-up: How do you keep a patch from silently breaking on the next dependency upgrade?**
> "Pin the dependency version until the patch is either upstreamed or the underlying issue is otherwise resolved, document the patch with a clear comment referencing the reason, and treat any future version bump of that dependency as requiring a deliberate re-check of whether the patch is still needed or needs to be reapplied/rewritten."

---
