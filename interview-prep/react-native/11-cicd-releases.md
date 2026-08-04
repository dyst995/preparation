# 11 - Builds, CI/CD, Releases & Store Ops

> Goal: Speak fluently and confidently about the exact pipeline you built and ran in production - Fastlane + GitLab Runner for Android and iOS, signing, versioning, OTA tradeoffs, store submission, staged rollouts, and hotfixes - at a depth that survives senior/staff follow-ups.

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Explain the difference between debug and release builds at the bundling, signing, and native-config level.
2. Walk through Android keystore management and iOS certificate/profile management without hand-waving.
3. Write and explain real Fastlane lanes for both platforms (build, sign, upload, changelog, notify).
4. Design a GitLab CI pipeline (with a self-hosted Runner, including a macOS runner for iOS) end-to-end.
5. Defend a versioning scheme (build numbers vs marketing versions) that survives multiple release trains.
6. Compare CodePush/EAS Update OTA delivery vs full store releases, including what Apple/Google policy allows.
7. Run a store submission checklist from memory for both Google Play and the App Store.
8. Explain staged rollouts and how you use them as a safety net.
9. Describe Proguard/R8 at a level that shows you understand shrinking, not just "it obfuscates code."
10. Handle CI secrets securely (no secrets in git, no secrets in logs).
11. Describe a hotfix strategy under production pressure, including when OTA is enough and when it isn't.

---

## 1. Debug vs release builds

### Topics to learn
- [ ] What changes in JS bundling (dev server vs bundled/minified JS)
- [ ] What changes in native build config (BuildConfig/Info.plist, `__DEV__`)
- [ ] Signing differences (debug keystore/dev certs vs release signing)
- [ ] Performance differences (dev warnings, Redux devtools, extra checks removed in release)
- [ ] Why "works in debug, crashes in release" is a real category of bug

### What actually changes

| Dimension | Debug | Release |
|---|---|---|
| JS source | Served live from Metro or unminified dev bundle | Bundled, minified, tree-shaken, often Hermes-precompiled bytecode |
| `__DEV__` | `true` | `false` - disables warnings, dev-only checks, extra logging |
| Signing (Android) | Auto-generated debug keystore | Your real release keystore (upload key or app signing key) |
| Signing (iOS) | Development certificate/profile | Distribution certificate + App Store/Ad Hoc/Enterprise provisioning profile |
| Native optimizations | Off (Proguard/R8 disabled, no bitcode/strip tuning) | Proguard/R8 minify+shrink on Android; symbol stripping/optimizations on iOS |
| Network | Often points to dev/staging API | Points to production API (must be configured, not hardcoded) |
| Error overlays | Red box / LogBox visible | No JS error overlay - crashes must be caught by Crashlytics/ErrorBoundary |
| Console logs | Visible via Metro/Logcat/Xcode console | Should be stripped or gated - noisy or leaking logs in release are a real bug class |

### Why "works in debug, crashes in release" happens

- Proguard/R8 strips or renames a class/method a reflection-based library needs (missing keep rule).
- A dev-only mock or flag silently hid a null/undefined path.
- Hermes bytecode behaves subtly differently from JSC for an edge case (rare but real).
- Environment config pointed at the wrong (or unreachable) API in release.
- A native module only works because Xcode/Android Studio injected extra debug entitlements.

### Interview question

**Q: You have a bug that only reproduces in a release build. How do you approach it?**

**Strong answer:**
> "I stop trying to reproduce it in debug and instead build a release APK/IPA locally or use the same lane the CI uses, so I'm testing what actually ships. I check Proguard/R8 mapping files and keep rules first if it's Android and touches reflection-based libraries (analytics SDKs, some native bridges). I check environment config to confirm production endpoints are used. I check Crashlytics for the exact release-only stack. If it's not crashing but just behaving differently, I isolate whether it's a `__DEV__`-gated code path or a minification side effect (e.g. relying on function/class names at runtime)."

