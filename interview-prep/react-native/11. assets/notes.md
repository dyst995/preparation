# Images, fonts, assets, icons, splash

## What you need to know

Assets split into **two worlds**:

| Kind | How it gets there | Who owns bugs |
| --- | --- | --- |
| **JS-bundled** | `require('./logo.png')` via **[Metro](../6.%20metro/notes.md)** | Packager / missing file / wrong path |
| **Remote** | `{ uri: 'https://...' }` | Network, CDN size, cache |
| **Fonts** | Linked into the **native** binary (`react-native.config.js` / Expo) | Silent **system fallback** if not registered |
| **Icon & splash** | **Xcode / Android** resources (and Android 12 splash API) | **Native project**, not a `View` in `App.tsx` |

Interview-ready (preserve): ship **right resolutions**; don’t put **4000px** in a **40px** avatar; know **`resizeMode`**; fonts **must be registered**; splash/icon issues are often **native config**.

This unit is **assets**. List windowing: [lists](../10.%20lists/notes.md). Image OOM deep-dive: [06-performance.md](../06-performance.md).

---

## Local `require` vs remote URI

```jsx
<Image source={require('./logo.png')} />
<Image source={{ uri: 'https://cdn.example.com/a.jpg' }} style={{ width: 40, height: 40 }} />
```

**`require`:** Metro **packs** the file (and `@2x` / `@3x` neighbors if named). Available **offline**, sized at **bundle** time. Not a web `src="/logo.png"` from a static server.

**`uri`:** downloaded at **runtime**. You must give **layout size** (or the view can be **0×0** until load). Cache is **native** (memory + disk, high level) — same URL may hit cache; **cache-bust** with a new URL/query.

**FastImage** (or similar): extra **priority / aggressive cache** when default `Image` isn’t enough. Don’t lead with a library if **CDN thumbnails** weren’t tried.

Bare `source="logo.png"` is **wrong**.

---

## Size, `resizeMode`, layout jumps

**Decode cost** happens **before** the 40×40 draw. Downscaling on device still **allocates the full bitmap** first. Prefer **thumbnail URLs** from the backend/CDN.

`resizeMode` (how the bitmap **fits the laid-out box**):

| Mode | Idea |
| --- | --- |
| **`cover`** | Fill the box, crop overflow (avatars often) |
| **`contain`** | Whole image visible, possible letterbox |
| **`stretch`** | Distort to fill |
| **`center`** | Center, no scale up the same way as cover |

(`repeat` exists; rare in interviews.)

**Layout jump:** image loads, then height appears, content **below jumps**. Fix: **fixed `width`/`height`** or **`aspectRatio`** **before** load; placeholder / `defaultSource` (platform-dependent). Don’t wait for `onLoad` to assign height if you can know the ratio.

`@2x` / `@3x` local files: Metro picks by **PixelRatio**. Remote: your **CDN** must still send the right byte size.

---

## Caching (high level)

Native `Image` typically has **memory + disk** cache for HTTP images. Pitfalls: **immutable URLs** that actually changed (CDN overwrite same path), or **no-cache** headers fighting you.

Lists: virtualization **unmounts** rows — combined with **oversized** bitmaps = Android **OOM**. Cache doesn’t make a 4000px decode **cheap**.

---

## Fonts

Custom fonts are **not** CSS `@font-face` in a stylesheet. They must be **in the native app**:

- Modern RN: `react-native.config.js` `assets: ['./src/assets/fonts']` then **pod/gradle** / autolink so names exist in the binary.
- Expo: `expo-font` / config plugin.
- **PostScript / file name** must match `fontFamily` (iOS is picky). Typo → **silent** default font (looks “fine” to a tired reviewer).

Rebuild **native** after adding fonts. Fast Refresh won’t install a `.ttf`.

---

## App icon and splash

**Not JS.** Changing `<Image>` in the first React screen is **not** the launch splash.

- **iOS:** Asset catalog icons; **LaunchScreen** storyboard / storyboard+color. First pixels are **native**.
- **Android:** `mipmap` densities; **Android 12+** splash API / theme. Adaptive icons.

**OTA / JS updates cannot** ship a new store icon or true launch splash. That’s a **store binary** ([11-cicd-releases.md](../11-cicd-releases.md)).

If splash “doesn’t match the designer,” open **Xcode / Android Studio**, not Metro.

---

## Common mistakes and misconceptions

- **4000px avatar.** Decode/memory, not just “a bit of bandwidth.”
- **No dimensions** on remote `Image` → jump or invisible.
- **Font “not working”** = fallback; check **native link + fontFamily string + rebuild**.
- **Fixing splash in React** only covers **after** JS is up.
- Treating **FastImage** as the first answer instead of **right-sized URLs**.
- Mixing **`require` path string** with `uri`.

---

## Connections to other concepts

`Metro packs require(); URI hits network/cache; fonts/icons/splash are native binary`

- **[Metro](../6.%20metro/notes.md):** `require` packing, `@2x`.
- **[Lists](../10.%20lists/notes.md):** thumbnails in cells.
- **[Threads](../4.%20threads/notes.md):** huge decode can hitch **UI**/memory.
- **[PixelRatio](../9.%20stylesheet-flexbox/notes.md):** density vs `@2x` assets.
- **CI/OTA:** icons/splash **not** hot-patched.

---

## Interview perspective

You should be able to:

1. `require` vs `uri`.
2. Recite **`cover` / `contain` / `stretch` / `center`**.
3. Explain **layout reservation** and **right-sized** images.
4. Fonts = **native registration** or silent fallback.
5. Icon/splash = **native project**.

Spoken:

> Local images go through Metro `require`; remote ones use `{ uri }` and must be sized for the box — I don’t download a 4000px file for a 40px avatar. `resizeMode` is cover/contain/stretch/center. Fonts have to be linked natively or you get a silent fallback. Icons and the real splash are Xcode/Android resources, not a React screen.

Add for Android list crashes: thumbnails + cache + virtualization (MyCreditInfo-shaped story).

---

Self-test: [self-test.md](./self-test.md). Answers: [answers.md](./answers.md). Next-day: [repetition.md](./repetition.md).
