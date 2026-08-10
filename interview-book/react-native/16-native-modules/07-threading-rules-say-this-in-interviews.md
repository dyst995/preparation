# 07. Threading rules (say this in interviews)

> Source: `interview-prep/react-native/16-native-modules.md`

### Android
- Bridge calls arrive on RN's native module threading model; UI work needs main/UI thread.
- Heavy I/O should be offloaded; resolve promise when done.
- Never assume `getCurrentActivity()` is non-null.

### iOS
- Explicitly choose method queue; UIKit on main.
- Long work: background queue, then resolve on appropriate thread.

### Interview question

**Q: Your native method updates UI and also writes a file. How do you structure it?**

> "Split responsibilities. Dispatch UI updates on the main thread. Do file I/O off the main thread. Resolve the promise after both succeed or with a clear partial-failure policy. I never block the UI thread on disk."

---
