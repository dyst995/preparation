04 - Git & CI Basics

Goal: Speak fluently about Git workflows and code review practices, and explain CI/CD concepts with real depth - grounded in your actual GitLab Runner + Fastlane pipelines for Android/iOS release automation - plus general backend CI concepts (lint/test/build/deploy) that apply regardless of platform.

Mark progress with [x] as you master each topic.

---

Learning objectives

By the end of this chapter you should be able to:

1. Explain common Git workflows (feature branching, trunk-based awareness) and justify a choice for a given team size/release cadence.
2. Handle real Git scenarios: merge vs rebase, resolving conflicts, cherry-pick, revert vs reset, interactive rebase awareness.
3. Describe good PR/code review etiquette from both the author and reviewer side.
4. Explain GitLab CI concepts: `.gitlab-ci.yml`, stages, jobs, runners, artifacts, caching, environment variables/secrets.
5. Explain Fastlane's role in mobile release automation: lanes, signing (match/sigh awareness), building (gym), distribution (deliver/supply/pilot).
6. Describe a generic backend CI/CD pipeline (lint -> test -> build -> containerize -> deploy) and where secrets/environments fit in.
7. Tell your real GitLab Runner + Fastlane CI/CD story fluently.

---

## 1. Git workflows

### Topics to learn
- [ ] Feature branching (branch per feature/ticket, PR/MR into main or develop)
- [ ] Git Flow (main/develop/feature/release/hotfix branches) - awareness, know when it's overkill
- [ ] Trunk-based development (short-lived branches, frequent merges to main, heavy reliance on feature flags) - awareness
- [ ] Protected branches, required reviews, required CI checks before merge
- [ ] Release branches / release candidates (relevant to your Fastlane/mobile release experience)

### Comparison

| Workflow | Good for | Trade-off |
|---|---|---|
| Feature branching + PRs | Most teams, most sizes | Straightforward, works with any release cadence |
| Git Flow | Scheduled/versioned releases, multiple maintained versions | More ceremony/branches than most teams need today |
| Trunk-based | High-velocity teams with strong CI/feature flags | Requires discipline and feature-flag infrastructure to avoid breaking main |

### Model spoken answer

"Day to day I work with feature branches off main, opened as a merge request/PR for review and CI checks before merging. For mobile release cycles specifically - like the Android/iOS pipelines I built with GitLab Runner and Fastlane - a release-branch or release-candidate model made more sense, since app store review adds a real time delay and you need a stable snapshot to promote through internal testing, staged rollout, and store review rather than constantly shipping off a fast-moving main branch."

---

## 2. Real Git scenarios you should be able to handle live

### Topics to learn
- [ ] Merge vs rebase (history shape, when each is appropriate)
- [ ] Resolving a merge conflict step by step
- [ ] `git cherry-pick` (apply one specific commit onto another branch)
- [ ] `git revert` vs `git reset` (safe, history-preserving undo vs rewriting history)
- [ ] Interactive rebase (`git rebase -i`) for squashing/cleaning commits before merge - awareness
- [ ] `git stash` for quickly parking uncommitted work
- [ ] `git bisect` for finding which commit introduced a bug - awareness, high-signal if you can describe it

### Merge vs rebase

```bash
# Merge: preserves both histories, creates a merge commit
git checkout feature-branch
git merge main

# Rebase: replays feature-branch's commits on top of main, linear history, no merge commit
git checkout feature-branch
git rebase main
```

**Rule of thumb:** rebase your own feature branch onto main before opening/updating a PR to keep history linear and reviews clean; avoid rebasing branches that others have already pulled/built on top of, since rebase rewrites commit hashes and can create painful conflicts for collaborators.

### Revert vs reset

```bash
# revert: creates a NEW commit that undoes a previous commit's changes.
# Safe for shared/pushed history - doesn't rewrite anything.
git revert <commit-sha>

# reset: moves the branch pointer, optionally changing the working directory/index.
# Rewriting shared history with reset --hard + force push is dangerous on shared branches.
git reset --hard <commit-sha>
```

**Rule of thumb:** use `revert` on anything already pushed/shared (like main or a release branch); `reset` is fine for your own local, unpushed commits.

### Cherry-pick example

"A hotfix was committed on a release branch, and I need that same fix on main too."

```bash
git checkout main
git cherry-pick <hotfix-commit-sha>
```

### Model spoken answer

"For my own feature branch, I rebase onto main to keep history linear before opening a PR, but I never rewrite history on a shared branch that others have already pulled - there I'd use revert instead of reset, since revert adds a new commit undoing the change without altering existing history. Cherry-pick is my go-to when a fix landed on one branch, like a release branch, and needs to be replicated onto another, like main, without merging the whole branch."

