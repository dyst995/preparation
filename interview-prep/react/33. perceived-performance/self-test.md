# Perceived Performance Beyond Raw Computation — Self-test

## Core recall

1. What is perceived performance?
2. Name four techniques from this section.
3. How does a skeleton differ from a centered spinner?
4. What is optimistic UI?
5. What is progressive rendering in one sentence?
6. What does CLS measure?
7. What is “instant feedback on interaction”?
8. Name three user-centric metrics from the interview answer.

## Explain why

1. Why can the same fetch duration feel faster with a skeleton?
2. Why reserve image dimensions before load?
3. Why disable a button before `await` completes?
4. Why isn’t faster raw computation always the right fix?
5. Why must optimistic UI include failure handling?
6. Why measure CWV alongside the React Profiler?

## Compare and contrast

1. Perceived vs raw/compute performance  
2. Skeleton vs optimistic UI  
3. Progressive rendering vs waiting for all queries  
4. Instant click feedback vs `useTransition` pending  
5. Fixing CLS vs reducing LCP  

## Predict / choose

1. Like button — skeleton or optimistic toggle?  
2. First load of a dashboard with known card layout — spinner-only or skeleton?  
3. Hero image without width/height — which CWV suffers?  
4. Save takes 800ms; button stays enabled until response — user risk?

## Debugging

1. Users say “page is slow” but API is 100ms; blank white until all three queries finish. Perception fix?  
2. Content jumps when ads load. Direction?  
3. Optimistic like count wrong after offline failure. Missing piece?  
4. Profiler clean; Lighthouse CLS poor. Where to look?

## Application

1. Sketch a `FeedSkeleton` usage while `useQuery` loads.  
2. Pseudocode optimistic add-to-cart with rollback.  
3. Spoken: is faster raw computation always the right fix?  
4. List three CLS mitigations for a media-heavy profile page.

## Interview questions

1. Is a faster raw computation always the right performance fix?  
   - Follow-up: Example where perception matters more.  
   - Follow-up: What metrics do you watch?
2. Skeleton vs spinner — when each?  
3. How do you implement optimistic UI safely?  
4. Explain CLS to a product manager in plain language.

## Connections

1. How does progressive rendering relate to avoiding request waterfalls?
2. How does RQ stale-while-revalidate support perceived speed?
3. How does `useTransition`’s `isPending` fit this section’s theme?
4. How do skeletons help both perception and CLS when sized well?
