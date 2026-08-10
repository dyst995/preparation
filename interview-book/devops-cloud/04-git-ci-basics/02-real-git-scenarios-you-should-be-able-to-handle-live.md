# 02. Real Git scenarios you should be able to handle live

> Source: `interview-prep/devops-cloud/04-git-ci-basics.md`

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
