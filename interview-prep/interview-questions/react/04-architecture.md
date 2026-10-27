# React Interview Questions — 04 Architecture (REACT-151–REACT-200)

React 18+. Scope: structure, boundaries, composition, state ownership, routing, error/loading architecture, data-layer facades. Fundamentals, hooks, and performance live in R01–R03.

---

### REACT-151 — Feature folders vs layer folders
**Difficulty:** Intermediate
**Category:** Project structure
**Question:** Should a React app be organized by technical layer (`components/`, `hooks/`, `services/`) or by feature (`checkout/`, `profile/`)? Why?
**Answer:** I prefer feature folders. Most changes touch one business area, like checkout, so I keep that feature's components, hooks, API calls, tests, and types together. That keeps changes local and makes ownership clear. With layer folders, one feature ends up scattered across many directories, and those folders turn into dumping grounds. I still keep a small shared folder for things that are truly cross-cutting, like the UI kit and utilities. For a small app, I'd start simple and switch once distinct domains appear.
**Trade-offs:** Feature folders risk duplication and cross-feature imports; layers make reuse obvious but hurt cohesion.
**Follow-up:** When would layers still make sense?

Answer: In a small app, or inside a shared package such as a set of UI primitives. In those cases there is no real business domain to organize around.

---

### REACT-152 — Colocation principle
**Difficulty:** Junior
**Category:** Project structure
**Question:** What does "colocate code with where it is used" mean in a React codebase?
**Answer:** It means keeping things that change together physically close. A component's styles, tests, helpers, and local hooks sit next to it, and state lives in the lowest component that needs it. I only move code to a shared location once a second real consumer appears. This makes navigation easier, and deleting a feature safe, because you remove one folder and nothing else breaks. It also stops me from building abstractions before I know what the pattern is.
**Follow-up:** What is the signal to move code out of a feature into shared?

Answer: A second, unrelated consumer needs the same behavior unchanged. Two things that merely look similar are not enough. I wait until the pattern is stable.

---

### REACT-153 — Dependency direction
**Difficulty:** Senior
**Category:** Module boundaries
**Question:** What dependency direction should a well-structured React app enforce between shared code, features, and the app shell?
**Answer:** Dependencies should flow one way: the app shell depends on features, and features depend on shared code like the UI kit, utilities, and API client. Shared code never imports from features, and features don't import each other's internals. The app shell wires up routes and providers. This prevents circular dependencies, keeps shared code reusable, and lets you move or delete a feature on its own. When features need each other, they go through a public interface, or a parent composes them.
**Follow-up:** How do you handle two features that genuinely need to talk?

Answer: Compose them in a parent, such as a page or route, using props, slots, or events. Or let one feature expose a narrow public interface. Either way, don't reach into its internals.

---

### REACT-154 — Public API per feature
**Difficulty:** Senior
**Category:** Module boundaries
**Question:** What is a feature's "public API" and how do you expose it?
**Answer:** It's the small set of things other parts of the app are allowed to use from a feature. Usually that's an `index.ts` file that exports the page component, a few components, and some types. Everything else stays private. The benefit is that you can refactor the inside freely, because other code only depends on that surface. I'd enforce it with lint rules or package boundaries, not just team convention, because conventions tend to erode over time.
**Code:** `export { CheckoutPage } from './CheckoutPage'; export type { Cart } from './types';`
**Follow-up:** Why is convention alone insufficient?

Answer: Under deadline pressure, people import internal files directly. A lint rule such as `no-restricted-imports`, or a boundaries plugin, turns the rule into a failing check.

---

### REACT-155 — Barrel file pitfalls
**Difficulty:** Intermediate
**Category:** Module boundaries
**Question:** What problems can `index.ts` barrel files cause in a large React app?
**Answer:** A barrel file re-exports many modules from one place, and that causes a few problems. It can stop bundlers from removing unused code when modules have side effects. It slows dev servers and tests, because importing one thing loads the whole tree. It can also create circular imports, since everything passes through one file. I use barrels sparingly, mainly as a feature's public entry point, and inside a feature I import files directly.
**Follow-up:** How do you detect circular dependencies?

Answer: Run a tool like `madge` or the ESLint `no-cycle` rule in CI. To fix a cycle, move the shared piece down into a lower layer.

---

