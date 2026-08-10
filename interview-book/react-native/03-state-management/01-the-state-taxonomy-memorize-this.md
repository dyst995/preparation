# 01. The state taxonomy (memorize this)

> Source: `interview-prep/react-native/03-state-management.md`

| Kind of state | Examples | Preferred home |
|---|---|---|
| **Local UI** | modal open, tab index, input focus | `useState` / `useReducer` |
| **Server state** | balances, transactions, profile from API | React Query / RTK Query |
| **Global client state** | selected account, UI theme, onboarding flags | Zustand (or Redux if complex) |
| **Session/auth** | access token presence, user id | dedicated auth store + secure storage |
| **Form state** | large multi-step forms | form library or local reducer |
| **Navigation state** | current route, params | React Navigation |
| **Derived state** | filtered list from cached data | compute/select, don�t duplicate |

### Interview golden rule

> �The biggest state bug is putting the same data in two places and letting them drift.�

---
