# Images, fonts, assets, icons, splash — Self-test

## Core recall

1. Local vs remote image — which API for each?
2. Why is `source="logo.png"` wrong?
3. Name four `resizeMode` values from the curriculum.
4. Why is a 4000px image in a 40px avatar a problem even if you set `width: 40`?
5. What happens if a custom `fontFamily` isn’t in the native binary?
6. Who owns app icon and launch splash — Metro or native project config?
7. How do you reduce **layout jump** when a remote image loads?
8. Can an OTA JS update change the store icon / true launch splash?

## Explain why

1. Why doesn’t Metro packing apply to `{ uri }` images?
2. Why can downscaling on the device still OOM?
3. Why do fonts need a **native rebuild** after you drop in a `.ttf`?
4. Why is a React “splash” screen not the same as iOS LaunchScreen?
5. Why specify `width`/`height` (or `aspectRatio`) before `onLoad`?
6. Why might FastImage be the wrong *first* answer for a heavy avatar list?

## Compare and contrast

1. `require('./a.png')` vs `{ uri }`
2. `cover` vs `contain`
3. `@2x` local assets vs CDN thumbnail URLs
4. Native `Image` cache vs “I don’t need thumbnails”
5. Font in JS `StyleSheet` vs font **file** linked natively
6. JS first-screen logo vs native splash

## Predict the output

1. `<Image source={{ uri }} />` with no style size. What often happens to layout? Explain.

2. `resizeMode="contain"` in a square box, wide photo. Cropped or letterboxed? Explain.

3. `fontFamily: 'MyFont'` but iOS font’s internal name is `MyFont-Regular` and you never linked. What do users see?

4. You change `App.tsx` splash `Image` and ship CodePush. Store icon and cold-launch splash — updated? Explain.

## Debugging

1. Android OOM on an avatar `FlatList`. Checklist (size, cache, virtualization).

2. Designer: splash color wrong. You only edited a React screen. Where do you look?

3. Font looks like system San Francisco; `styles` say custom. First three checks?

4. Image “flashes” then pushes the button down. What did you forget?

## Application

1. Write `Image` for a packed logo and a remote avatar 40×40 `cover`.

2. List `resizeMode`: cover, contain, stretch, center — one phrase each.

3. Where do you register fonts in a modern RN app (one line)?

4. One sentence: icon/splash vs JS.

## Interview questions

1. How do you handle images and assets in RN?  
   **Follow-ups:** resizeMode? Fonts? Splash not updating?

2. Avatar list OOMs on Android — what do you check?

3. How do you avoid layout jumps for images?

4. Why can’t Fast Refresh install a font?

5. What’s the difference between Metro assets and mipmap/xcassets?

## Connections

1. How does Metro `require` connect to this unit?
2. How do list cells make image size **non-optional**?
3. How do density / `@2x` relate to PixelRatio?
4. How do threads/memory show up as “image bugs”?
5. How does CI/OTA policy treat icons and splash?
