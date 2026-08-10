# 06. Types that cross the Bridge safely

> Source: `interview-prep/react-native/16-native-modules.md`

### Typically supported-ish values
- booleans, numbers, strings
- arrays / maps of those
- null / undefined mapped carefully (NSNull on iOS)

### Avoid / be careful
- functions (not as free-form JS functions over Bridge)
- class instances
- huge binary blobs (use file URIs)
- platform objects without conversion

### Senior practice
Define a tiny typed JS facade over `NativeModules.X` so the rest of the app never touches raw `NativeModules`. Validate inputs before crossing.

---
