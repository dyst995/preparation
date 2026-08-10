# 07. OTA updates: CodePush / EAS Update tradeoffs

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] What OTA can and cannot change
- [ ] Apple/Google policy constraints on OTA
- [ ] Rollback support
- [ ] Staged OTA rollout percentages
- [ ] When OTA is the wrong tool

### What OTA (CodePush-style / EAS Update-style) can ship

- JS bundle changes (bug fixes, UI copy/logic, most app behavior).
- Asset changes bundled with JS (images referenced from JS, not native resources).

### What OTA cannot ship

- Native code changes (new/updated native modules, native permissions, Info.plist/AndroidManifest changes).
- New native dependencies (anything requiring a new native build).
- Changes to app icons, splash screens, native permission strings (these are native-project-level).
- Anything Apple would consider "significant functionality change" outside the shipped binary's intent - Apple's guidelines restrict OTA to bug fixes/minor content, not smuggling entire new features/native capability around review.

### Tradeoff table

| Aspect | OTA update (CodePush/EAS Update) | Full store release |
|---|---|---|
| Speed to users | Minutes to hours | Hours to days (review time) + rollout time |
| Review required | No (but must stay within policy) | Yes (App Store review; Play review is usually fast but exists) |
| Native changes | Not possible | Full capability |
| Rollback | Fast - revert to previous bundle | Slower - new build + re-review/rollout |
| Risk if broken | Can brick app logic for users who already updated silently | Contained by staged rollout percentages |
| Best use case | Urgent JS bug fix, copy fix, feature-flag-guarded logic | Anything native, anything requiring review, planned releases |

### Interview question

**Q: When do you use OTA vs a full store release?**

> "OTA is for JS-only fixes I need in users' hands fast - a broken screen, a bad conditional, a copy error - without waiting for App Store review. Anything touching native code, permissions, new native dependencies, or icons/splash has to go through a real store release, because OTA can't ship that and, for iOS specifically, pushing significant behavior changes purely via OTA risks violating App Store review policy. In practice I treat OTA as a hotfix tool with its own rollback plan, not a replacement for the normal release pipeline."

**Follow-up: what's the risk of over-relying on OTA?**
> Users can end up on divergent, hard-to-reproduce JS versions on top of the same native binary; if an OTA update itself has a bug, you need a fast rollback path (previous bundle) or you've now shipped a broken update to everyone who opened the app, without app-store-level staged rollout protection unless your OTA tool supports its own percentage rollout.

---
