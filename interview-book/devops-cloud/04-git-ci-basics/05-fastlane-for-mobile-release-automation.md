# 05. Fastlane for mobile release automation

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

### Topics to learn
- [ ] Fastlane = a Ruby-based automation tool for building, signing, and releasing mobile apps
- [ ] `Fastfile` defines "lanes" (named automation recipes, e.g. `beta`, `release`)
- [ ] `gym` - builds and signs the iOS app (produces an .ipa)
- [ ] `match` - manages and syncs iOS signing certificates/provisioning profiles across a team via a shared encrypted git repo
- [ ] `sigh` - manages provisioning profiles specifically (often used internally by match now)
- [ ] `deliver` - uploads iOS builds/metadata to App Store Connect
- [ ] `pilot` - manages TestFlight beta distribution
- [ ] `supply` - Android equivalent: uploads builds/metadata to the Google Play Console
- [ ] `gradle` action - builds/signs Android apps (produces an .apk/.aab)
- [ ] Why Fastlane matters: manual app store releases (screenshots, metadata, signing, binary upload) are slow and error-prone; Fastlane scripts the entire thing so a CI runner can do it unattended

### Example `Fastfile` (Android + iOS lanes, simplified)

```ruby
platform :android do
  desc "Build and upload a release candidate to the Play Store internal track"
  lane :release_candidate do
    gradle(task: "bundle", build_type: "Release")
    supply(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab"
    )
  end
end

platform :ios do
  desc "Build, sign, and upload a release candidate to TestFlight"
  lane :release_candidate do
    match(type: "appstore", readonly: true)   # fetch existing signing certs/profiles, don't regenerate
    gym(scheme: "MyApp", export_method: "app-store")
    pilot(skip_waiting_for_build_processing: true)
  end
end
```

```bash
# Run from CI (GitLab Runner) or locally
fastlane android release_candidate
fastlane ios release_candidate
```

### How this fits with GitLab CI (your actual real-world setup)

```yaml
ios_release_candidate:
  stage: deploy
  tags:
    - macos   # this job needs a macOS runner with Xcode installed
  script:
    - bundle install
    - fastlane ios release_candidate
  only:
    - /^release\/.*/   # trigger only on release branches

android_release_candidate:
  stage: deploy
  tags:
    - android-build
  script:
    - bundle install
    - fastlane android release_candidate
  only:
    - /^release\/.*/
```

The `tags` field is how GitLab CI routes a job to a specific runner - critical for mobile CI, since iOS builds require a macOS runner with Xcode, which is fundamentally different infrastructure from a generic Linux runner used for backend jobs.

### Model spoken answer

"Fastlane automates the parts of mobile releases that are normally manual and error-prone - building, code signing, and uploading to the stores. On the projects where I built Android and iOS CI/CD pipelines, GitLab Runner triggered Fastlane lanes on release branches: gym built and signed the iOS binary using certificates managed through match, then pilot pushed it to TestFlight; on Android, the gradle action built the app bundle and supply pushed it to the Play Console's internal track. The key CI detail is that iOS builds need a macOS runner with Xcode, so I tagged those jobs specifically to route them to the right runner, separate from the Linux runners used for everything else."

---
