# 05. GitLab Runner pipelines for Android/iOS

> Source: `interview-prep/react-native/11-cicd-releases.md`

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