---

## 2. Android signing: keystores

### Topics to learn
- [ ] Keystore vs key alias vs key password vs store password
- [ ] Upload key vs app signing key (Play App Signing)
- [ ] `debug.keystore` vs release keystore
- [ ] `signingConfigs` in `build.gradle`
- [ ] Keystore loss consequences and mitigation
- [ ] Keeping keystores out of git

### Mental model

An Android release APK/AAB must be signed. Signing proves the update comes from the same author as the previous version, so the OS/Play Store can trust the upgrade.

Key pieces:

| Term | What it is |
|---|---|
| Keystore file (`.jks`/`.keystore`) | Container holding one or more key pairs |
| Key alias | Named key inside the keystore |
| Store password | Unlocks the keystore file |
| Key password | Unlocks the specific alias |
| Upload key | The key you sign your AAB with when uploading to Play (with Play App Signing enabled) |
| App signing key | The key Google actually re-signs your app with for distribution; Google holds this when you opt into Play App Signing |

### Why Play App Signing matters

- If you lose your **upload key**, Google lets you request a reset (with proof of ownership) because Google still controls the real app signing key.
- If you lose the **app signing key** in the old (non-Play-App-Signing) model, you are permanently locked out of updating that app under the same package name/signature. This is why Play App Signing is the safer default for any serious production app.

### `build.gradle` signing config (conceptual)

