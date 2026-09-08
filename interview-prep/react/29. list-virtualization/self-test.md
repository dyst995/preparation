# List Virtualization — Self-test

## Core recall

1. What problem does list virtualization solve?
2. What is a “window” in this context?
3. What is overscan?
4. Why does each row receive a `style` prop in `react-window`?
5. Name three web virtualization libraries and one-line differences.
6. Roughly when is virtualization worth it vs not?
7. Does virtualization mean the data array isn’t held in memory?
8. How does this relate to RN `FlatList`?

## Explain why

1. Why is mounting 10,000 `<li>`s expensive even if most are offscreen?
2. Why doesn’t `React.memo` on each row replace virtualization?
3. Why do variable-height rows make virtualization harder?
4. Why can find-in-page break under virtualization?
5. Why profile before virtualizing every table?
6. Why can local state inside a row “jump” to another item on scroll?

## Compare and contrast

1. Full `.map()` vs virtualized list  
2. `react-window` vs `react-virtualized` vs `@tanstack/react-virtual`  
3. Virtualization vs pagination / infinite scroll  
4. Virtualization vs memoizing list rows  
5. Web windowing vs RN `FlatList` / `FlashList`  

## Predict / choose

1. 25 static settings rows — virtualize?  
2. 8,000 log lines, simple text, scrollable panel — lean?  
3. Profiler: list mount 400ms, 2,000 row components — first structural fix?  
4. Product grid 50 cards with images, already paginated 50/page — need windowing?

## Debugging

1. Virtual list shows overlapping rows; `itemSize={40}` but rows are ~72px tall. Cause?  
2. Row component omits spreading/applying `style`. Symptom?  
3. Controlled input in a row loses typed text when user scrolls away and back. Likely cause?  
4. After adding `react-window`, scroll is jumpy with dynamic content heights. Direction?

## Application

1. Sketch `FixedSizeList` usage for `items` with row height 56 and viewport 400.  
2. Explain overscan to an interviewer in two sentences.  
3. Spoken: when virtualize + tradeoff.  
4. List two a11y/UX caveats you’d mention in a design review.

## Interview questions

1. When would you virtualize a list, and what's the tradeoff?  
   - Follow-up: Which library would you pick and why?  
   - Follow-up: How is this like FlatList?
2. How does windowing work at a high level?  
3. Virtualization vs just paginating the API — same thing?  
4. What breaks or gets harder when you virtualize?

## Connections

1. How does the Profiler guide the virtualization decision?
2. How do memo/useCallback still matter *inside* a virtualized list?
3. How does “re-render vs DOM” clarify what virtualization optimizes?
4. How do infinite React Query pages + virtualization compose?
