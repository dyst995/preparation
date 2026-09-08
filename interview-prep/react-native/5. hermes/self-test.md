# Hermes — Self-test

## Core recall

1. What is Hermes, in one or two sentences (without saying New Architecture)?
2. What does “compiles to bytecode” mean for a **release** build, vs parsing JS source on device?
3. What is TTI here — bundle download, or something else?
4. Name two reasons teams use Hermes besides “it’s the default.”
5. Hermes vs Metro — who does what?
6. Hermes vs JSC — what kind of difference is that (engine vs renderer)?
7. After enabling or upgrading Hermes, which metrics do you check?
8. Is Hermes usually optional trivia or the default engine on modern RN?

## Explain why

1. Why does AOT bytecode tend to help **cold start** more than mid-session list FPS?
2. Why must you verify a **release** binary, not only a Gradle/Pod flag?
3. Why can Hermes GC still make the app “freeze” for a moment?
4. Why is “Hermes makes everything faster” a weak senior answer?
5. Why might debugger workflow change when leaving JSC for Hermes?
6. Why is Hermes **not** the answer to Bridge congestion?

## Compare and contrast

1. Hermes vs JSC
2. Hermes vs Metro
3. Hermes vs New Architecture (JSI/Fabric)
4. Dev/debug JS execution vs release Hermes bytecode
5. Parse/compile cost vs React render cost on the JS thread
6. “Better memory” vs fixing a leak

## Predict the output

1. You enable Hermes in config but the release pipeline still ships a plain JS bundle the engine must parse. What TTI win might you **fail** to get? Explain.

2. Debug build TTI looks worse than a competitor’s store listing. Is that proof Hermes is “slow”? Explain.

3. Stakeholder: enable Hermes to fix FlatList jank (unvirtualized `ScrollView` + `.map`). What happens to jank? Explain.

4. After a Hermes upgrade, Safari-style iOS debugging the team used on JSC no longer matches. What’s the expected class of issue?

## Debugging

1. “Just enable Hermes, it’ll fix our performance problems.” How do you respond on the call?

2. Crash-free on debug, crash on TestFlight after Hermes. Where do you look first (Hermes-shaped)?

3. TTI improved after Hermes; a screen still hitching on JSON.parse of a huge payload. What did Hermes not replace?

4. Memory graphs still climb after Hermes. Engineer says Hermes should have fixed memory. What’s the misconception?

## Application

1. Write the pipeline: source → ? → Hermes, labeling bytecode vs runtime.

2. List the four metric buckets from the curriculum follow-up.

3. Write two sentences you’d put in an ADR: “Why Hermes.”

4. Give one sentence that keeps Hermes as a good default **and** refuses it as a magic perf fix.

## Interview questions

1. What is Hermes and why do teams use it?  
   **Follow-ups:** Metrics after enable/upgrade? Is it New Architecture?

2. How does Hermes improve TTI?

3. You’re told to enable Hermes to fix FPS. How do you respond?

4. How do you confirm Hermes bytecode is actually in the release app?

5. What would you still test that isn’t “speed”?

## Connections

1. How does Hermes sit on the JS thread model from the threads unit?
2. How is Metro the producer and Hermes the consumer of the bundle?
3. Why can you discuss Hermes without enabling Fabric?
4. Which startup TTI buckets does bytecode **not** cover (providers, network, first render)?
5. How do Hermes GC pauses show up in the same symptom table as “JS blocked”?
