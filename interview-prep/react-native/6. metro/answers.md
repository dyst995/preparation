# Metro bundler — Answers

## Core recall

1. RN’s **JS bundler**: resolve, transform, pack; **serve** in dev, **embed** in release.
2. **Resolve:** which file. **Transform:** TS/JSX → JS. **Bundle:** one artifact. **Serve/package:** dev HTTP vs file in the binary.
3. **Fast Refresh:** rerun changed JS, **keep state** when it can. **Full reload:** new JS runtime, state gone.
4. iOS: `Button.ios.*` if present, else `.native`, else `Button`. Android: `.android` analogously.
5. **`.native`:** both native platforms. **`.ios`:** iOS only.
6. `require('./logo.png')` (or `import` that Metro handles as an asset).
7. **Dev:** Metro server (typically). **Release:** packaged (minified, often Hermes bytecode).
8. Any two: **stale cache**, **monorepo watchFolders**, **symlinks**, **case sensitivity**.

## Explain why

1. The engine runs a **bundle**, not a laptop folder. Transform + graph packing is required.
2. Fast Refresh **replaces modules** but may **keep** the old module instance’s **bindings**. The `Map` survives.
3. Fast Refresh is **JS**. Native code needs a **native rebuild**.
4. **Case-sensitive** FS in CI; Mac ignored `Foo` vs `foo`.
5. Metro/Watchman **cache** the graph; yesterday’s resolve is a common ghost. Cheap to rule out.
6. Jank is **runtime threads**. Metro already finished (or isn’t in the frame loop).

## Compare and contrast

1. **Metro:** produce JS. **Hermes:** execute (bytecode).
2. **Metro:** JS/assets. **Gradle/Xcode:** native binary, signing, compile Kotlin/Swift.
3. Keep state vs **reset JS**.
4. Live server + `__DEV__` vs **frozen** artifact in the app.
5. **Compile-time file pick** vs **runtime branch** (both valid; files keep platforms readable).
6. **Packed asset** vs **network** image; Metro doesn’t download the URI at bundle time.

## Predict the output

1. **`Button.ios.tsx`** (platform beats default). Default `Button.tsx` unused on iOS if `.ios` exists.
2. **Typically keep state** — that’s Fast Refresh’s point when it doesn’t bail out.
3. **Stale `id` / cache** until full reload — module scope not reset.
4. **Unable to resolve** `@repo/ui` (or similar) until `watchFolders` / extra node paths.

## Debugging

1. **Exact filename case**, git, Linux CI. Rename to match the import.
2. **Full reload** (then reproduce). Don’t theorize on Fast Refresh residue.
3. **Symlink / linker** Metro doesn’t follow like Node. Use workspaces / `extraNodeModules`, not naive `yarn link`.
4. **Prod isn’t supposed to Fast Refresh.** Release uses a **packaged** bundle. Different mode, not broken Metro.

## Application

1. TS → Metro resolve/transform/bundle → (release) Hermes bytecode → device JS engine.
2. `.ios` → `.native` → default `Button` (plus ts/tsx/js variants — state the **platform-first** idea).
3. `npx react-native start --reset-cache` (and Watchman) before a 2-hour debug.
4. When the app imports packages **outside** the default root (monorepo).

## Interview questions

1. **Spoken:** Metro is RN’s bundler: resolve, transform JS/TS, platform extensions, serve in dev (Fast Refresh) or package for production.  
   **Follow-ups:** Fast Refresh keeps state; reload resets JS. `.ios`/`.android` via resolver. Dev server vs embedded bundle.

2. **Spoken:** Resolver picks `*.ios` / `.android` / `.native` before the generic file when you import a folder-less path.

3. **Spoken:** Case, cache, `watchFolders`, symlinks. Reproduce the **CI** command; don’t trust macOS FS.

4. **Spoken:** Metro builds the bundle; Hermes runs it.

5. **Spoken:** `require` local files so Metro packs them; remote uses `{ uri }`.

## Connections

1. Metro **output** is Hermes **input**.
2. Platform **files** only work because Metro **resolves** them; `Platform.select` is runtime.
3. Metro debug: `__DEV__ === true`. Store: `false`, no Fast Refresh.
4. Bundler isn’t on the JS/UI **threads** at 60fps (after load).
5. “State” in a **singleton** isn’t React state — Fast Refresh can preserve the bug.
