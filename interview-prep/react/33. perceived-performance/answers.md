# Perceived Performance — Answers

## Core recall

1. How fast the product *feels* to users, not only stopwatch/render cost.  
2. Skeletons/optimistic UI, progressive rendering, avoiding layout shift, instant interaction feedback.  
3. Skeleton mirrors layout structure; spinner is a generic wait indicator.  
4. Update UI assuming mutation success, then confirm/rollback with the server.  
5. Show available pieces as soon as ready instead of blocking on everything.  
6. How much the visible page jumps as content loads (Cumulative Layout Shift).  
7. Synchronous UI response to a click (disable, spinner, pending label) before the network finishes.  
8. LCP, CLS, TTI (as in the canned answer).

## Explain why

1. Structure appears immediately → less uncertainty; often less layout jump.  
2. Browser reserves space → image paint doesn’t shove neighbors (better CLS).  
3. App acknowledges the click instantly; prevents double submit; feels alive.  
4. Users care about feedback/stability/progressive paint; those can dominate experience.  
5. Network fails — without rollback you show false state.  
6. Profiler = React work; CWV = load/interaction experience users (and SEO) feel.

## Compare and contrast

1. **Perceived:** feedback, stability, progressive paint. **Raw:** CPU/bytes/RTT reduced.  
2. **Skeleton:** placeholder while **reading**. **Optimistic:** pretend **write** succeeded.  
3. **Progressive:** paint partial readiness. **Wait-all:** one late paint.  
4. **Click feedback:** mutation/network pending. **`isPending`:** expensive **render** catching up.  
5. **CLS:** stability. **LCP:** when large content appears — related but different fixes.

## Predict / choose

1. **Optimistic toggle** (with rollback).  
2. **Skeleton** matching cards.  
3. **CLS** (layout shift).  
4. Double submits + feels broken/unresponsive.

## Debugging

1. Don’t gate entire page on all queries; section skeletons + parallel fetch; show partial data.  
2. Reserve ad/slot size; avoid injecting above content without space.  
3. Rollback + error toast; revalidate.  
4. Images/fonts/dynamic inserts without reserved space — Layout Shift diagnostics in Lighthouse/Performance.

## Application

1. `if (isLoading) return <FeedSkeleton />; return <Feed data={data} />;`  
2. Update local cart → `await api` → on error restore previous cart + message.  
3. Paraphrase preserved interview answer.  
4. width/height or aspect-ratio on images; skeleton min-heights; don’t inject banners without reserved region.

## Interview questions

1. **Spoken:** Not always — feel-fast techniques can dominate UX without faster compute; track LCP/CLS/TTI plus render profiles. Example: skeleton + instant button pending with same API latency.  
2. **Spoken:** Skeletons for contentful layouts; small spinners for local actions/buttons.  
3. **Spoken:** Apply optimistic update → send request → rollback/onError + sync cache; avoid for irreversible high-stakes flows without care.  
4. **Spoken:** CLS is how much the page jumps while loading — frustrating and measured as a quality signal; reserve space so things don’t shove.

## Connections

1. Parallel + sectional UI enables progressive paint; mount-gated waterfalls delay first content.  
2. Show cached data immediately while refetching — feels instant on repeat visits.  
3. Same “acknowledge wait without freezing urgency” idea for render lag.  
4. Matching-size skeletons occupy space early → less jump when real content arrives.
