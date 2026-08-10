# 16 - Native Modules (Legacy Bridge Modules) — Introduction

> Source: `interview-prep/react-native/16-native-modules.md`

> Goal: Implement and explain classic React Native Native Modules on Android and iOS - registration, exported methods, promises/callbacks/events, threading, and packaging - at senior interview depth.

Your CV explicitly includes **Native Android Integrations** and **Native iOS Integrations**. This chapter is the legacy-module deep dive. For transport theory see [15-bridge.md](./15-bridge.md). For modern Turbo Modules see [17-turbo-modules.md](./17-turbo-modules.md). For product integrations (DataWedge, biometrics, patches) see [07-native-modules.md](./07-native-modules.md).

Mark progress with `[x]`.

---

## Learning objectives

1. Explain when to write a Native Module vs use a community library.
2. Describe Android and iOS legacy module anatomy.
3. Export methods with promises, callbacks, and events correctly.
4. Reason about threading (main/UI vs background) when calling native APIs.
5. Handle constants, enums, and argument types safely across the Bridge.
6. Package and register modules so JS can import them.
7. Debug native crashes and "method not found" / null argument issues.
8. Discuss maintenance cost and New Architecture migration pressure.

---
