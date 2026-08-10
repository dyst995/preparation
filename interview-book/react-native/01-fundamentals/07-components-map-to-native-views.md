# 07. Components map to native views

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] `View`, `Text`, `Image`, `ScrollView`, `TextInput`, `Pressable`/`Touchable*`
- [ ] Why nesting `Text` matters
- [ ] Why not every web concept maps 1:1
- [ ] Native base components vs third-party composites

### Practical points

- `View` ? container native view
- `Text` must wrap strings; styling text often needs `Text` nodes
- `ScrollView` renders all children (bad for long lists)
- `FlatList` virtualizes
- Prefer `Pressable` in modern codebases for flexible press handling

---
