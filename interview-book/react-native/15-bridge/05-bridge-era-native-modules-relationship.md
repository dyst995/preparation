# 05. Bridge-era Native Modules (relationship)

> Source: `interview-prep/react-native/15-bridge.md`

The Bridge is the *transport*. Legacy Native Modules are the *API endpoints* on the native side.

Classic pattern:
- Android: `ReactContextBaseJavaModule` / package registration
- iOS: `RCTBridgeModule`
- Methods exported to JS
- Promises, callbacks, or event emitters for results

Deep dive for implementation details: [16-native-modules.md](./16-native-modules.md).

Deep dive for modern replacement: [17-turbo-modules.md](./17-turbo-modules.md).

Integrations overview (biometrics, DataWedge, patches): [07-native-modules.md](./07-native-modules.md).

---