### REACT-156 — Enforcing boundaries
**Difficulty:** Staff
**Category:** Module boundaries
**Question:** How would you enforce architectural boundaries in a growing React monorepo?
**Answer:** I'd automate it, because documentation alone doesn't hold. Split code into workspace packages that declare explicit exports. Add lint rules for allowed import directions, using something like `eslint-plugin-boundaries` or Nx module boundary tags. Add dependency-graph checks in CI, and set CODEOWNERS per feature. I'd keep the rules few and tied to the dependency direction we agreed on, because too many rules make teams look for workarounds. Any exception should be reviewed explicitly.
**Follow-up:** What is the cost of too many rules?

Answer: Friction. People start working around the rules or disabling the linter. Keep only the high-value rules, and make violations clear and easy to fix.

---

### REACT-157 — Container/presentational today
**Difficulty:** Intermediate
**Category:** Component patterns
**Question:** Is the container/presentational split still relevant with hooks?
**Answer:** The idea of separating concerns is still useful, but the rule of always using two files is not. With hooks, I can move data loading and behavior into a `useX` hook, so the component mostly just renders. Purely presentational components are still valuable for design-system pieces, Storybook, and easy testing with plain props. I don't create container wrappers out of habit. I split when the same view needs different data sources, or when it's hard to test.
**Follow-up:** What replaces the container?

Answer: Usually a custom hook, a page component that gathers data and passes it to views, or a server component that fetches the data.

---

### REACT-158 — Smart vs dumb at page level
**Difficulty:** Intermediate
**Category:** Component patterns
**Question:** Where should data fetching and orchestration live: in leaf components or at page/route level?
**Answer:** By default, I put orchestration at the page or route level, or in a feature-level hook, and pass data down. That keeps leaf components reusable and easy to test. Fetching inside a leaf is fine when the data is truly local and the data library avoids duplicate requests. What I avoid is scattering ad-hoc fetches around the tree, because that creates request waterfalls and inconsistent loading states.
**Trade-offs:** Page-level fetching risks prop drilling; leaf fetching risks waterfalls and hidden coupling.
**Follow-up:** How do you reduce drilling from the page?

Answer: Use composition with children or slots. Or use a feature-scoped context or a query cache, so deep components can read what they need directly.

---

### REACT-159 — Composition over configuration
**Difficulty:** Intermediate
**Category:** Composition
**Question:** Why prefer composition (children) over large prop-configured components?
**Answer:** A component with many options, like `showIcon`, `iconPosition`, and `headerRight`, gets a huge API that's hard to extend, because every new case needs a new prop. With composition, the consumer arranges the pieces themselves, so a new variant doesn't require changing the base component. The parent decides the structure, and the component keeps control of behavior and styling rules. That makes it flexible without becoming a pile of flags.
**Code:** `<Card><Card.Header>Title</Card.Header><Card.Body>…</Card.Body></Card>`
**Follow-up:** When is configuration better?

Answer: For small, closed sets of options, like size or tone, where the structure is fixed and consistency matters more than flexibility.

---

### REACT-160 — Slots via props
**Difficulty:** Intermediate
**Category:** Composition
**Question:** What is the slot pattern in React, and when do you use it over `children`?
**Answer:** The slot pattern means passing JSX through named props, like `header`, `footer`, or `sidebar`. The layout component decides where each one goes, but it doesn't need to know what's inside. I use it when a component has several distinct regions, since `children` only gives you one. It also keeps layouts generic. The caller builds each element with its own data, so the layout doesn't have to receive and forward that data.
**Code:** `<Layout sidebar={<Nav />} header={<Top user={u} />}>{page}</Layout>`
**Follow-up:** How does this reduce prop drilling?

Answer: The caller creates `<Nav user={u} />` itself, so `Layout` never receives or passes along `user`.

---

### REACT-161 — Inversion of control with render props
**Difficulty:** Senior
**Category:** Composition
**Question:** Are render props still useful now that hooks exist?
**Answer:** Less often, but yes. Hooks are great for sharing logic. A render prop, or a function passed as children, is useful when a component should own some behavior but let the caller decide what to render. Typical examples are virtualized lists, drag targets, or items that need measured layout. My rule is simple: if I only share logic, I use a hook. If the shared piece has to render or wrap elements, I consider a render prop.
**Follow-up:** What is the downside?

Answer: Deep nesting hurts readability. Also, an inline function is new on every render, which can defeat memoization if you don't handle it.

---

### REACT-162 — Compound components
**Difficulty:** Senior
**Category:** Component patterns
**Question:** What are compound components and what problem do they solve?
**Answer:** Compound components are a group of components that work together as one widget and share hidden state. `Tabs`, `Tabs.List`, and `Tabs.Panel` are a good example. The parent owns the state and shares it through context, and the children read from it. Consumers get flexible markup and ordering without passing props between the pieces. Meanwhile the parent can still guarantee accessibility and keyboard behavior, because it controls how the parts connect.
**Follow-up:** How do children get the shared state?

