# 10. Measure first  the meta-skill interviewers actually grade

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] Never claim a fix "should" help without a before/after measurement
- [ ] Understanding that some "optimizations" (excess memoization, premature FlashList adoption, over-aggressive `shouldComponentUpdate`-style logic) can *regress* performance
- [ ] Communicating tradeoffs (memory vs CPU vs smoothness vs code complexity) rather than absolutes
- [ ] Knowing when "good enough" is the right answer � not every screen needs `getItemLayout` or Reanimated

### The answer structure senior interviewers want, every time

1. What was the reported/observed symptom?
2. How did you confirm which thread/subsystem was the bottleneck?
3. What tool did you use to pinpoint the exact cause?
4. What was the fix, and why that fix specifically (not a shotgun of unrelated changes)?
5. How did you confirm it actually worked, and did you guard against regression?

---
