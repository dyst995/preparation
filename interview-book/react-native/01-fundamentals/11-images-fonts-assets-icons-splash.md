# 11. Images, fonts, assets, icons, splash

> Source: `interview-prep/react-native/01-fundamentals.md`

### Topics to learn
- [ ] Local `require()` assets vs remote URLs
- [ ] Image size / resize modes
- [ ] Caching behavior (high level)
- [ ] Custom fonts linking / modern RN asset config
- [ ] App icon & splash screen responsibilities (platform configs)
- [ ] Avoiding layout jumps when images load

### Interview-ready points

- Ship correct resolutions where relevant; don�t download 4000px images into 40px avatars.
- Know `resizeMode`: `cover`, `contain`, `stretch`, `center`.
- Fonts must be registered properly or you get silent fallbacks.
- Splash/icon issues are often native project config, not JS.

---