---

## 3. PR / code review etiquette

### Topics to learn
- [ ] Small, focused PRs over huge ones
- [ ] Clear PR description: what changed and why, not just what
- [ ] Self-review before requesting review (catch obvious issues yourself first)
- [ ] As a reviewer: focus on correctness/design/maintainability first, nitpick style last (and ideally let a linter/formatter handle style entirely)
- [ ] Explain reasoning in review comments, not just "change this"
- [ ] Required CI checks passing before merge as a baseline gate

### Model spoken answer

"I try to keep PRs small and focused on one thing, with a description that explains the why, not just a list of changed files - that context is what actually helps a reviewer. As a reviewer, I prioritize correctness and design concerns over style, since style should mostly be enforced by a linter/formatter in CI rather than argued about in review comments. And I treat CI passing - lint, tests, build - as a non-negotiable baseline before merge, not something to override under time pressure."

---

## 4. GitLab CI concepts

### Topics to learn
- [ ] `.gitlab-ci.yml` defines the pipeline
- [ ] `stages` (e.g. lint, test, build, deploy) define ordering; jobs within the same stage run in parallel
- [ ] `jobs` are the actual units of work, each running in its own isolated environment
- [ ] Runners execute jobs - shared GitLab.com runners vs self-hosted/specific runners (tagged runners, relevant for mobile builds needing macOS for iOS)
- [ ] `artifacts` pass files between stages/jobs (e.g. a build output, an .ipa/.apk)
- [ ] `cache` speeds up repeated jobs (e.g. node_modules, CocoaPods, Gradle caches)
- [ ] CI/CD variables for secrets (masked, protected variables scoped to protected branches)
- [ ] `rules`/`only`/`except` controlling when a job runs (branch, tag, merge request context)

### Example `.gitlab-ci.yml` for a backend service (lint -> test -> build -> deploy)

```yaml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  NODE_ENV: test

cache:
  key: "$CI_COMMIT_REF_SLUG"
  paths:
    - node_modules/

lint:
  stage: lint
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint

test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run test -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  only:
    - main

deploy_production:
  stage: deploy
  image: alpine:3.20
  script:
    - apk add --no-cache openssh-client
    - ssh $DEPLOY_USER@$DEPLOY_HOST "docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA && docker compose up -d"
  environment:
    name: production
  only:
    - main
  when: manual   # require a manual click to deploy to production
```

Key things worth pointing out unprompted: `only: main` scopes build/deploy to the main branch only (feature branches just run lint+test), `when: manual` gates production deploys behind a deliberate click rather than every merge auto-deploying, and CI/CD variables like `$CI_REGISTRY_PASSWORD`/`$DEPLOY_HOST` are configured as protected, masked variables in GitLab's project settings - never committed to the repo.

### Model spoken answer

"A GitLab CI pipeline is defined in .gitlab-ci.yml as a set of stages - like lint, test, build, deploy - where jobs in the same stage run in parallel and stages run in order. Runners actually execute the jobs; for mobile builds specifically you need a runner with macOS/Xcode available for iOS, which is part of why I set up dedicated GitLab Runners for our Android/iOS pipelines rather than relying on shared generic runners. Secrets like registry credentials or deploy hosts are stored as protected, masked CI/CD variables in GitLab's settings, never committed to the repo, and I usually gate production deploys behind a manual approval step rather than auto-deploying every merge to main."

---

## 5. Fastlane for mobile release automation

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

## 6. Backend CI concepts (generalized, not tied to a specific mobile pipeline)