```gradle
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

Passwords/paths come from `gradle.properties` (not committed) or CI-injected environment variables - never hardcoded, never committed.

### Interview question

**Q: What happens if you lose your Android release keystore?**

> "If Play App Signing is enabled, Google retains the actual signing key, so losing your upload key is recoverable through Google's identity-verification process and you get a new upload key. If Play App Signing isn't enabled and you lose the original signing key, you cannot publish updates to that existing app listing under the same identity anymore - you'd have to publish a new app, which is a disaster for an existing user base. That's why I always store keystores in a secure, backed-up secret store (not git) and enable Play App Signing on new apps."

### Green flags
- Mentions store password vs key password as distinct.
- Knows the difference between upload key and app signing key.
- Has an actual answer for "where do you store the keystore in CI" (see Section 10).

---

## 3. iOS signing: certificates & provisioning profiles

### Topics to learn
- [ ] Certificate (development vs distribution)
- [ ] App ID / Bundle ID
- [ ] Provisioning profile types: Development, Ad Hoc, App Store, Enterprise
- [ ] Automatic vs manual signing in Xcode
- [ ] `fastlane match` for team-shared signing
- [ ] Expiry management (certs and profiles expire and silently break CI)

### Mental model

iOS signing has three moving parts that must all agree:

1. **Certificate** - proves *who* built the app (tied to your Apple Developer account/team).
2. **App ID** - the bundle identifier and its enabled capabilities (push, keychain sharing, associated domains, etc.).
3. **Provisioning profile** - binds a certificate + App ID + (for non-App Store profiles) a device list, and defines how the app can be distributed.

| Profile type | Use case | Device restriction |
|---|---|---|
| Development | Local Xcode debugging | Registered dev devices only |
| Ad Hoc | Internal/QA distribution outside TestFlight | Registered devices only (UDID list) |
| App Store | Public release, TestFlight | None (any user) |
| Enterprise | Internal company distribution (no App Store) | None, but org-restricted |

### Why CI signing is painful without a strategy

- Certificates and profiles expire (typically ~1 year for certs; profiles have their own expiry).
- Each teammate generating their own certs causes "too many certificates" errors from Apple.
- Manual profile management doesn't scale to CI runners that need fresh checkouts.

### `fastlane match`

`match` stores encrypted signing certs/profiles in a private git repo (or cloud storage) and syncs them to any machine (including CI runners) via one command. This was the standard way to keep an entire team + CI in sync on the *same* signing identity instead of everyone minting their own.

```ruby
match(
  type: "appstore",
  readonly: is_ci,
  app_identifier: "com.company.myapp"
)
```

- `readonly: is_ci` ensures CI never mints new certs, only fetches existing ones - avoids CI accidentally invalidating the team's signing identity.

### Interview question

**Q: Walk me through iOS code signing for a CI pipeline.**

> "Certificates prove identity, App IDs define the app and its capabilities, and provisioning profiles tie a certificate, App ID, and distribution method together. Managing this manually across a team and CI runners is fragile - certs expire, and multiple people minting certs leads to Apple's certificate limit errors. I used `fastlane match` to keep signing certs and profiles in an encrypted repo that both developers and the GitLab Runner pull from, with CI always running in read-only mode so it never mutates the shared signing identity. That keeps one source of truth and avoids 'works on my machine, fails in CI' signing issues."

**Follow-up: what breaks when a cert expires mid-sprint?**
> Build fails at the codesign step in CI with a clear provisioning error; the fix is regenerating via `match` (or Xcode if manual) and re-running the pipeline - not touching app code.

---

## 4. Fastlane lanes (Android + iOS)

### Topics to learn
- [ ] `Fastfile` structure: lanes, platforms, private lanes
- [ ] `gym`/`build_app` (iOS), `gradle` action (Android)
- [ ] `pilot`/`upload_to_testflight`, `deliver`/`upload_to_app_store`
- [ ] `supply`/`upload_to_play_store`
- [ ] `increment_build_number` / `increment_version_code`
- [ ] Changelog generation (git log parsing or CHANGELOG file)
- [ ] Slack/notification steps
- [ ] Fastlane `.env` and CI variable usage

### Why Fastlane

Fastlane turns "10 manual Xcode/Android Studio steps prone to human error" into one reproducible command, runnable identically on a laptop or a CI runner. That reproducibility is the entire point for a CI/CD story.

### Example Android lane

```ruby
platform :android do
  desc "Build and upload a release AAB to Play Store internal track"
  lane :internal do
    gradle(
      task: "bundle",
      build_type: "Release",
      properties: {
        "android.injected.signing.store.file" => ENV["ANDROID_KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["ANDROID_KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["ANDROID_KEY_PASSWORD"]
      }
    )
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      json_key: ENV["PLAY_STORE_JSON_KEY_PATH"],
      release_status: "draft"
    )
    slack(message: "Android internal build uploaded: #{lane_context[SharedValues::VERSION_NUMBER]}")
  end

  desc "Promote internal to production with staged rollout"
  lane :promote_production do
    upload_to_play_store(
      track: "production",
      rollout: "0.10",
      skip_upload_apk: true,
      skip_upload_aab: true
    )
  end
end
```

### Example iOS lane

```ruby
platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    increment_build_number(build_number: latest_testflight_build_number + 1)
    match(type: "appstore", readonly: is_ci)
    build_app(
      scheme: "MyApp",
      export_method: "app-store"
    )
    upload_to_testflight(skip_waiting_for_build_processing: true)
    slack(message: "iOS TestFlight build uploaded: #{get_build_number}")
  end

  desc "Submit current build to App Store review"
  lane :release do
    deliver(
      submit_for_review: true,
      automatic_release: false,
      force: true
    )
  end