Answer: Through a context that the parent creates. `React.Children.map` with `cloneElement` can also work, but it breaks when children are wrapped, so context is the better choice.

---

### REACT-163 — Compound component pitfalls
**Difficulty:** Senior
**Category:** Component patterns
**Question:** What can go wrong when implementing compound components with context?
**Answer:** There are a few common problems. A subcomponent used outside its parent can fail with a confusing error, or silently misbehave. A context value that changes identity on every render causes extra re-renders. Coordinating ids, such as ARIA ids between a tab and its panel, is tricky. And typing `Parent.Child` in TypeScript needs care. I'd use a custom hook that throws a clear error, memoize the context value, and use `useId` for accessibility ids.
**Code:** `const ctx = useContext(TabsCtx); if (!ctx) throw new Error('Tab must be inside <Tabs>');`
**Follow-up:** Why `useId`?

Answer: It gives stable, unique ids that match between server and client. So labels, panels, and triggers can be linked without hydration mismatches.

---

### REACT-164 — Controlled vs uncontrolled ownership
**Difficulty:** Intermediate
**Category:** State ownership
**Question:** Explain controlled vs uncontrolled components as an ownership question.
**Answer:** It's about who owns the value. In a controlled component, the parent owns it. The parent passes `value` and `onChange`, and React state is the source of truth. In an uncontrolled component, the component or the DOM owns the value, and the parent reads it through a ref, a `defaultValue`, or on submit. I choose controlled when the parent needs to validate, derive, or sync the value. I choose uncontrolled for simple forms where only the final value matters.
**Follow-up:** Why is switching between them a bug?

Answer: If `value` goes from undefined to defined, or the other way, the component changes mode mid-life. React warns and state can be lost. Pick one mode for the component's lifetime.

---

### REACT-165 — Supporting both modes in a reusable component
**Difficulty:** Senior
**Category:** State ownership
**Question:** How do you build a reusable component (e.g. a toggle or select) that works controlled and uncontrolled?
**Answer:** The component accepts `value`, `defaultValue`, and `onChange`. If `value` is provided, the component uses it. If not, it keeps its own internal state, starting from `defaultValue`. In both cases it calls `onChange` whenever the user changes something. I'd put this logic in a small `useControllableState` hook so every component in the kit behaves the same way. The one rule is that a component shouldn't switch modes after it mounts.
**Code:** `const [v, setV] = useControllableState({ value, defaultValue, onChange });`
**Follow-up:** What does a design system gain from this?

Answer: Consumers can start with the simple uncontrolled version and move to controlled later, without API changes or wrapper components.

---

### REACT-166 — Lifting state up
**Difficulty:** Junior
**Category:** State ownership
**Question:** When should you lift state up, and how high?
**Answer:** I lift state when two or more sibling components need to read or change the same value. I move it to their closest common parent, and no higher. Going higher than necessary makes more components re-render and ties unrelated parts together. If lifting means passing props through many layers, I look at alternatives first, like composition, context, or a store, rather than just lifting it further.
**Follow-up:** What is the opposite move?

Answer: Pushing state down, which is colocation. If only one subtree uses the state, moving it there reduces re-renders and simplifies the parent.

---

### REACT-167 — State colocation
**Difficulty:** Intermediate
**Category:** State ownership
**Question:** Why is colocating state considered an architectural default?
**Answer:** When state lives close to the components that use it, its impact stays small. Fewer components re-render, the code is easier to reason about, and deleting a feature also deletes its state. Global state does the opposite: it creates hidden coupling and accidental dependencies. So I start with local state, lift it only when needed, and move it to context or a store only when many distant components truly share it.
**Follow-up:** How do you decide global vs local?

Answer: Ask who reads and writes it. If only one subtree uses it, keep it local. If unrelated parts of the app need it, or it must survive unmounting, promote it.

---

### REACT-168 — Prop drilling vs context
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** When is prop drilling acceptable and when should you reach for context?
**Answer:** Passing props through one to three layers is fine. It's explicit and easy to trace. I reach for context when many layers only forward the data, or when many descendants at different depths need it, like the theme, the current user, or the locale. Before using context, I try composition: passing elements down as children or slots. That often removes the drilling without the coupling and re-render costs that context brings.
**Follow-up:** What does context cost?

