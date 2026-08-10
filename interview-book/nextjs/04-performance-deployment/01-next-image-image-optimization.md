# 01. next/image - image optimization

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] Automatic resizing, format conversion (WebP/AVIF where supported), and lazy loading by default
- [ ] `width`/`height` (or `fill`) required so the browser can reserve space and avoid layout shift (CLS)
- [ ] `priority` prop for above-the-fold images (e.g. hero image) to opt out of lazy loading and hint eager fetch
- [ ] Remote images require `images.remotePatterns` (or legacy `domains`) configured in `next.config.js` - a very common "why isn't my image showing" bug
- [ ] Image Optimization API runs per-request unless cached/CDN-fronted; on serverless/edge deployments this has cost and latency implications; can be disabled (`unoptimized: true`) if self-hosting without the optimizer, or if using a third-party image CDN already
- [ ] `sizes` prop for responsive images so the browser (and the optimizer) picks the right resolution per breakpoint

### Interview question

**Q: Why use `next/image` instead of a plain `<img>` tag?**

> "It automatically serves appropriately sized, modern-format images, lazy-loads offscreen images, and forces me to declare dimensions up front so the layout doesn't shift as images load - that directly helps Cumulative Layout Shift, one of the Core Web Vitals. On a content-heavy site like Travel2Georgia with lots of tour photography, that's a meaningful, measurable difference versus shipping full-resolution JPEGs and letting the browser scale them down client-side."

**Q: You added a remote image URL and it's not rendering - why?**

> "Almost certainly `next/image` needs the remote host allow-listed in `next.config.js` under `images.remotePatterns`, otherwise it blocks optimizing (and therefore serving) images from unknown domains for security reasons."

---