end
```

### Interview-ready explanation

> "I keep one Fastlane lane per meaningful action - internal Android track, TestFlight beta, production promotion with rollout, App Store submission - so the pipeline is declarative and reviewable in code review just like app code. Version/build numbers are incremented inside the lane, not by hand, so there's never a mismatch between what's tagged and what's uploaded. Every lane ends with a Slack notification so the team has visibility without checking CI dashboards."

### Common Fastlane pitfalls (be ready to discuss)

| Pitfall | Fix |
|---|---|
| Hardcoded credentials in `Fastfile` | Always via `ENV` populated by CI secret variables |
| Build number collisions across CI retries | Increment based on the store's latest build, not local counters |
| `match` mutating certs during a CI run | `readonly: true` in CI |
| Slow `pod install` every run | Cache CocoaPods / use `bundle exec` with `Gemfile.lock` pinned |
| Play Store API quota / auth failures | Use a dedicated service account JSON key with least-privilege API scopes |

---

## 5. GitLab Runner pipelines for Android/iOS

### Topics to learn
- [ ] Shared vs specific (self-hosted) Runners
- [ ] Why iOS needs a macOS runner (Xcode/CocoaPods requirement)
- [ ] Docker-based Android jobs vs bare-metal/VM iOS jobs
- [ ] `.gitlab-ci.yml` stages: install -> lint/test -> build -> sign -> upload
- [ ] Caching (`node_modules`, Gradle cache, CocoaPods/DerivedData)
- [ ] Manual approval gates for production deploys
- [ ] Protected branches/tags triggering release lanes
- [ ] Runner tags to route jobs to the right machine

### Why GitLab Runner (self-hosted) instead of only shared runners

- iOS builds require macOS + Xcode, which GitLab's free shared runners historically didn't provide (or provide with limits) - so a **self-hosted macOS Runner** (a Mac mini/Mac in the office or cloud Mac) tagged e.g. `ios-macos` is standard.
- Android can run in Docker containers on any Linux runner, which is cheaper and easier to scale/parallelize.
- Self-hosted runners also let you cache heavy dependencies (Gradle, CocoaPods, `node_modules`, Xcode DerivedData) across runs on the same machine, which is a big speed win vs ephemeral shared runners.

### Example `.gitlab-ci.yml` (conceptual, both platforms)

```yaml
stages:
  - install
  - test
  - build
  - deploy

variables:
  GIT_DEPTH: 1

.node_cache: &node_cache
  key:
    files: [yarn.lock]
  paths: [node_modules]

install_deps:
  stage: install
  tags: [linux-docker]
  cache: *node_cache
  script:
    - yarn install --frozen-lockfile

lint_test:
  stage: test
  tags: [linux-docker]
  script:
    - yarn lint
    - yarn test --ci

