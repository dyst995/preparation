# 02. next/font - font optimization

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] `next/font/google` and `next/font/local` self-host fonts at build time - no runtime request to Google Fonts' CDN, which avoids a render-blocking third-party network request
- [ ] Automatic `font-display` handling and preloading to reduce layout shift from font swapping (a contributor to CLS)
- [ ] Subsetting support to ship only the character sets you need
- [ ] Using a font as a CSS variable (`variable: "--font-inter"`) to integrate with Tailwind/CSS without hardcoding font-family everywhere

### Interview question

**Q: Why is `next/font` better than a `<link>` to Google Fonts in `<head>`?**

> "A `<link>` to Google Fonts means the browser has to make an extra round trip to a third-party domain before it can render text in that font, which can block or delay text rendering and contribute to layout shift when the fallback font swaps to the real one. `next/font` downloads and self-hosts the font at build time, so it's served from the same origin, can be preloaded properly, and Next.js manages `font-display` behavior to minimize shift - all without me thinking about it beyond importing the font."

---
