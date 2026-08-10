# 07. Core Web Vitals and general performance framing

> Source: `interview-prep/nextjs/04-performance-deployment.md`

### Topics to learn

- [ ] LCP (Largest Contentful Paint) - how fast the main content renders; `next/image` `priority`, reducing server response time, minimizing render-blocking resources all help
- [ ] CLS (Cumulative Layout Shift) - avoided by reserving space for images/fonts/ads (this is exactly what `next/image` and `next/font` are built to prevent)
- [ ] INP (Interaction to Next Paint, replaced FID) - responsiveness to user input; keeping the main thread free, minimizing large client bundles/hydration cost, avoiding long synchronous work in event handlers
- [ ] TTFB (Time to First Byte) - server/rendering speed; caching strategy (chapter 02) is the biggest lever here
- [ ] `next build` output tells you per-route whether it's static (○), dynamic (λ/ƒ depending on version), or SSG with revalidate - a quick sanity check after any rendering-strategy change

### Interview question

**Q: A page has a bad LCP score - what do you check, in order?**

> "First, what the LCP element actually is - often a hero image or a large text block. If it's an image, check it's using `next/image` with `priority` and correctly sized, not lazy-loaded. Then look at server response time - is this route static/ISR (fast, cached) or dynamic (paying full render cost per request)? Then check for render-blocking resources - large synchronous JS or CSS delaying paint. I'd use Lighthouse or the Vercel/browser performance panel to confirm which of these is actually the bottleneck before changing anything, rather than guessing."

---
