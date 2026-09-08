# The old Bridge architecture — Self-test

## Core recall

1. What is the legacy React Native Bridge, in one or two sentences?
2. What are the three load-bearing properties: async, serialize, batch — what does each one mean?
3. Is the Bridge a native module? If not, what is it relative to Native Modules?
4. Why must data be serialized to cross JS ↔ native on the old architecture?
5. Name two patterns that make crossings expensive.
6. Why were true synchronous native reads painful on the Bridge?
7. What is “bridge congestion” in one sentence?
8. Where should high-frequency animations run relative to the Bridge?

## Explain why

1. Why did RN need a Bridge at all (instead of JS calling UIView directly)?
2. Why can batching both help and hurt?
3. Why is JS-driven animation (updating styles every frame from JS) a classic Bridge problem?
4. Why can a `ScrollView` still feel smooth while the screen “feels janky”?
5. Why is sending a file as base64 through a native module a bad Bridge pattern?
6. Why does “the Bridge is async” not mean “Native Modules are slow by definition”?

## Compare and contrast

1. Bridge (transport) vs legacy Native Module (endpoint)
2. Bridge congestion vs JS thread blocked
3. Native-driven animation vs JS-driven animation on the old architecture
4. Occasional native command vs per-frame / per-scroll-tick traffic
5. Legacy Bridge call vs JSI/Turbo Module call (high level — what tax you drop)
6. Serialization cost vs “the other side is far away” (interop feeling)

## Predict the output

1. JS calls `NativeModules.Foo.getId()` and on the next line reads a variable it expected the native side to have already set. What is wrong with that expectation? Explain.

2. A list uses native `ScrollView` and also `onScroll` → `setState` every event with a large object. Scroll physics vs JS UI — what do you expect to feel smooth vs hitchy? Explain.

3. You animate `marginTop` from JS on every `requestAnimationFrame` without a native driver. Which layer gets chatty, and why might frames drop?

4. Native module returns a 5MB base64 string to JS, JS sends it to another module. What costs did you just pay?

## Debugging

1. Engineer: “RN is slow.” Profiler shows native scroll FPS fine, JS doing work on every scroll event. What’s the diagnosis and first fix direction?

2. Taps feel dead, React not updating, but you blamed the Bridge. What other layer should you check first?

3. Animation stutters; they’re using `Animated` without `useNativeDriver` for a property that could be native-driven. What do you change and why?

4. Startup is slow; many unused native modules. How does the *legacy* module model contribute (and what New Architecture idea addresses it)?

## Application

1. Draw (in words) the five steps of a Bridge crossing, JS → native → JS.

2. List three ways to reduce Bridge traffic on a gesture-heavy screen.

3. Write one sentence you’d put in a code review when someone passes a whole image blob through JS to native.

4. In two sentences, explain to a junior why Turbo Modules exist *because of* the Bridge.

## Interview questions

1. What is the bridge, and what problems does it cause?  
   **Follow-ups:** Congestion example? Did animations belong on the JS thread?

2. Why serialize data across JS and native?

3. Why were synchronous native calls a problem on the old architecture?

4. How do you tell JS-thread blockage from bridge congestion?

5. If Fabric and Turbo Modules exist, why interview the Bridge at all?

## Connections

1. How does “commit updates native views” from the RN-vs-web unit force a Bridge (on the old architecture)?
2. How do threads (JS vs UI) change how you *name* a jank bug involving the Bridge?
3. What exact Bridge taxes do JSI and Turbo Modules aim to remove?
4. How would a hardware scanner/event stream (frequent native events) abuse the Bridge if naively forwarded to JS?
5. Does New Architecture mean you can forget this unit in a mixed production app?
