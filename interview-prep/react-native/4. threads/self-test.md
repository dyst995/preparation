# Threads: JS, UI/main, native modules — Self-test

## Core recall

1. What typically runs on the JS thread vs the UI/main thread vs native module threads?
2. Does “native module” guarantee work is off the JS and UI threads?
3. Name four UX symptoms of a **blocked JS thread**.
4. Name three common **causes** of a blocked JS thread.
5. Can the OS process be alive while the app “feels frozen”? What is stuck?
6. Why can a native `ScrollView` still pan when JS is busy?
7. What still janks in that situation?
8. Where should high-frequency animations run if you want to spare JS?

## Explain why

1. Why doesn’t `async function` automatically keep the JS thread free during a CPU loop inside it?
2. Why do taps feel dead when JS is blocked even if pixels are on screen?
3. Why is “smooth scroll” a bad proof that performance is fine?
4. Why can UI-thread jank exist even when JS FPS looks OK?
5. Why can a **sync JSI** call feel exactly like “JS is blocked”?
6. Why is blaming the Bridge the wrong first sentence for a `JSON.parse` of 8MB on startup?

## Compare and contrast

1. JS thread blocked vs UI thread busy
2. JS thread blocked vs Bridge congestion
3. Native-driven scroll/animation vs JS `setState` every frame
4. Native module background thread vs JSI sync method
5. Android ANR (main thread) vs JS exception / JS stall
6. Single-threaded JS vs “RN is single-threaded” as a slogan

## Predict the output

1. You run `while (Date.now() < t) {}` for 3 seconds on a button press. Native `ScrollView` on screen. Taps on a JS `Pressable`? Scroll physics? Explain both.

2. `onScroll` fires every tick and `setState`s a large object. JS thread busy; UI thread mostly scrolling. What feels smooth vs hitchy? Explain.

3. A Turbo Module `sync decodeImage(path)` decodes a 20MB image on the calling thread (JS). What does the user feel until it returns?

4. A native module does disk I/O on a **background** thread then calls back into JS. During the I/O, is JS free to render? When might JS hitch anyway?

## Debugging

1. Engineer: “RN froze.” You can still fling the list. Taps do nothing. First hypothesis?

2. Scroll **itself** stutters (not just a JS overlay). Perf: JS FPS high, UI FPS low. Which thread?

3. They wrap everything in `React.memo` because startup parses a huge JSON on the JS thread. Why is that the wrong first fix?

4. Gesture animation uses `setState` for `translateY` every frame. What do you move, and to which thread?

## Application

1. Fill the three-column table (thread → typical work) in your own words.

2. List three changes you’d make so a heavy first screen doesn’t block JS (direction, not a full architecture).

3. Write two sentences explaining to a web engineer why RN has an extra “UI thread” story.

4. Give a one-line rule for `onScroll` listeners.

## Interview questions

1. What runs where? What if JS is blocked?  
   **Follow-ups:** Why can scroll still be smooth? How do you tell JS vs UI jank?

2. How do you keep gestures/animations from bottlenecking JS?

3. Does New Architecture / JSI mean we can ignore threads?

4. What’s the difference between Bridge congestion and a blocked JS thread?

5. How would you explain JS FPS vs UI FPS in one breath?

## Connections

1. How does “commit updates native views” require a UI thread separate from JS?
2. How does the Bridge/JSI boundary interact with these threads (who serializes, who draws)?
3. How do lists/virtualization protect the **JS** thread specifically?
4. How does a bad native module implementation smear work onto JS or UI?
5. How does this unit set up the performance chapter’s “measure which FPS dropped”?
