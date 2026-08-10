# 14. Senior red flags / green flags

> Source: `interview-prep/react-native/07-native-modules.md`

### Green flags interviewers love
- Clearly separates "I'd use an existing library" from "this genuinely needs custom native code," with real criteria
- Can explain Promise vs Event choice based on *who initiates* the communication, not just habit
- Knows permission model differences between platforms cold
- Has real, specific stories of native work (not vague "I touched some Kotlin once")
- Talks about upgrade risk and documentation discipline around patches, not just "I fixed it"

### Red flags
- Treating "Turbo Module" as a buzzword without explaining JSI/lazy-loading/Codegen underneath it
- Assuming permissions work identically on Android and iOS
- No mention of thread-safety/main-thread requirements for native UI work
- Patching a native dependency with no plan for what happens on the next upgrade
- Can't explain why a hardware-specific integration (like a dedicated barcode scanner) isn't just "a camera library problem"

---
