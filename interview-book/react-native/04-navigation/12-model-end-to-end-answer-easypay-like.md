# 12. Model end-to-end answer (EasyPay-like)

> Source: `interview-prep/react-native/04-navigation.md`

> �Root navigation waits for auth hydration. Auth stack handles login/biometrics. App uses tabs for Home/Wallet/Payments/Profile, each with a native stack. Transfer is a nested flow with amount ? review ? success; on success I reset so back doesn�t reopen the wizard. Deep links and notification payloads share a central router that validates IDs and auth before navigating. Tokens never travel in URLs.�

---
