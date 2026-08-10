# 11. AppState and background execution limits

> Source: `interview-prep/react-native/08-push-firebase-device.md`

### Topics to learn
- [ ] `AppState` API: `active`, `background`, `inactive` (iOS transitional state)
- [ ] Listening to `AppState` changes for session-timeout timers, screenshot protection, and pausing/resuming polling
- [ ] Why mobile OSes aggressively limit background CPU/network time (battery life)
- [ ] iOS background modes: only specific declared modes (remote notifications, background fetch/processing, audio, etc.) get meaningful background time
- [ ] Android Doze mode / App Standby buckets throttling background work over time
- [ ] Why you can't rely on background timers ("wake me up in 10 minutes") without OS-level scheduling APIs

### Interview question

**Q: How would you implement a session timeout that logs the user out after 5 minutes in the background?**

> "I listen to `AppState` changes. When the app transitions to `background`, I record a timestamp. When it transitions back to `active`, I compare the current time against that timestamp � if it exceeds the timeout threshold, I force re-authentication (biometric or credentials) before showing any sensitive screen again, rather than relying on a background timer actually firing, since the OS can suspend JS execution in the background and a `setTimeout` isn't guaranteed to run on schedule."

**Follow-up:** Why not just use `setTimeout` while backgrounded?
> Because JS execution is typically suspended when the app backgrounds; timers don't reliably fire. Comparing wall-clock timestamps on resume is the standard, reliable pattern.

---