Answer: Components now depend on a provider being present, which makes them harder to test alone. Also, every consumer re-renders when the context value changes.

---

### REACT-169 — Real costs of prop drilling
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** What are the actual costs of deep prop drilling?
**Answer:** The main cost is maintenance, not performance. Middle components receive props they don't use, so a change touches many files. Types get noisy, renaming gets painful, and those components are hard to reuse because they demand props unrelated to their job. Re-rendering is rarely the real issue. Once drilling spans many layers, I'd use composition or a provider scoped to that part of the tree.
**Follow-up:** What is the cheapest fix before context?

Answer: Composition. Create the deep element at the top level and pass it down as `children` or a slot prop.

---

### REACT-170 — Context re-render design
**Difficulty:** Senior
**Category:** State sharing
**Question:** How do you structure context to avoid unnecessary re-renders?
**Answer:** The key fact is that every consumer re-renders when the provider's value changes. So I split contexts by how often they update, such as state versus dispatch, or theme versus user. I memoize the value object, keep providers as low in the tree as possible, and avoid putting fast-changing data in context. If the state is large and updates frequently, I'd use an external store with selectors instead.
**Code:** `<StateCtx.Provider value={state}><DispatchCtx.Provider value={dispatch}>…`
**Follow-up:** Why separate dispatch?

Answer: `dispatch` is stable and never changes. So components that only trigger actions won't re-render when the state changes.

---

### REACT-171 — Context vs external store
**Difficulty:** Senior
**Category:** State sharing
**Question:** When do you choose an external store (Redux, Zustand, etc.) over context?
**Answer:** I choose a store when state updates often, when many components read different parts of it, when it's needed outside React, or when I want devtools, middleware, or persistence. Stores let components subscribe to just the slice they use. Context fits low-frequency, app-wide values like theme, locale, or the signed-in user. I wouldn't adopt a store only to avoid prop drilling, and server data belongs in a server-state library, not in either.
**Trade-offs:** Stores add dependency and indirection; context is built in but lacks selective subscriptions.
**Follow-up:** What mechanism lets stores integrate safely with concurrent React?

Answer: `useSyncExternalStore`. It subscribes to the store and re-renders on change, and it guarantees that all components see a consistent value during a render.

---

### REACT-172 — useSyncExternalStore in architecture
**Difficulty:** Senior
**Category:** State sharing
**Question:** Where does `useSyncExternalStore` fit when designing shared state?
**Answer:** It's the hook for connecting React components to state that lives outside React, such as a store, or browser values like `matchMedia` and online status. It makes sure every component sees a consistent snapshot, even during concurrent rendering, and it supports a separate server snapshot for server rendering. Most apps use it indirectly through a state library. I'd use it directly for small browser-API hooks or a simple in-house store.
**Follow-up:** What must `getSnapshot` guarantee?

Answer: It must return the same value when the store hasn't changed. If it returns a new object each time, React keeps re-rendering in a loop.

---

### REACT-173 — Server state vs client state
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** Why separate server state from client UI state architecturally?
**Answer:** Server state is remote and asynchronous. It's shared with other users and can go out of date. So it needs caching, de-duplicated requests, retries, invalidation, and background refetching. UI state, like whether a modal is open, is local and instant. A server-state tool such as TanStack Query, SWR, RTK Query, or a framework loader handles all of that for you. Then the global store stays small and only holds real client concerns.
**Follow-up:** What is the common mistake?

Answer: Copying fetched data into local or global state. That creates two sources of truth that drift apart. Read from the cache directly and derive what you need.

---

### REACT-174 — Provider tree organization
**Difficulty:** Intermediate
**Category:** Provider architecture
**Question:** How do you keep a growing provider tree manageable?
**Answer:** I put the app-wide providers in one `AppProviders` component, in a deliberate order where dependencies come first. For example, the query client goes before any component that uses it. Providers that only one feature needs are scoped to that feature's route, so they mount and unmount with it and don't cause the whole app to re-render. If the nesting gets deep, I can use a helper that composes providers from a list, but only if it stays readable.
**Follow-up:** Why scope providers low?

Answer: It limits how much re-renders when the value changes, ties the state's lifetime to the feature, and keeps the root light for faster startup.

---

### REACT-175 — Dependency injection via context
**Difficulty:** Senior
**Category:** Provider architecture
**Question:** How can context be used for dependency injection, and why?
**Answer:** I can provide services, like an API client, analytics, feature flags, or a clock, through context. Components then depend on an interface instead of importing a concrete module. In tests and Storybook, I wrap the component in a different provider that supplies fakes. Different environments can swap implementations the same way. It's more explicit than mocking modules, and it keeps components independent of infrastructure details.
**Follow-up:** What is the risk?

