# Platform-specific code

## What you need to know

React Native is **two (or more) hosts**. Some differences are **one style number**; some are **different screens or native APIs**. The senior move is **isolating** that at the **UI / native boundary**, not sprinkling `if (Platform.OS === 'ios')` through **business logic**.

| Approach | Use when |
| --- | --- |
| **`Platform.select`** | Small **style/value** differences |
| **`Platform.OS` conditionals** | Small **behavioral** branches in UI |
| **Separate platform files** | Different **structure**, native APIs, or **large** divergence |
| **Native module** | Capability **does not exist in JS** |

**Metro** is why `import './Button'` can load `Button.ios.tsx` ([Metro](../6.%20metro/notes.md)). This unit is **when** to use files vs `select` vs a module.

Curriculum this unit completes:

- `Platform.OS` / `Platform.select`
- `.ios` / `.android` / `.native` files
- Decision guide (preserve the table)
- Avoiding **platform soup**

---

## Runtime: `Platform.OS` and `Platform.select`

```ts
import { Platform } from 'react-native';

Platform.OS; // 'ios' | 'android' | 'web' | ...

const paddingTop = Platform.select({
  ios: 12,
  android: 8,
  default: 10,
});
```

**`select`:** pick a **value** (styles, a component, a number). Missing key → `default`.

**`Platform.OS === 'ios'`:** a **branch** (different handler, slightly different tree). Fine when the **file stays readable**. A 40-line nested `if` of OS checks is a **file split** candidate.

`Platform.Version` (iOS version / Android API level) is for **OS-version** quirks, not “are we on iPhone.” Don’t confuse with **screen size**.

---

## Compile-time: platform files

Metro resolves **one file per import** per platform:

```text
PaymentSheet.ios.tsx
PaymentSheet.android.tsx
PaymentSheet.tsx          // fallback
DatePicker.native.tsx    // iOS + Android, not web
```

**Both platforms’ unused files are not what `import './PaymentSheet'` means** — iOS gets the iOS module. That’s cleaner than shipping a 400-line component with `Platform.OS` wrapping half the JSX.

**When files win:**

- Different **tree** (Android uses a different navigator chrome, iOS a `Modal`)
- **Native UI** wrappers that don’t share JSX
- You want to **test** iOS sheet without Android `if`s

**When files lose:** two copies of the **same** 200-line form that differ by **4px padding** — use `select`.

---

## Platform soup (the actual senior test)

**Soup:** `Platform.OS` inside **domain**, API clients, money rounding, “if iOS then this endpoint.” That’s untestable and lies about the product.

**Isolate:**

```text
features/payments/
  model/          // no Platform
  ui/
    PaymentButton.tsx           // Platform.select for shadow
    ReceiptShare.ios.tsx        // share sheet
    ReceiptShare.android.tsx
  native/           // Turbo Module if JS cannot share
```

Architecture chapter (`02-architecture.md`) wants **UI vs domain vs native**. This unit is the **OS** slice of that rule.

---

## Native module vs JS `Platform`

If the capability **isn’t in JS** (biometrics hardware, DataWedge, a vendor SDK): **native module** (Turbo Module on New Arch) — not a bigger `Platform.OS` tree that pretends JS can do it.

`Platform.OS` cannot create an API. It only **branches** among things you already have.

---

## Common mistakes and misconceptions

- **`Platform.OS` in every other function.** Boundary, not seasoning.
- **Split files for padding.** Duplication debt.
- **One 800-line file** with both platforms fully inlined. Unreadable; untestable.
- **Assuming `.native` is iOS-only.** It’s **both native** platforms.
- **Forgetting Metro case sensitivity** (`Foo.IOS.tsx` on CI).
- **`Platform.OS` for tablet vs phone.** That’s **width / size class**, not OS.

---

## Connections to other concepts

`tiny difference → select; different tree → files (Metro); missing capability → native module; never → domain`

- **[Metro](../6.%20metro/notes.md):** **how** files resolve.
- **[Core components](../7.%20core-components/notes.md):** shadows/pressables often **select**; whole screens **files**.
- **[New Architecture](../3.%20new-architecture/notes.md):** new native work → Turbo Module, not `Platform.OS` fan-out.
- **Architecture:** keep **model** platform-free.
- **Yoga/styles (next):** many OS diffs are **StyleSheet.select**, not new components.

---

## Interview perspective

You should be able to:

1. Recite the **four-row decision table**.
2. Give a **padding vs share-sheet** example.
3. Say **no Platform in business logic**.
4. Tie **files** to **Metro**, **modules** to **missing JS APIs**.

Preserved spoken answer:

> I use `Platform.select` for small differences like padding or shadow styles. If the screen structure, native API usage, or logic diverges substantially, I split `.ios` / `.android` files so each platform stays readable and testable. I avoid scattering platform checks across business logic.

Add: “If JS can’t do it, that’s a native module, not a bigger `if (Platform.OS)`.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