build_android:
  stage: build
  tags: [linux-docker]
  image: reactnativecommunity/react-native-android
  cache:
    - *node_cache
    - key: gradle-cache
      paths: [~/.gradle/caches]
  script:
    - bundle exec fastlane android internal
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  artifacts:
    paths: [app/build/outputs/bundle/release/*.aab]

build_ios:
  stage: build
  tags: [macos-xcode]
  cache:
    - *node_cache
    - key: pods-cache
      paths: [ios/Pods]
  script:
    - cd ios && bundle exec pod install && cd ..
    - bundle exec fastlane ios beta
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'

promote_production:
  stage: deploy
  tags: [linux-docker]
  script:
    - bundle exec fastlane android promote_production
  when: manual
  rules:
    - if: '$CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/'
```

### Key design decisions to be ready to justify

| Decision | Why |
|---|---|
| Separate `install`/`test`/`build`/`deploy` stages | Fail fast on lint/test before spending build minutes |
| Runner tags (`linux-docker`, `macos-xcode`) | Route each job to hardware capable of running it |
| Caching keyed on lockfiles | Avoid re-downloading unchanged dependencies every run |
| `when: manual` on production promote | Human-in-the-loop gate before a real production release/rollout bump |
| Tag-triggered production deploy | Only intentional, versioned commits ship to users, not every merge to main |

### Interview question

**Q: Why did you need a self-hosted GitLab Runner instead of just shared runners?**

> "iOS builds require Xcode and CocoaPods, so I set up a macOS Runner tagged for iOS jobs, while Android built in Docker on Linux runners which is cheaper and parallelizes better. Self-hosting also let me persist Gradle, CocoaPods, and node_modules caches across pipeline runs on the same machine, which cut build time significantly versus cold shared runners. Production releases were gated behind a manual approval step and only triggered from version tags, so nothing ships accidentally from a regular merge."

---

## 6. Versioning strategy

### Topics to learn
- [ ] Android `versionCode` (integer, must increase) vs `versionName` (marketing string)
- [ ] iOS `CFBundleVersion` (build number) vs `CFBundleShortVersionString` (marketing version)
- [ ] Keeping both platforms' marketing versions in sync
- [ ] Automating bumps in CI vs manual bumps
- [ ] Git tags as the source of truth

### Table: version fields

| Platform | Field | Meaning | Constraint |
|---|---|---|---|
| Android | `versionCode` | Internal integer for Play Store ordering | Must strictly increase per upload |
| Android | `versionName` | Human-readable, e.g. `2.4.1` | Free-form, shown to users |
| iOS | `CFBundleVersion` | Build number | Must increase per build within a version, per Apple |
| iOS | `CFBundleShortVersionString` | Marketing version, e.g. `2.4.1` | Shown in App Store |

### Recommended scheme

- Marketing version (`2.4.1`) follows semantic versioning and is bumped intentionally per release, kept identical on Android `versionName` and iOS `CFBundleShortVersionString`.
- Build number/`versionCode` is auto-incremented by CI on every build that reaches an upload step (never hand-edited), sourced from "current store build + 1" via Fastlane (`latest_testflight_build_number`, `google_play_track_version_codes`) to avoid collisions across machines/retries.
- A git tag (`v2.4.1`) is the trigger and audit trail for what actually shipped to production.

### Interview question

**Q: How do you avoid versionCode collisions when multiple CI runs happen close together?**

> "I don't maintain a local counter - I ask the store for its current highest build number/versionCode via the Fastlane actions that query Play/App Store Connect, and increment from that live value at build time. That way even if two pipelines run close together, or a build is retried, the number reflects reality instead of drifting out of sync with what's already been uploaded."

---

## 7. OTA updates: CodePush / EAS Update tradeoffs

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

## 8. Store release checklists

### Google Play checklist

- [ ] `versionCode` incremented, `versionName` matches intended release
- [ ] Signed AAB built with correct signing config (release, not debug)
- [ ] Proguard/R8 mapping file uploaded (for readable crash stacks)
- [ ] Target API level meets current Play requirements
- [ ] Privacy policy URL present and accurate
- [ ] Data safety form up to date (permissions match what the app actually collects)
- [ ] Release notes written for the track
- [ ] Screenshots/store listing current if UI changed materially
- [ ] Internal/closed testing track validated before production promotion
- [ ] Staged rollout percentage decided (not 100% by default for risky releases)
- [ ] Crash-free users dashboard open and monitored post-release

### App Store checklist

- [ ] Build number incremented, marketing version matches intended release
- [ ] Correct provisioning profile (App Store distribution) used for the export
- [ ] dSYMs uploaded (via Fastlane/Crashlytics) for symbolicated crash stacks
- [ ] App Store screenshots/metadata current for all required device sizes
- [ ] Export compliance (encryption) question answered correctly
- [ ] Privacy nutrition labels match actual data collection/SDKs
- [ ] TestFlight build validated by internal/external testers first
- [ ] Release strategy chosen: automatic release vs manual release after approval
- [ ] Phased release enabled for production (Apple's own staged rollout over ~7 days) when appropriate
- [ ] Crashlytics/App Store Connect crash trends monitored post-release

### Interview question

**Q: What do you check in the first 24-48 hours after a store release?**

> "Crash-free users/sessions rate versus the previous version, any spike in a specific crash signature tied to the new build, ANR rate on Android, key funnel metrics if the release touched a critical flow like payments, and store console warnings (policy, pre-launch report issues). If crash-free rate drops meaningfully, I pause or roll back the staged rollout percentage rather than letting it continue to 100%."

---

## 9. Staged rollouts

### Topics to learn
- [ ] Play Store staged rollout percentages
- [ ] App Store phased release mechanics
- [ ] Halting/rolling back a rollout
- [ ] Correlating rollout percentage with crash monitoring
- [ ] Deciding rollout speed based on blast radius of the change

### Why staged rollouts matter

A staged rollout limits the "blast radius" of a bad release. Instead of 100% of users getting a broken build simultaneously, you expose 5-10% first, watch Crashlytics/vitals, and only increase the percentage once metrics look healthy.

### Practical playbook

1. Ship to internal/closed testing track first; sanity-check manually.
2. Promote to production at a low percentage (e.g. 10%).
3. Watch crash-free rate, ANR rate, and any custom health metrics for a defined window (e.g. a few hours to a day depending on traffic volume).
4. If healthy, increase rollout (e.g. 10% -> 50% -> 100%).
5. If unhealthy, halt the rollout (Play allows halting without full user impact) and prepare a fix or rollback.

### Interview question

**Q: How do staged rollouts fit into your CI/CD pipeline?**

> "My `promote_production` Fastlane lane takes a rollout percentage as a parameter. A release always starts at a conservative percentage, gated behind manual approval in GitLab. I keep the crash dashboard open during the rollout window and only bump the percentage - also via a manual pipeline job - once metrics look clean. If something regresses, halting the rollout is a one-click action in the Play Console, and for iOS I'd pause the phased release the same way."

---

## 10. Proguard/R8 (high level)

### Topics to learn
- [ ] Shrinking (removing unused code)
- [ ] Obfuscation (renaming classes/methods)
- [ ] Optimization (bytecode-level rewrites)
- [ ] Keep rules (`proguard-rules.pro`) for reflection-based libraries
- [ ] Mapping files for de-obfuscating crash stacks

### What R8 actually does

| Function | Effect |
|---|---|
| Shrinking | Removes unused classes/methods/resources to reduce APK/AAB size |
| Obfuscation | Renames classes/methods/fields to short meaningless names, raising reverse-engineering effort |
| Optimization | Inlines, removes dead branches, simplifies bytecode |

### Why it breaks things without keep rules

Libraries that use reflection (JSON serializers, some analytics/crash SDKs, native bridge glue code that looks up classes by name) can have the exact symbols R8 renames or strips. A `-keep` rule tells R8 "don't touch this class/method," which is why "release-only crash after enabling minification" is such a common bug class.

```proguard
-keep class com.facebook.react.** { *; }
-keep class com.mycompany.somesdk.** { *; }
-keepattributes SourceFile,LineNumberTable
```

### Interview question

**Q: What's the difference between shrinking and obfuscation in R8?**

> "Shrinking removes code and resources that static analysis proves are unreachable, which reduces app size. Obfuscation separately renames the remaining symbols to short names, which raises the bar for reverse engineering but doesn't reduce size much on its own. Both can break reflection-dependent libraries unless you add keep rules, which is why I always ship the mapping file to Crashlytics/Play so stack traces stay readable, and validate a real release build (not just debug) whenever I touch dependencies that use reflection."

---

## 11. Secrets in CI

### Topics to learn
- [ ] Never committing keystores/certs/API keys to git
- [ ] GitLab CI/CD protected variables and masked variables
- [ ] File-type CI variables for keystores/JSON keys/`.p8` keys
- [ ] Scoping secrets to protected branches/environments
- [ ] Rotating secrets after any suspected leak
- [ ] `fastlane match`'s encryption for signing assets specifically

### Practical secret inventory for this pipeline

| Secret | Where it lives | Notes |
|---|---|---|
| Android release keystore | GitLab CI file variable (protected) | Never in repo; base64 or file-type variable |
| Keystore/key passwords | GitLab CI masked variables | Masked in job logs |
| Play Store service account JSON | GitLab CI file variable (protected) | Scoped to least-privilege API access |
| iOS signing certs/profiles | Encrypted `match` git repo, decrypted with a passphrase stored as a CI variable | CI runs `match` read-only |
| App Store Connect API key | GitLab CI file variable (protected) | Used by Fastlane instead of interactive Apple ID login |
| Backend API keys/secrets used at build time | CI variables injected into env-specific build config | Never bundled as plain strings the JS bundle can leak (see security chapter) |

### Interview question

**Q: How do you keep signing keys and API secrets safe in a shared CI pipeline?**

> "Nothing sensitive lives in the repo. Keystores, the Play service account JSON, and Apple API keys are stored as protected, masked GitLab CI variables (or file-type variables), scoped so only pipelines on protected branches/tags can access them. iOS signing specifically goes through `fastlane match`, which keeps certs/profiles encrypted in a separate repo and only ever fetches them read-only in CI. If a secret is ever exposed - a misconfigured job printing an env var, for example - I treat it as compromised and rotate it immediately rather than assuming it's fine."

### Red flags to avoid in your own answers
- "We just put the keystore in the repo, it's a private repo anyway." (No - private repos still leak via forks, laptops, ex-employees, misconfig.)
- Not knowing the difference between masked and protected variables.
- No rotation story if asked "what if a secret leaked?"

---

## 12. Hotfix strategy

### Topics to learn
- [ ] Deciding OTA vs emergency binary release
- [ ] Branching strategy for hotfixes (hotfix branch off production tag)
- [ ] Expedited review requests (Apple supports this for critical fixes)
- [ ] Fast-tracking through CI without skipping safety checks
- [ ] Post-incident staged rollout even for hotfixes

### Decision flow

1. **Classify the bug**: JS-only logic bug vs native/permissions/dependency issue.
2. **If JS-only and policy-safe**: ship via OTA immediately; still go through the normal PR/lint/test pipeline, just prioritized.
3. **If native or policy-sensitive**: cut a hotfix branch from the current production tag (not from main, which may have unrelated in-flight work), fix, run full CI, and release as a new build.
4. **iOS specifically**: if it's severe (payments broken, crash on launch), request Apple's expedited review to shorten review time - reserve this for genuinely urgent cases, not convenience.
5. **Still stage the rollout** for the hotfix itself where possible - a hotfix that's itself broken is a real risk, so even urgent releases benefit from a fast but staged rollout (e.g. 20% then quickly to 100% once confirmed clean) rather than 100% blind.
6. **Backport**: merge the hotfix branch back into main so the fix isn't lost in the next regular release.

### Interview question

**Q: Production is down for a payment flow. Walk me through your hotfix process.**

> "First I confirm scope and root cause fast - is this JS logic, a backend contract change, or a native/crash issue - using Crashlytics and recent release diffs. If it's a pure JS bug and within OTA policy limits, I ship an OTA fix immediately since that's minutes, not hours. In parallel, or instead if it needs a native fix, I branch a hotfix off the current production tag, keep the fix minimal and reviewed, run it through the full Fastlane/GitLab pipeline - I don't skip tests just because it's urgent, since a bad hotfix is worse than a slow one - and for iOs I'd request expedited review given the severity. I still roll out cautiously, watching crash and payment-success metrics, then backport the fix into main so it isn't lost."

---

## Full interview question bank (with answer targets)

### Builds & signing
1. **Debug vs release build differences?** - bundling, `__DEV__`, signing, minification, endpoints.
2. **What is Play App Signing and why does it matter?** - protects you if you lose your upload key.
3. **What are the iOS provisioning profile types?** - Development, Ad Hoc, App Store, Enterprise.
4. **Why use `fastlane match`?** - one shared encrypted signing identity for team + CI, avoids cert-limit errors.

### Pipeline design
5. **Why a self-hosted GitLab Runner for iOS?** - Xcode/macOS requirement, caching control.
6. **How do you structure `.gitlab-ci.yml` stages?** - install -> test -> build -> deploy, fail fast.
7. **How do you gate production releases?** - manual approval job + tag-triggered pipeline.
8. **How do you avoid `versionCode`/build number collisions?** - query the store's live latest value, don't use a local counter.

### OTA & store ops
9. **CodePush/EAS Update vs full release - tradeoffs?** - speed/rollback vs native capability/review requirement.
10. **What must always go through a full store release?** - native code, permissions, new deps, icons/splash.
11. **What's in your Play/App Store release checklist?** - see Section 8.
12. **What do you monitor after release?** - crash-free rate, ANR rate, key funnel metrics.

### Safety mechanisms
13. **How do staged rollouts work and why use them?** - limit blast radius, monitor before widening.
14. **What does R8 actually do?** - shrink, obfuscate, optimize; keep rules for reflection.
15. **How do you keep CI secrets safe?** - masked/protected variables, `match` encryption, least privilege, rotation on suspicion.
16. **Your hotfix strategy under production pressure?** - classify, OTA if safe, hotfix branch + full CI if native, expedited review if severe, still stage rollout, backport.

---

## Hands-on drills (do these)

- [ ] Write a full `Fastfile` from memory for Android (build, sign, upload to internal track, staged production promote).
- [ ] Write a full `Fastfile` from memory for iOS (match, build, TestFlight, App Store submit).
- [ ] Draw your GitLab CI pipeline stages on paper, label which runner (Linux/macOS) each job needs and why.
- [ ] Explain out loud, in under 3 minutes, the full lifecycle from `git tag v2.4.1` to the app appearing on a user's device.
- [ ] List every secret your pipeline needs and where each one is stored - without looking anything up.
- [ ] Simulate a "cert expired" incident out loud: what breaks, what error you'd see, how you fix it.
- [ ] Practice explaining OTA limitations to a non-technical stakeholder in 2 sentences.

---

## Senior red flags / green flags

### Green flags interviewers love
- Knows the difference between upload key and app signing key without prompting.
- Ties every CI decision to a concrete failure mode it prevents (cert limits, versionCode collisions, secret leaks).
- Has an opinion on when OTA is inappropriate, not just when it's convenient.
- Talks about monitoring *after* release as part of the release process, not an afterthought.
- Can explain a real hotfix they shipped, including what went right/wrong.

### Red flags
- "Fastlane just automates the App Store, I don't know the details."
- Treats OTA as a way to bypass App Store review for real features.
- No opinion on staged rollouts ("we just release to 100%").
- Doesn't know keystores/certs expire or can be lost.
- Stores secrets in the repo "because it's private."

---

## Tie-backs to your experience (use in answers)

- You personally built and ran **Fastlane + GitLab Runner** pipelines for both Android and iOS across multiple apps (MyCreditInfo, Wizer, Online School, EasyPay), which is a rare, senior-level, end-to-end ownership story most RN developers can't tell.
- Your crash-rate reduction stories (MyCreditInfo ~20% -> 0.03%, Wizer ~15% -> 0.09%, Online School ~28% -> 0.15%) are directly tied to release discipline: staged rollouts, mapping/dSYM uploads for readable stacks, and monitoring after each release - not luck.
- Managing App Store/Google Play releases across several apps means you've personally hit certificate expiry, versionCode mismatches, and review rejections, and fixed them - concrete stories beat theory.
- Legacy modernization work required you to introduce CI/CD onto apps that likely had manual, error-prone release processes before you touched them - a strong "before/after" narrative.

---

## Mastery checklist

- [ ] I can explain Android and iOS signing end-to-end without notes.
- [ ] I can write a Fastlane lane for both platforms from memory.
- [ ] I can justify every stage and runner tag in a GitLab CI pipeline.
- [ ] I can explain OTA tradeoffs and store policy limits precisely.
- [ ] I can recite both store release checklists.
- [ ] I can explain staged rollouts and when to halt one.
- [ ] I can explain R8 shrinking/obfuscation and why keep rules exist.
- [ ] I have a clear, safe answer for "how do you manage CI secrets."
- [ ] I have a real hotfix story ready with specifics (what broke, how fast, what I shipped).