Answer: Overuse hides what a component really depends on and adds provider boilerplate. I'd use it for real infrastructure boundaries, not for every small utility.

---

### REACT-176 — Safe context hooks
**Difficulty:** Intermediate
**Category:** Provider architecture
**Question:** How should you design the consumer hook for a context so misuse fails fast?
**Answer:** I create the context with no meaningful default and keep it private. Then I export a `useX()` hook that reads the context and throws a clear error if the provider is missing. This way, forgetting the provider gives a helpful message right away, instead of a confusing "undefined" crash somewhere else. It also gives me one place to add types or derived values.
**Code:** `export function useAuth(){ const c=useContext(AuthCtx); if(!c) throw new Error('Wrap in <AuthProvider>'); return c; }`
**Follow-up:** When is a default value appropriate?

Answer: When the context has a sensible behavior without a provider, such as a default theme. Then components work on their own.

---

### REACT-177 — Designing a shared UI kit
**Difficulty:** Senior
**Category:** Shared UI
**Question:** What principles guide a shared component library used across teams?
**Answer:** The library should know nothing about the business: no business logic, API calls, or feature imports. It should offer accessible primitives, consistent design tokens, composable APIs, forwarded refs, and a way to pass custom `className` or styles. I'd document it, for example in Storybook, test accessibility, and treat API changes as breaking changes. A small, well-built core is better than a large catalog that nobody trusts.
**Follow-up:** What belongs in the app instead?

Answer: Domain-specific components like `OrderSummary`. They combine UI-kit primitives with business logic and live inside their feature.

---

### REACT-178 — Headless components
**Difficulty:** Senior
**Category:** Shared UI
**Question:** What are headless components and why are they architecturally attractive?
**Answer:** Headless components give you behavior, state, and accessibility, such as keyboard handling, focus, and ARIA attributes, without any styling. They come as hooks or unstyled components, for example Radix, React Aria, or Headless UI. Teams apply their own design but reuse interaction logic that's hard to get right. This separates concerns cleanly: behavior is shared and stable, while the look and feel can change per product or theme.
**Follow-up:** What is the cost?

Answer: Consumers must provide the markup and styling, so setup takes more work than a styled kit. Design consistency then depends on a wrapper layer you build.

---

### REACT-179 — Theming and design tokens
**Difficulty:** Intermediate
**Category:** Shared UI
**Question:** How should theming be architected in a React UI kit?
**Answer:** I'd define design tokens, such as colors, spacing, and typography, as the single source of truth and expose them as CSS variables. A theme then changes by swapping variables on a root element, and React doesn't need to re-render everything. Context only carries things JavaScript needs, like which theme is selected. Components use tokens instead of raw values, which makes dark mode and brand variants cheap to add.
**Follow-up:** Why CSS variables over context for colors?

Answer: Changing a CSS variable updates styles in the browser without re-rendering React components. It also works with server rendering without a flash of the wrong theme.

---

### REACT-180 — Avoiding boolean-prop explosion
**Difficulty:** Senior
**Category:** Component API
**Question:** A `Button` has grown `isPrimary`, `isDanger`, `isGhost`, `isLarge`. How do you fix the API?
**Answer:** I'd replace the combinable booleans with fixed options like `variant` and `size`. Booleans allow invalid combinations, such as primary and danger at once. If the structure itself varies, I'd use composition, like `<Button><Button.Icon/>…`, or separate components for genuinely different behavior. Typing the options as union types makes impossible states impossible to write, and it documents the API at the same time.
**Code:** `variant: 'primary'|'danger'|'ghost'; size: 'sm'|'md'|'lg'`
**Follow-up:** What if variants multiply across props?

Answer: Use a variant helper such as `cva` to manage the combinations. For rare, clearly different cases, consider separate wrapper components.

---

### REACT-181 — Polymorphic `as` prop
**Difficulty:** Senior
**Category:** Component API
**Question:** What is a polymorphic component and what are the pitfalls?
**Answer:** A polymorphic component can render as different elements, using an `as` or `asChild` prop. For example, a `Button` can render as an `<a>` or as a router `Link`. That lets you reuse the same styling and behavior across semantic elements. The pitfalls are complex TypeScript types for props and refs, accessibility mistakes like a div pretending to be a button, and prop collisions. An `asChild` pattern avoids some of the typing pain.
**Follow-up:** Why does it matter for routing?

