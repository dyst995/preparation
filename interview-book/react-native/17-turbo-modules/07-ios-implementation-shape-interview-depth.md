# 07. iOS implementation shape (interview depth)

> Source: `interview-prep/react-native/17-turbo-modules.md`

### Topics to learn
- [ ] Generated Obj-C protocols / C++ interop pieces (high level)
- [ ] Implement methods matching the spec
- [ ] Swift often needs an Obj-C++/bridging layer (reality check)
- [ ] RCT_EXPORT-style legacy knowledge still helps mentally, but Turbo path is spec-driven
- [ ] Main queue for UIKit

### Honest senior answer about Swift

> "On iOS, Turbo Module plumbing is often Obj-C++/generated protocol oriented. Swift can wrap platform APIs, but I plan for a bridging layer instead of pretending it's pure Swift all the way through."

---
