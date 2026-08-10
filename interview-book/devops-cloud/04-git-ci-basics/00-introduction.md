# Merge: preserves both histories, creates a merge commit — Introduction

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

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
