# 07. New Architecture migration context

> Source: `interview-prep/react-native/15-bridge.md`

### Topics to learn
- [ ] JSI replaces many Bridge responsibilities for module calls
- [ ] Fabric replaces legacy renderer pipeline
- [ ] Turbo Modules replace legacy native module system
- [ ] Interop layers allow gradual migration
- [ ] Some libraries still Bridge-based during transition

### Interview framing

> "I don't treat Bridge knowledge as obsolete trivia. Most production apps still have legacy modules or interop paths. Understanding Bridge failure modes helps me decide when a Turbo Module or native-driven approach is justified - like hardware SDK integrations on Clean House or custom native libraries on Wizer."

---
