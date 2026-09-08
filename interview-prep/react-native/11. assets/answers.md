# Images, fonts, assets, icons, splash — Answers

## Core recall

1. **Local:** `require(...)`. **Remote:** `{ uri: 'https://...' }`.
2. Not a valid `source` shape — need `require` or `{ uri }`.
3. **`cover`**, **`contain`**, **`stretch`**, **`center`**.
4. Native still **decodes the full bitmap** (memory/CPU) before drawing small.
5. **Silent fallback** to a system font — looks “fine,” wrong typeface.
6. **Native** (xcassets, mipmap, LaunchScreen / Android splash).
7. **Reserve space** (`width`/`height` or `aspectRatio`) + placeholder; don’t grow after load.
8. **No.** Those are in the **binary** / store listing assets.

## Explain why

1. URIs are **runtime network**; Metro never saw the bytes at bundle time.
2. **Decode allocates full size**; layout `40` is just the **view box**.
3. The font must be in the **native app** resources; JS `fontFamily` only **names** it.
4. Launch pixels paint **before JS**. React runs **after** Hermes/bridge.
5. So Yoga already has a box; load doesn’t **relayout** the screen.
6. If URLs are **4000px**, a cache library still **decodes** them. **Resize at CDN** first.

## Compare and contrast

1. **Bundled, offline** vs **downloaded, needs size/cache**.
2. **Fill+crop** vs **fit all+letterbox**.
3. Metro density pick vs **you** requesting the right URL.
4. Cache avoids **re-fetch**; not **re-decode of huge pixels** as a strategy.
5. `fontFamily` string vs **file actually in the IPA/APK**.
6. After JS vs **first native frames**.

## Predict the output

1. **0 height / jump** when the bitmap arrives — no reserved layout.
2. **Letterboxed** (whole image visible). `cover` would crop.
3. **System font** (silent fallback).
4. **Not** the real splash/icon. Only post-JS UI. Need a **store** build for native splash/icon.

## Debugging

1. **Thumbnail URLs**, cache, **FlatList** windowing — not full-res in every cell.
2. **Xcode LaunchScreen / Android splash theme & mipmap**, not `App.tsx`.
3. **Linked?** **Rebuild native?** **Exact iOS font name** vs filename.
4. **Intrinsic size after load** — set dimensions/`aspectRatio` up front.

## Application

1. `<Image source={require('./logo.png')} />` and `<Image source={{ uri }} style={{ width: 40, height: 40 }} resizeMode="cover" />`
2. cover = fill crop; contain = whole image; stretch = distort; center = centered, limited scale.
3. `react-native.config.js` `assets: ['./fonts']` (or Expo font plugin).
4. Icon/splash are **native project**; JS cannot replace the launch image via OTA.

## Interview questions

1. **Spoken:** `require` vs `uri`; right-sized images; resizeMode cover/contain/stretch/center; fonts linked or silent fallback; icon/splash are native.  
   **Follow-ups:** those four modes. Native catalog/storyboard. Reserve layout.

2. **Spoken:** oversized downloads/decodes, cache, virtualization — MyCreditInfo-shaped OOM on image-heavy Android lists.

3. **Spoken:** fixed size or aspect-ratio box before load; placeholder.

4. **Spoken:** font lives in the **binary**; Fast Refresh doesn’t run `pod install` / Gradle asset copy.

5. **Spoken:** Metro packs **JS-required** images; icons/splash/mipmap are **native resources** in the Xcode/Android project.

## Connections

1. `require` is Metro’s asset pipeline.
2. Unwindowed + huge bitmaps = **OOM**; windowing still needs **small** decodes.
3. `@2x/@3x` match **device scale**; `PixelRatio` is the same density story.
4. Decode/memory on **native/UI**; JS may look idle.
5. **Store release** required for icon/splash; OTA is JS-only.
