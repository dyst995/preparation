# 04. Fastlane lanes (Android + iOS)

> Source: `interview-prep/react-native/11-cicd-releases.md`

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
