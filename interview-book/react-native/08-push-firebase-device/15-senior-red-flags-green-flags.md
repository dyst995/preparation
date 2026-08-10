# 15. Senior red flags / green flags

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Green flags interviewers love
- You clearly separate "FCM = transport" from "Notifee = presentation" instead of conflating them.
- You know the killed-state navigation race and how to fix it, not just the happy path.
- Your crash-rate stories include a *method* (triage loop, staged rollout), not just "we fixed some bugs."
- You justify Keychain/Keystore with the actual security reasoning, not just "AsyncStorage is bad."
- You distinguish Universal/App Links from custom schemes on security grounds, unprompted.

### Red flags
- "We just used AsyncStorage for the token, it was fine."
- Treating iOS push as "the same as Android, just simpler" (ignoring APNs, authorization states, capabilities).
- No answer for "what if the app is fully killed" beyond "it just works."
- Crash-rate story with no numbers, no method, no before/after.
- Believing a background `setTimeout` reliably fires for session timeouts.

---