Answer: A button that navigates should render as the router's `Link`. That way navigation happens client-side, and the element is semantically a link.

---

### REACT-182 — Route as module boundary
**Difficulty:** Senior
**Category:** Routing
**Question:** How can routes act as architectural boundaries?
**Answer:** Each route maps to a page component owned by a feature. The route config works like the app's table of contents: it connects each URL to a page, layout, data loader, error screen, and lazy-loading point. Pages compose feature components, and features don't need to know their own URLs beyond using helpers. Keeping route definitions in one place makes navigation, permissions, and code-splitting points easy to find and change.
**Follow-up:** How do features link to each other without coupling?

Answer: Through typed route helpers or path constants from a routing module, instead of hard-coded strings scattered around the code.

---

### REACT-183 — Nested routes and layouts
**Difficulty:** Intermediate
**Category:** Routing
**Question:** What is the benefit of layout routes with nested routing?
**Answer:** A parent route renders the shared parts of the page, like navigation and a sidebar, plus an outlet where child routes appear. The layout stays mounted when you move between child routes, so its state is preserved and nothing remounts. It's also a natural place for error boundaries, loading states, and auth checks. The URL hierarchy matches the UI hierarchy, so it's clear which part owns what.
**Follow-up:** Where do you put an auth guard?

Answer: On a layout route that wraps the protected children. One check covers the whole subtree, and unauthenticated users are redirected once.

---

### REACT-184 — URL as state
**Difficulty:** Intermediate
**Category:** Routing
**Question:** What kind of state should live in the URL instead of component state?
**Answer:** State that people should be able to share, bookmark, or keep after a reload or back-button press. Examples are filters, sort order, pagination, the selected tab, an open item's id, and the search query. The URL becomes the source of truth, and components derive their view from it. Short-lived UI state, like hover or an open dropdown, stays local. I also parse and validate the search params at the boundary.
**Follow-up:** What is the downside?

Answer: Each change can add a history entry, and values must be parsed from strings. Debounce typing-driven updates, and use replace instead of push for minor changes.

---

### REACT-185 — Loaders vs component-level fetching
**Difficulty:** Senior
**Category:** Routing
**Question:** What is the architectural difference between fetching in route loaders and in components?
**Answer:** A route loader starts fetching as soon as navigation begins, in parallel with loading the page's code. That avoids a render-then-fetch waterfall, and the data requirements are declared next to the route. Fetching in components keeps data close to where it's used and is more flexible, but requests can chain down the tree. Many apps combine them: the loader prefetches into a query cache, and components read from the same cache.
**Follow-up:** What does a loader prefetch into a cache give you?

Answer: The page renders instantly when the cache is warm, requests are shared, and components can still use the same cache hooks for later updates.

---

### REACT-186 — Route-level code splitting
**Difficulty:** Intermediate
**Category:** Code splitting
**Question:** Why is the route the first place to code-split?
**Answer:** Routes are natural boundaries that users can see, so visitors only download the page they actually open. I lazy-load page components with `React.lazy`, or the router's lazy option, and show a Suspense fallback. This cuts the initial bundle size with very little complexity. If a chunk fails to load, the route's error boundary can handle it.
**Code:** `const Settings = lazy(() => import('./pages/Settings'));`
**Follow-up:** What can go wrong after a deploy?

Answer: Users with the old version open may request chunk files that no longer exist. Handle chunk-load errors in the error boundary, with a retry or a page reload.

---

### REACT-187 — Feature-level splitting
**Difficulty:** Senior
**Category:** Code splitting
**Question:** Beyond routes, when should you split code at the feature or component level?
**Answer:** I split heavy pieces that only show up sometimes, like rich text editors, charts, maps, modals, or admin-only tools. I load them when the user shows intent, such as opening a modal or selecting a tab, and wrap them in Suspense with a fallback of the same size. I don't split tiny components, because every chunk adds a request and can cause a loading flicker. I check a bundle analyzer first to see what's actually large.
**Follow-up:** How do you avoid the loading flash?

Answer: Preload on hover, focus, or when the browser is idle. Or make the fallback the same size as the content, so the page doesn't jump.

---

### REACT-188 — Preloading chunks and data
**Difficulty:** Senior
**Category:** Code splitting
**Question:** How do you make lazy-loaded routes feel instant?
**Answer:** I start loading the code and data before the user actually commits to navigating. Good triggers are hovering or focusing a link, a link entering the viewport, or the browser being idle. Many routers support prefetching on intent. I'd load the chunk and prefetch the data into the query cache together. I also stay careful with bandwidth: preload only likely next steps, and respect data-saver settings.
**Follow-up:** Does preloading change the architecture?

