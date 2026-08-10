# 02. Local component state - useState/useReducer

> Source: `interview-prep/react/03-state-data-fetching.md`

Default choice. If a value is read and written by a single component (and children it explicitly passes callbacks/props to), it almost never needs anything more sophisticated.

**Signal you've outgrown local state:**
- Prop drilling more than 2-3 levels just to share one value.
- Multiple unrelated components need to read/write the same value without a natural parent-child relationship.
- The value needs to persist across route changes or component unmounts (local state is destroyed when the component unmounts).

---
