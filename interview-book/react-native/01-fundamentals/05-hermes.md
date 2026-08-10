# 05. Hermes

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] What Hermes is (JS engine optimized for RN)
- [ ] Bytecode ahead-of-time compilation benefits
- [ ] TTI (time to interactive) improvements
- [ ] Memory characteristics
- [ ] Debugging differences vs JSC (high level)
- [ ] When Hermes might not be the topic � it�s usually default now

### Why teams use Hermes

- Faster startup via optimized bytecode
- Often better memory use on mobile
- Engine tuned for RN workloads
- Better alignment with modern RN defaults

### Interview answer

> �Hermes is a JavaScript engine optimized for React Native. It compiles to bytecode and is tuned for mobile startup and memory constraints. In practice it usually improves TTI and resource usage versus older engine setups, which matters for production apps with cold-start expectations.�

**Follow-up:** What metrics do you check after enabling/upgrading Hermes?
> Startup time, ANRs/crashes, memory, and any native debugger tooling changes.

---
