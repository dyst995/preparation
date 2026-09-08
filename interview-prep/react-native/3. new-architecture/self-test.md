# New Architecture: JSI, Fabric, Turbo Modules, Codegen — Self-test

## Core recall

1. Name the four New Architecture pieces and one-line role of each (JSI, Fabric, Turbo Modules, Codegen).
2. What does JSI let native code do that the legacy Bridge message queue did not?
3. Is Fabric a native module system? If not, what is it?
4. List three legacy taxes Turbo Modules are meant to reduce.
5. What does Codegen take as input, and what does it produce?
6. Why mention concurrent React when talking about Fabric (high level)?
7. What is the interop / dual-support idea during migration?
8. Is New Architecture “just faster”? What else is the point?

## Explain why

1. Why is “New Architecture is Fabric” a weak answer?
2. Why can JSI sync methods still be dangerous?
3. Why does lazy loading of Turbo Modules matter at startup?
4. Why is a shared Codegen spec better than handwritten Kotlin + JS signatures?
5. Why can a vendor SDK block enabling New Architecture even if your app code is ready?
6. Why does “we turned on New Arch” not automatically fix Bridge congestion from JS-driven animations?

## Compare and contrast

1. JSI vs the legacy Bridge MessageQueue
2. Turbo Modules vs legacy Native Modules
3. Fabric vs Turbo Modules
4. Codegen vs JSI
5. New Architecture vs Hermes
6. “Just faster” vs “better interop model”

## Predict the output

1. JS calls a Turbo Module method for the first time in a session. What extra cost might you pay *once*, and what cost do you avoid compared to eager Bridge modules? Explain.

2. A Turbo Module `sync getBattery(): number` does heavy I/O inside the native implementation. What happens to the JS thread until it returns? Explain.

3. You enable Fabric but a screen still uses `onScroll` → `setState` every tick with large objects. Does Fabric erase that problem by itself? Why or why not?

4. Codegen spec says `foo(): Promise<string>` but native returns a map. What class of bug is Codegen supposed to catch *if the spec is the source of truth*? What still goes wrong if native ignores the spec?

## Debugging

1. Interviewer: “So you use Fabric for native modules.” Correct the mix-up.

2. A payment SDK has no New Architecture support. A junior enables New Arch on main anyway. What do you flag?

3. TTI improved after Turbo Modules, but a gesture-heavy screen still hitches. Which New Arch piece was never the right tool for *that* symptom?

4. Native and JS disagree on a method’s argument type after a “quick Kotlin-only fix.” Which piece of the New Architecture was skipped?

## Application

1. Write the 1–2–3–4 spoken outline you’d use for “Explain New Architecture.”

2. In two sentences, when you prefer a new Turbo Module vs keeping a quiet legacy module.

3. Sketch a tiny Codegen-style spec with one sync and one Promise method (names only — show the idea).

4. Write one sentence that answers “is it just faster?” without sounding like you refused performance.

## Interview questions

1. Explain JSI, Fabric, and Turbo Modules simply.  
   **Follow-ups:** Where does Codegen fit? Is New Architecture just faster?

2. What problems do Turbo Modules solve that the Bridge caused?

3. When are sync Turbo Module methods justified vs dangerous?

4. How do you migrate a large app with vendor native SDKs?

5. You listed Turbo Modules on your CV — when did you actually need them?

## Connections

1. How do Bridge serialization and async-only design *motivate* JSI?
2. How does Fabric relate to render vs commit / concurrent React without being “React on the web”?
3. How does lazy Turbo Module init connect to eager Bridge module startup cost?
4. How do threads (JS vs UI) still matter after JSI exists?
5. Why is Bridge knowledge still required in a New Architecture interview?
