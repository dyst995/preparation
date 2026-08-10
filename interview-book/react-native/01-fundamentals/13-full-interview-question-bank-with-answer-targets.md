# 13. Full interview question bank (with answer targets)

> Source: `interview-prep/react-native/01-fundamentals.md`

### Rendering & architecture

1. **How does RN render UI vs React web?** ? host views, not DOM.
2. **What is the bridge?** ? async serialized JS?native channel; bottlenecks.
3. **What is JSI?** ? direct-ish JS?native interop layer.
4. **What is Fabric?** ? new renderer aligned with modern React.
5. **What are Turbo Modules?** ? modern native modules: lazy, typed, JSI-based.
6. **What is Codegen for?** ? generate typed native bindings from specs.

### Threads & engines

7. **JS vs UI thread responsibilities?**
8. **Symptoms of a blocked JS thread?**
9. **Why Hermes?**
10. **What does Metro do?**

### Practical app fundamentals

11. **When platform files vs `Platform.select`?**
12. **RN Flexbox vs web CSS key differences?**
13. **ScrollView vs FlatList?**
14. **Top FlatList optimizations?**
15. **How do you investigate re-render churn?**
16. **Dev vs production debugging approach?**

---