Answer: Yes. Routes need to declare their code and data needs somewhere that the router or links can trigger. That reinforces keeping route config in one place.

---

### REACT-189 — Error boundary placement
**Difficulty:** Senior
**Category:** Error handling
**Question:** Where should error boundaries be placed in an app?
**Answer:** I use layers. A root boundary is the last resort. Route-level boundaries stop one failing page from taking down the whole shell. Local boundaries around independent widgets, like a feed, chart, or third-party embed, let one failure degrade gracefully. The trade-off is blast radius versus noise: more boundaries mean smaller failures but more fallback UI. Each boundary should offer a way to recover, like retry or reset on navigation, and report the error to monitoring.
**Follow-up:** How does a boundary reset?

Answer: By changing its `key`, calling a reset callback, or using a `resetKeys` prop from `react-error-boundary` tied to route or data changes.

---

### REACT-190 — Error boundary limits
**Difficulty:** Intermediate
**Category:** Error handling
**Question:** What errors do error boundaries not catch?
**Answer:** Error boundaries only catch errors thrown while rendering. They don't catch errors in event handlers, asynchronous code like `setTimeout` or promises, server-side rendering errors, or errors thrown by the boundary itself. For event handlers and async code, I use try/catch and show the error through state or a toast. If I want an async error to reach a boundary, I can rethrow it during render by setting state with a function that throws.
**Code:** `setState(() => { throw err; });`
**Follow-up:** Why must boundaries be class components (or a library)?

Answer: Only class components can implement `getDerivedStateFromError` and `componentDidCatch`. There's no hook version, so most teams use `react-error-boundary`.

---

### REACT-191 — Suspense boundaries as architecture
**Difficulty:** Senior
**Category:** Suspense
**Question:** How do you decide where to put Suspense boundaries?
**Answer:** A Suspense boundary decides how detailed the loading experience is. I place one where a meaningful partial screen can show a placeholder: around the whole page for route-level loading, and around independent sections so fast content isn't held back by slow content. With too few boundaries you get full-page spinners, and with too many you get content popping in piece by piece. I nest them so inner ones refine outer ones, and keep fallbacks the same size as the content.
**Follow-up:** What happens with no boundary above a suspending component?

Answer: The nearest parent boundary handles it. If there is none, React throws an error. In client rendering, you need at least a root-level boundary.

---

### REACT-192 — Suspense with error boundaries and transitions
**Difficulty:** Senior
**Category:** Suspense
**Question:** How do Suspense, error boundaries, and transitions work together in navigation?
**Answer:** Each one handles a different situation. Suspense covers "not ready yet", error boundaries cover "something failed", and transitions keep the current screen visible while new content loads. If I wrap a navigation or state update in `startTransition`, React doesn't replace content that's already shown with a fallback. The old screen stays interactive until the new one is ready. I also pair each Suspense boundary with an error boundary, so failures show a recovery option.
**Follow-up:** How does the user see pending state during a transition?

Answer: `useTransition` returns `isPending`. You can use it to dim the content or show a subtle progress indicator.

---

### REACT-193 — Avoiding waterfalls architecturally
**Difficulty:** Senior
**Category:** Data loading
**Question:** How do nested components cause request waterfalls and how do you structure code to avoid them?
**Answer:** A waterfall happens when a parent fetches data, then renders a child that fetches its own data, so the second request only starts after the first one finishes. To avoid it, I move data requirements up to the route or loader, start independent requests in parallel, prefetch, or fetch on the server. Suspense doesn't remove waterfalls. It just makes them easier to write by accident, so the real fix is starting requests early.
**Follow-up:** When is a waterfall unavoidable?

Answer: When one request needs the result of another, like needing a user id before the next query. Then keep the number of steps low, or combine them in one backend endpoint.

---

### REACT-194 — Server/client component boundary
**Difficulty:** Senior
**Category:** Server Components
**Question:** At a high level, how do React Server Components change architecture?
**Answer:** By default, components run on the server. They can read data directly and send no JavaScript to the browser. Anything interactive goes into Client Components, marked with `"use client"`. So the architecture question becomes where to draw that boundary. I keep data access and static structure on the server, and push state, effects, event handlers, and browser APIs down into small client components. This needs a framework that supports Server Components.
**Follow-up:** What can't server components do?

