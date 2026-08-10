# 09. Interview question bank

> Source: `interview-prep/react-native/15-bridge.md`

1. What is the React Native Bridge?
2. Why serialize data across JS and native?
3. What is batching and why does it exist?
4. Give an example of bridge congestion.
5. How do Bridge limitations show up in animations?
6. How do legacy Native Modules use the Bridge?
7. What problems do Turbo Modules solve that the Bridge caused?
8. How do you tell JS-thread blockage from bridge congestion?
9. Does New Architecture remove the need to understand the Bridge?
10. When would you still write a bridge-style integration today?

### Model answers (short)

**Congestion example:**
> "A screen listens to raw scroll events in JS and does heavy work each tick - serialization and JS execution compound, list feels fine at OS level but interactions hitch. Fix by reducing event frequency, moving work, or using native-driven gestures/animations."

**Why Turbo Modules:**
> "Lazy init, typed Codegen contracts, and JSI invocation reduce the serialize-everything async tax of classic Bridge modules - especially for modules not needed at startup."

---