### Topics to learn
- [ ] Standard pipeline shape: lint -> unit test -> (integration test) -> build -> containerize -> deploy
- [ ] Fail fast: cheap checks (lint) before expensive ones (integration tests, builds)
- [ ] Environments: dev/staging/production, each potentially with its own deploy job and variables
- [ ] Artifact promotion: build once, deploy the same artifact/image to multiple environments (don't rebuild per environment - risk of drift)
- [ ] Rollback strategy: keep previous image tags/versions available for quick rollback
- [ ] Database migrations as a deploy step, and why they need care (run before or after the new code deploys, backward-compatible schema changes)

### Model spoken answer

"For a backend service, I structure the pipeline as fail-fast stages: lint first since it's cheap and catches obvious mistakes immediately, then unit tests, then a build step that produces one artifact - typically a Docker image tagged with the commit SHA - and that exact image gets promoted through staging and production rather than rebuilt per environment, so what you tested is exactly what you deploy. Database migrations are their own careful step, usually run just before or after deploy depending on whether the change is backward compatible with the currently running code, since you don't want a brief window where old code hits a new schema it doesn't understand, or vice versa."

---

## Interview question bank (with answer targets)

1. **Merge vs rebase - when do you use each?** -> rebase own unpublished feature branch for a clean linear history; merge (or just don't rebase) shared/published branches to avoid rewriting others' history.
2. **Revert vs reset?** -> revert creates a new undo commit, safe for shared history; reset rewrites the branch pointer/history, only safe locally/unpublished.
3. **What is cherry-pick used for?** -> applying one specific commit from one branch onto another, e.g. porting a hotfix from a release branch to main.
4. **What does `.gitlab-ci.yml` define, and what's the relationship between stages and jobs?** -> the pipeline; stages define ordering, jobs within a stage run in parallel.
5. **What is a GitLab Runner, and why did you need a specific one for iOS builds?** -> the agent that executes CI jobs; iOS builds require macOS + Xcode, so you need a macOS-capable runner, tagged and routed specifically for those jobs.
6. **How do you keep secrets out of a CI pipeline's committed config?** -> CI/CD variables configured in project settings, masked and scoped to protected branches, never hardcoded in .gitlab-ci.yml.
7. **What does Fastlane's `match` do, and why does it exist?** -> synchronizes iOS signing certificates/provisioning profiles across a team via an encrypted shared repo, avoiding "works on my machine" signing issues and manual certificate management.
8. **What's the difference between `gym`, `deliver`, and `pilot`?** -> gym builds/signs the binary; deliver uploads App Store metadata/binaries for release; pilot manages TestFlight beta distribution.
9. **Why build one artifact and promote it through environments instead of rebuilding per environment?** -> guarantees what was tested is exactly what's deployed; avoids environment-specific build drift.
10. **How would you structure a backend CI pipeline from scratch?** -> lint -> test -> build (Docker image tagged by commit SHA) -> deploy with manual gate for production, migrations handled carefully around the deploy boundary.

---

## Hands-on drills (do these)

- [ ] Explain merge vs rebase out loud with a concrete "when would you use this" example for each.
- [ ] Write a `.gitlab-ci.yml` from scratch with lint, test, and build stages, without looking at the example.
- [ ] Explain what `match` does and why it beats manually emailing around a .p12 certificate file.
- [ ] Describe your real GitLab Runner + Fastlane pipeline (Orient Logic / Online School) as a 90-second story: what problem it solved, what the pipeline stages were, and what outcome it produced (e.g. faster/safer release candidates).
- [ ] Explain, from memory, why `tags` matter for routing a CI job to the correct runner (specifically the macOS/Xcode requirement for iOS).

---

## Senior red flags / green flags

### Green flags
- Knowing when NOT to rebase (shared/pushed branches) as clearly as when to rebase.
- Explaining revert vs reset precisely, including the shared-history safety distinction.
- Describing Fastlane lanes and specific actions (gym/match/pilot/supply) rather than "Fastlane just builds the app."
- Explaining why iOS CI needs a macOS runner specifically, showing real infrastructure awareness.
- Talking about artifact promotion (build once, deploy everywhere) rather than rebuilding per environment.

### Red flags
- Treating merge and rebase as interchangeable with no opinion on when to use which.
- Using `git reset --hard` + force-push on a shared branch as a casual habit.
- Not knowing what a CI "stage" vs "job" is.
- Claiming Fastlane/CI experience with no ability to name a single actual action or concept beyond "it automates builds."

---

## Tie-backs to your experience

- Orient Logic and the Online School app: you "built Android and iOS CI/CD pipelines with GitLab Runner and Fastlane, automating build and signing processes for release candidates" - this is your primary, most concrete, most interview-ready story for this entire chapter.
- These pipelines existed alongside real production stakes: crash rate reduction work (Online School: ~28% to 0.15%) means release velocity and pipeline reliability weren't just nice-to-haves, they directly supported your ability to ship fixes quickly and safely.
- General Git/PR discipline is implicit across every project on your CV (Softgen, EasyPay, Orient Logic, freelance) - you don't need a special story for this, just fluent, confident everyday practice.

---

## Mastery checklist

- [ ] I can explain merge vs rebase and revert vs reset with correct safety reasoning.
- [ ] I can write a basic multi-stage `.gitlab-ci.yml` from memory.
- [ ] I can name and explain at least 4 specific Fastlane actions (gym, match, pilot, supply, deliver, gradle).
- [ ] I can explain why iOS CI needs a macOS runner and how GitLab routes jobs to specific runners.
- [ ] I can tell the GitLab Runner + Fastlane pipeline story fluently in under 2 minutes.