Answer: They can't use state, effects, event handlers, or browser-only APIs. They also can't pass non-serializable props, such as functions, to client components.

---

### REACT-195 — Placing the "use client" boundary
**Difficulty:** Senior
**Category:** Server Components
**Question:** Where should the `"use client"` boundary go, and what does it affect?
**Answer:** As deep in the tree as practical, on the smallest component that needs interactivity. The directive marks a module boundary: that file and everything it imports becomes client code. If I put it on a whole page or layout, large parts of the tree get pulled into the browser bundle. So I extract the interactive part, like a button or form control, into its own client file, and keep the surrounding structure on the server.
**Follow-up:** Do children of a client component become client?

Answer: Only the ones it imports. Server components passed in as `children` are still rendered on the server.

---

### REACT-196 — Composing server into client
**Difficulty:** Staff
**Category:** Server Components
**Question:** How can a Client Component render Server Component content?
**Answer:** A Client Component can't import a Server Component. But a parent Server Component can pass one in as `children` or another prop. The Client Component then renders the already-prepared server output in that slot. This lets me wrap server-rendered content with client features, like modals, tabs, or context providers, without moving that content into the client bundle.
**Code:** `<ClientTabs><ServerPanel /></ClientTabs>`
**Follow-up:** How do client-only providers fit in a server layout?

Answer: Put them inside a small client component, such as `Providers`, that the server layout uses and that passes `children` through.

---

### REACT-197 — Extract a hook or a component?
**Difficulty:** Intermediate
**Category:** Refactoring
**Question:** When do you extract logic into a custom hook versus a new component?
**Answer:** I extract a hook to share stateful logic, or to separate behavior from rendering, without adding any UI. I extract a component when I need a reusable piece of UI, its own render and update scope, or state with its own lifecycle, such as per list item. If the logic exists only to serve one chunk of JSX, a component is often cleaner than a hook that returns many values.
**Follow-up:** What is a smell for a bad hook extraction?

Answer: A hook that returns a dozen values the component just passes along, or one that wraps a single `useState`. It adds indirection without real cohesion.

---

### REACT-198 — Custom hook design
**Difficulty:** Senior
**Category:** Refactoring
**Question:** What makes a custom hook a good architectural unit?
**Answer:** A good hook has one clear job, a small and stable return value, no hidden global dependencies, and a name that describes intent, like `useCheckoutForm` rather than `useStuff`. It should hide implementation details, such as which library or endpoint is used, behind domain terms. It takes parameters instead of reading hidden state, so it's easy to test with `renderHook`. I avoid hooks that bundle unrelated concerns.
**Follow-up:** Do hooks share state between components?

Answer: No. Each call creates its own state. To share state, you need context, a store, or a cache.

---

### REACT-199 — Facade API for the data layer
**Difficulty:** Senior
**Category:** Data layer
**Question:** What is a facade over the data layer, and why use one in a React app?
**Answer:** A facade is a thin module of hooks and functions named after the domain, like `useOrders` and `useCancelOrder`. Inside, they wrap the fetching library, HTTP client, and cache keys. Components use the facade and never touch `useQuery`, URLs, or response shapes directly. This puts query keys, data mapping, error handling, and cache invalidation in one place. It also means I can change the library or backend with changes in one place.
**Code:** `export const useOrders = (f) => useQuery({ queryKey: orderKeys.list(f), queryFn: () => api.orders.list(f) });`
**Follow-up:** What is the risk of a facade?

Answer: It can become bloated, or just mirror the library one-to-one without adding value. Keep it shaped around the domain, and add methods only when a feature needs them.

---

### REACT-200 — Modular monolith vs micro-frontends
**Difficulty:** Staff
**Category:** Architecture at scale
**Question:** When would you choose micro-frontends over a modular monolith for a React app?
**Answer:** My default is a modular monolith: one deployable app with enforced feature boundaries, shared tooling, and simple dependency management. I'd consider micro-frontends only for real organizational needs, like many autonomous teams that need independent release schedules, or a gradual migration away from a legacy app. They have real costs: duplicated dependencies, runtime integration, coordinating shared state and routing, keeping the design consistent, and harder end-to-end testing.
**Trade-offs:** Team autonomy and independent releases vs complexity, performance overhead, and UX inconsistency.
**Follow-up:** How do you limit the downsides if you adopt them?

Answer: Share a versioned design system, define narrow contracts between apps (events, URLs, props), share React as a single copy, and monitor duplicated bundle code.
