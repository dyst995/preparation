# 11. Secrets in CI

> Source: `interview-prep/react-native/11-cicd-releases.md`

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
