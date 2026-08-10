# 13 - Security (Mobile) — Introduction

> Source: `interview-prep/react-native/13-security.md`

> Goal: Speak with fintech-grade rigor about mobile client security - secure storage, transport security, anti-tampering awareness, deep link validation, permissions, and native bridge risks - at a depth that matches having shipped real fintech and government-adjacent apps (Orient Logic) plus payment flows (Wizer, EasyPay, MyCreditInfo).

Mark progress with `[x]` as you master each topic.

---

## Learning objectives

By the end of this section you should be able to:

1. Justify Keychain/Keystore over AsyncStorage for anything sensitive, with mechanism-level detail.
2. Explain SSL/certificate pinning tradeoffs honestly, including its real-world limitations.
3. Discuss jailbreak/root detection as one layer of defense-in-depth, not a silver bullet.
4. Explain obfuscation's actual purpose and limits (raising cost, not achieving secrecy).
5. Implement and justify screenshot/screen-recording protection on sensitive screens.
6. Validate deep links so they can't be used to bypass auth or trigger unauthorized actions.
7. Apply least-privilege permission requests and explain the reasoning.
8. Explain why secrets should never ship inside the JS bundle, with a concrete mechanism.
9. Identify native bridge security risks (overly permissive exposed methods, unvalidated input crossing the JS/native boundary).
10. Answer fintech-focused security questions with concrete, defensible tradeoffs rather than absolutist claims.

---
