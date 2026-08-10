# 04. GitLab CI concepts

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

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
