# 06. Image optimization

> Source: `interview-prep/react-native/06-performance.md`

### Topics to learn
- [ ] Serving correctly-sized images (don't ship 4000px images for 40px avatars)
- [ ] `resizeMode` semantics: `cover`, `contain`, `stretch`, `center`, `repeat`
- [ ] Native image caching behavior (memory + disk cache) and cache-busting pitfalls
- [ ] `react-native-fast-image` (or platform-native caching equivalents) awareness for aggressive caching/priority control
- [ ] Placeholder/blur-up strategies to avoid layout pop
- [ ] Avoiding image decode cost on the JS/UI thread for large lists
- [ ] Memory pressure from many large images decoded simultaneously (common Android OOM source)

### Practical points

- Request appropriately sized images from the backend/CDN (e.g. thumbnail endpoints) rather than downscaling huge images client-side � client-side downscale still pays the full decode/memory cost first.
- Reserve layout space (fixed dimensions or aspect-ratio boxes) before the image loads to avoid content jumping.
- In a list, ensure each row's image is a small, cached thumbnail � this was a real contributor to memory-related crashes in legacy apps like MyCreditInfo before optimization.
- Prefer PNG/WebP appropriately (WebP is generally smaller for photographic content on Android; iOS support has matured too) � know the format tradeoff exists even if the answer is "it depends on the asset pipeline."

### Interview question

**Q: A screen with a long list of user avatars/thumbnails is causing memory warnings/crashes on Android. What do you check?**

**Strong answer:**
> "First, image size � are we downloading full-resolution images and letting the device decode and hold them at full size in memory just to display a 40x40 avatar? I'd request appropriately sized thumbnails from the backend or CDN. Second, caching � are duplicate requests re-decoding the same image, or is there a proper memory+disk cache? Third, list virtualization � confirm images are only decoded for currently-rendered rows, not the entire dataset. This combination � oversized images plus no virtualization � was exactly the pattern behind crash-rate issues I fixed at MyCreditInfo, where Crashlytics showed OOM-adjacent native crashes concentrated on image-heavy screens on lower-end Android devices."

---
