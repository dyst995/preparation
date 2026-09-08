# Metro bundler

## What you need to know

**Metro** is React Native’s **JavaScript bundler**. It **resolves** modules (including **platform extensions**), **transforms** JS/TS, **packs** a bundle, and in **dev** **serves** it with **Fast Refresh**. In **release**, the bundle is **embedded in the binary** (then often compiled to **[Hermes](../5.%20hermes/notes.md)** bytecode). Metro is **not** the JS engine and **not** the native compiler (Gradle/Xcode).

Curriculum this unit completes:

- Metro’s job vs Hermes vs native build
- Fast Refresh vs full reload
- `.ios` / `.android` / `.native` resolution
- Assets via `require`
- Dev serve vs release package
- Cache, monorepo, symlink failure modes

---

## What Metro actually does

Pipeline:

```text
import graph  →  resolve (platform + package.json)  →  transform (TS/JSX/babel)
        →  bundle
        →  DEV: HTTP to the app (Metro server)
        →  RELEASE: file inside APK/IPA  →  Hermes bytecode (typical)
```

**Resolve:** `import './Button'` can become `Button.ios.tsx` on iOS. Metro is why **platform files** work without a webpack alias per screen.

**Transform:** TypeScript/JSX → JS the engine can run; Babel presets RN expects.

**Bundle:** one (or a few) JS artifacts the runtime loads — not a folder of raw `src/` on the phone.

If Metro is **stuck/wrong**, symptoms are **redbox / unable to resolve / stale code / CI-only import errors** — not “UI thread jank.”

---

## Fast Refresh vs full reload

| | **Fast Refresh** | **Full reload** |
| --- | --- | --- |
| What | Re-run **changed modules**, try to **keep component state** | Restart the **JS runtime**, reload the bundle |
| When it shines | Edit a component body, styles | Change **native** code, some **module-scope** / context providers, Fast Refresh **bailed out** |
| You still need | — | `reload` after native rebuild, or when Fast Refresh warns it **fell back** |

Fast Refresh is **not** HMR for native `.m`/Kotlin. Change a native module → **rebuild native**, not only save a TS file.

If UI looks “possessed” (impossible state after many edits), **full reload** — don’t debug ghosts.

```js
// Module-scope singleton — Fast Refresh can preserve a stale instance
let cache = new Map();
export function getCache() {
  return cache;
}
```

Edits to this file often **don’t** reset `cache` until a full reload. That’s a **bundler/runtime** quirk, not React forgetting `useState`.

---

## Platform extensions

Metro’s resolver prefers a **platform-specific** file when you import a **bare** path:

```text
import './Button'
# iOS:    Button.ios.tsx  > Button.native.tsx  > Button.tsx
# Android: Button.android.tsx > Button.native.tsx > Button.tsx
```

(Exact cascade can include `.js` / `.ts` / `.tsx`; the **idea** is platform → native → default.)

`.native.js` = **both** iOS and Android, not web. Useful when **web** (`react-native-web`) needs a different `Button.web.tsx`.

This is **how** `Platform.OS` file splits work **without** runtime `if` in every import. Deep “when to split files” is the **next** fundamentals section; Metro is **why the import finds a file**.

```text
Button.ios.tsx      // iOS only
Button.android.tsx  // Android only
Button.tsx          // fallback
```

**CI gotcha:** `Button.IOS.tsx` vs `button.ios.tsx` — macOS often **case-insensitive**, Linux CI **not**. “Works on my Mac, Metro fail in CI” is often **case or symlink**.

---

## Assets

```js
<Image source={require('./logo.png')} />
```

Metro **packs** the image (and similar assets) and gives the runtime a **numeric asset id** / packager mapping — not a web `url('/logo.png')` from a static server (unless you use a remote URI).

Wrong: assuming **webpack `file-loader`** semantics. Right: **`require` local assets**; **URI** for remote.

---

## Dev bundle vs release bundle

| | **Dev** | **Release** |
| --- | --- | --- |
| How JS gets to the device | Metro **server** (or an unpackaged bundle) | **Inside** the app; minified; often **Hermes bytecode** |
| `__DEV__` | `true` | `false` |
| Fast Refresh | Yes | No |
| Perf | Extra checks — **do not** tune FPS here | The numbers that matter |

“Works talking to Metro, dies in TestFlight” is often **release config / minification / Hermes**, not “Metro forgot a file” — but **missing assets** or **wrong `main` entry** can still be packager/CI.

---

## Cache, monorepos, symlinks

**Stale cache:** Metro (and Watchman) served **yesterday’s graph**. First move: `--reset-cache`, clear Watchman, then look at real errors. Don’t rewrite architecture for a ghost import.

**Monorepos:** packages **outside** the default project root need **`watchFolders` / extra node module paths** in `metro.config.js`. Otherwise: **unable to resolve** a workspace package the app `import`s.

**Symlinks:** Metro historically **hates naive npm/yarn link**. Hoisting + `extraNodeModules` or a supported workspace setup. Symptom: resolves to an **empty** or **wrong** copy.

**One-command culture** (from fundamentals checklist): document `--reset-cache` so nobody loses half a day.

---

## Common mistakes and misconceptions

- **“Metro is Hermes.”** Bundler vs engine.
- **“Metro is Xcode/Gradle.”** Native compile is separate; Metro only **JS/assets**.
- **“Fast Refresh = full reload.”** State preservation vs JS runtime reset.
- **“Webpack config I copied from CRA.”** Different bundler; use **Metro config**.
- **“Platform files are a React Native runtime feature only.”** Resolution is **Metro**.
- **Ignoring Fast Refresh bailout warnings** and debugging stale singletons.

---

## Connections to other concepts

`source → Metro (resolve/transform/bundle) → Hermes → JS thread → React → native`

- **[Hermes](../5.%20hermes/notes.md):** Metro **emits**; Hermes **runs** (bytecode in release).
- **Platform-specific code** (next section): `Platform.select` vs **files Metro resolves**.
- **[Threads](../4.%20threads/notes.md):** Metro is **build/dev-server**, not a runtime thread.
- **CI/release** (`11-cicd-releases.md`): release packing + `__DEV__`.
- **RN vs web:** webpack/vite on web; **Metro** on RN (unless you added a web bundler).

---

## Interview perspective

You should be able to:

1. Define Metro in one breath: **resolve, transform, bundle, serve or package**.
2. Contrast **Fast Refresh** vs **reload**.
3. Explain **`.ios` / `.android` / `.native`**.
4. Contrast **dev server** vs **release artifact**.
5. Name **cache / monorepo / case / symlink** as first-line Metro incidents.

Preserved spoken answer:

> Metro is React Native’s bundler. It resolves modules, transforms JS/TS, handles platform-specific extensions, and serves or packages the bundle. In development it enables Fast Refresh; in production it creates the optimized bundle shipped inside the app.

Add if they follow up: “Hermes executes that bundle. Fast Refresh isn’t a native rebuild. If CI can’t resolve a file, I check platform extensions, case sensitivity, cache, and monorepo `watchFolders` before rewriting imports.”

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
