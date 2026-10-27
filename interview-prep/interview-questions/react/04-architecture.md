# React Interview Questions — 04 Architecture (REACT-151–REACT-200)

React 18+. Scope: structure, boundaries, composition, state ownership, routing, error/loading architecture, data-layer facades. Fundamentals, hooks, and performance live in R01–R03.

---

### REACT-151 — Feature folders vs layer folders
**Difficulty:** Intermediate
**Category:** Project structure
**Question:** Should a React app be organized by technical layer (`components/`, `hooks/`, `services/`) or by feature (`checkout/`, `profile/`)? Why?
**Answer:** Feature folders scale better. Changes usually touch one business capability, so colocating its components, hooks, API calls, tests, and types keeps diffs local and ownership clear. Layer folders scatter one feature across many directories and become dumping grounds. Keep a small shared layer for truly cross-cutting code (UI kit, utils). Start simple; introduce feature folders once the app has several distinct domains.
**Trade-offs:** Feature folders risk duplication and cross-feature imports; layers make reuse obvious but hurt cohesion.
**Follow-up:** When would layers still make sense?

Answer: In small apps or inside a shared package (e.g. only UI primitives), where there is no real domain boundary to organize around.

---

### REACT-152 — Colocation principle
**Difficulty:** Junior
**Category:** Project structure
**Question:** What does "colocate code with where it is used" mean in a React codebase?
**Answer:** Keep things that change together close together: a component's styles, tests, helpers, and local hooks sit next to it; state lives in the lowest component that needs it. Code is promoted to a shared location only when a second real consumer appears. This reduces navigation, makes deletion safe (remove the folder), and prevents premature abstraction.
**Follow-up:** What is the signal to move code out of a feature into shared?

Answer: A second, unrelated consumer that needs the same behavior unchanged. Two similar-looking uses are not enough; wait for the pattern to stabilize.

---

### REACT-153 — Dependency direction
**Difficulty:** Senior
**Category:** Module boundaries
**Question:** What dependency direction should a well-structured React app enforce between shared code, features, and the app shell?
**Answer:** Dependencies flow one way: app shell → features → shared (UI kit, utils, API client). Shared code never imports from features; features do not import from each other's internals; the app shell wires routes and providers. This prevents cycles, keeps shared code reusable, and lets features be moved or deleted independently. Cross-feature needs go through a public API or are composed at the app/route level.
**Follow-up:** How do you handle two features that genuinely need to talk?

Answer: Compose them in a parent (route or page) via props/slots/events, or expose a narrow public interface from one feature. Avoid reaching into its internals.

---

### REACT-154 — Public API per feature
**Difficulty:** Senior
**Category:** Module boundaries
**Question:** What is a feature's "public API" and how do you expose it?
**Answer:** It is the minimal set of exports other modules may use, typically a feature `index.ts` exporting the page/route component, a few components, and types. Everything else is private. This makes refactoring internals safe because consumers only depend on the surface. Enforce it with lint rules or package boundaries rather than convention alone.
**Code:** `export { CheckoutPage } from './CheckoutPage'; export type { Cart } from './types';`
**Follow-up:** Why is convention alone insufficient?

Answer: Under deadline pressure people deep-import internals. Lint rules (e.g. `no-restricted-imports`, boundaries plugin) turn the rule into a failing check.

---

### REACT-155 — Barrel file pitfalls
**Difficulty:** Intermediate
**Category:** Module boundaries
**Question:** What problems can `index.ts` barrel files cause in a large React app?
**Answer:** Barrels can defeat tree-shaking when modules have side effects, slow dev servers and tests by loading entire trees, and create circular imports because everything funnels through one file. They also blur boundaries when used at every folder level. Use barrels sparingly: at feature/package public-API level only, with `sideEffects: false` where valid, and import directly inside a feature.
**Follow-up:** How do you detect circular dependencies?

Answer: Use tooling like `madge` or `eslint-plugin-import` (`no-cycle`) in CI, and fix by extracting shared pieces to a lower layer.

---

### REACT-156 — Enforcing boundaries
**Difficulty:** Staff
**Category:** Module boundaries
**Question:** How would you enforce architectural boundaries in a growing React monorepo?
**Answer:** Automate it. Use workspace packages with explicit `exports`, lint rules for allowed import directions (e.g. `eslint-plugin-boundaries`, Nx module boundary tags), TypeScript project references, and CODEOWNERS per feature. Add dependency-graph checks in CI. Rules should be few and tied to the dependency direction, otherwise teams route around them. Review exceptions explicitly.
**Follow-up:** What is the cost of too many rules?

Answer: Friction pushes people to workarounds or disabling lint. Keep rules to the high-value invariants and make violations clear and fixable.

---

### REACT-157 — Container/presentational today
**Difficulty:** Intermediate
**Category:** Component patterns
**Question:** Is the container/presentational split still relevant with hooks?
**Answer:** The separation of concerns is still useful; the mandatory file split is not. Hooks let you extract data/behavior into `useX` and keep the component mostly rendering. Pure presentational components remain valuable for design-system pieces, Storybook, and testing with plain props. Don't create container wrappers by ritual; split when the view is reused with different data sources or hard to test.
**Follow-up:** What replaces the container?

Answer: Usually a custom hook, a route/page component that composes data and views, or a server component fetching data.

---

### REACT-158 — Smart vs dumb at page level
**Difficulty:** Intermediate
**Category:** Component patterns
**Question:** Where should data fetching and orchestration live: in leaf components or at page/route level?
**Answer:** Default to the page/route (or a feature-level hook) for orchestration and pass data down, keeping leaves reusable and cheap to test. Fetching in leaves is fine when the data is truly local and the data library dedupes requests. Avoid scattering ad-hoc fetches that cause waterfalls or inconsistent loading states.
**Trade-offs:** Page-level fetching risks prop drilling; leaf fetching risks waterfalls and hidden coupling.
**Follow-up:** How do you reduce drilling from the page?

Answer: Compose with children/slots, or use a feature-scoped context or query cache so deep components read what they need directly.

---

### REACT-159 — Composition over configuration
**Difficulty:** Intermediate
**Category:** Composition
**Question:** Why prefer composition (children) over large prop-configured components?
**Answer:** A component with many config props (`showIcon`, `iconPosition`, `headerRight`…) grows a combinatorial API that is hard to extend. Composition lets consumers arrange pieces themselves, so new variants need no changes to the base component. The parent controls structure; the component controls behavior and styling constraints.
**Code:** `<Card><Card.Header>Title</Card.Header><Card.Body>…</Card.Body></Card>`
**Follow-up:** When is configuration better?

Answer: For small, closed sets of options (size, tone) where structure is fixed and consistency matters more than flexibility.

---

### REACT-160 — Slots via props
**Difficulty:** Intermediate
**Category:** Composition
**Question:** What is the slot pattern in React, and when do you use it over `children`?
**Answer:** Pass JSX as named props (`header`, `footer`, `sidebar`) so a layout component places them without knowing their content. Use it when a component has multiple distinct regions. It keeps layout components generic and avoids the parent threading data through them, since the caller builds the elements with the data already.
**Code:** `<Layout sidebar={<Nav />} header={<Top user={u} />}>{page}</Layout>`
**Follow-up:** How does this reduce prop drilling?

Answer: The caller creates `<Nav user={u} />` directly, so `Layout` never receives or forwards `user`.

---

### REACT-161 — Inversion of control with render props
**Difficulty:** Senior
**Category:** Composition
**Question:** Are render props still useful now that hooks exist?
**Answer:** Less often, but yes. Hooks share logic; render props (or function-as-children) let a component hand control of rendering back to the caller while owning behavior tied to the tree, such as virtualized lists, drag targets, or items needing measured layout. Prefer a hook when only logic is shared; use render props when the shared piece must render or wrap elements.
**Follow-up:** What is the downside?

Answer: Nesting and readability suffer, and inline functions change identity each render, which can defeat memoization if not handled.

---

### REACT-162 — Compound components
**Difficulty:** Senior
**Category:** Component patterns
**Question:** What are compound components and what problem do they solve?
**Answer:** A set of components that share implicit state to form one cohesive widget, like `Tabs`, `Tabs.List`, `Tabs.Panel`. The parent owns state and exposes it via context; children read it. Consumers get flexible markup and ordering without passing props between pieces, while the parent preserves accessibility and keyboard behavior.
**Follow-up:** How do children get the shared state?

Answer: Through a context created by the parent. `React.Children.map` and `cloneElement` also work but break with wrappers, so context is preferred.

---

### REACT-163 — Compound component pitfalls
**Difficulty:** Senior
**Category:** Component patterns
**Question:** What can go wrong when implementing compound components with context?
**Answer:** Subcomponents used outside the parent throw confusing errors or silently misbehave; context value identity changes cause extra re-renders; ordering/ID coordination (e.g. ARIA ids) is tricky; and TypeScript typing of `Parent.Child` needs care. Guard with a custom hook that throws a clear message, memoize the context value, and use `useId` for accessibility ids.
**Code:** `const ctx = useContext(TabsCtx); if (!ctx) throw new Error('Tab must be inside <Tabs>');`
**Follow-up:** Why `useId`?

Answer: It gives stable, SSR-safe unique ids to link labels, panels, and triggers without hydration mismatches.

---

### REACT-164 — Controlled vs uncontrolled ownership
**Difficulty:** Intermediate
**Category:** State ownership
**Question:** Explain controlled vs uncontrolled components as an ownership question.
**Answer:** In a controlled component the parent owns the value and passes `value` plus `onChange`; React state is the source of truth. In an uncontrolled component the component or DOM owns it and the parent reads it via refs, `defaultValue`, or a submit event. Pick controlled when the parent must validate, derive, or sync the value; uncontrolled for simple forms where only the final value matters.
**Follow-up:** Why is switching between them a bug?

Answer: Changing `value` from undefined to defined (or back) switches modes mid-life, causing React warnings and lost state. Choose one for the component's lifetime.

---

### REACT-165 — Supporting both modes in a reusable component
**Difficulty:** Senior
**Category:** State ownership
**Question:** How do you build a reusable component (e.g. a toggle or select) that works controlled and uncontrolled?
**Answer:** Accept `value`, `defaultValue`, and `onChange`. If `value !== undefined`, use it; otherwise keep internal state initialized from `defaultValue`. Always call `onChange` on user intent. Extract this into a `useControllableState` hook so every component in the kit behaves consistently. Don't mix modes after mount.
**Code:** `const [v, setV] = useControllableState({ value, defaultValue, onChange });`
**Follow-up:** What does a design system gain from this?

Answer: Consumers can start uncontrolled for simplicity and go controlled later without API changes or wrappers.

---

### REACT-166 — Lifting state up
**Difficulty:** Junior
**Category:** State ownership
**Question:** When should you lift state up, and how high?
**Answer:** Lift when two or more siblings must read or change the same value. Move it to their closest common ancestor, not higher. Going higher than necessary widens re-render scope and couples unrelated parts. If lifting means threading props through many layers, consider composition, context, or a store instead.
**Follow-up:** What is the opposite move?

Answer: Pushing state down (colocation) when only one subtree uses it, which narrows re-renders and simplifies the parent.

---

### REACT-167 — State colocation
**Difficulty:** Intermediate
**Category:** State ownership
**Question:** Why is colocating state considered an architectural default?
**Answer:** State kept near its consumers has a small blast radius: fewer re-renders, easier reasoning, and deleting a feature removes its state. Global state invites hidden coupling and accidental dependencies. Start local, lift on demand, and promote to context/store only when many distant consumers genuinely share it.
**Follow-up:** How do you decide global vs local?

Answer: Ask who reads and writes it. If only one subtree, keep it local; if unrelated parts of the app need it, or it must survive unmount, promote it.

---

### REACT-168 — Prop drilling vs context
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** When is prop drilling acceptable and when should you reach for context?
**Answer:** Passing props through 1–3 layers is explicit and traceable, so it's fine. Reach for context when many layers merely forward data, or many descendants at different depths need it (theme, auth user, locale). First try composition (passing elements as children/slots), which often removes drilling without context's re-render and coupling costs.
**Follow-up:** What does context cost?

Answer: Components become implicitly dependent on a provider, are harder to test in isolation, and all consumers re-render when the value changes.

---

### REACT-169 — Real costs of prop drilling
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** What are the actual costs of deep prop drilling?
**Answer:** Intermediate components take props they don't use, so refactors touch many files; types get noisy; renaming is painful; and components become hard to reuse because they demand unrelated props. Re-render cost is rarely the issue. The main cost is coupling and maintenance, which is why composition or a scoped provider is preferable once drilling spans many layers.
**Follow-up:** What is the cheapest fix before context?

Answer: Component composition: build the deep element at the top and pass it down as `children` or a slot prop.

---

### REACT-170 — Context re-render design
**Difficulty:** Senior
**Category:** State sharing
**Question:** How do you structure context to avoid unnecessary re-renders?
**Answer:** Every consumer re-renders when the provider value changes. Split contexts by update frequency (state vs dispatch, or theme vs user), memoize the value object, keep providers low in the tree, and avoid putting fast-changing data in context. For large frequently updating state, use an external store with selectors instead.
**Code:** `<StateCtx.Provider value={state}><DispatchCtx.Provider value={dispatch}>…`
**Follow-up:** Why separate dispatch?

Answer: `dispatch` is stable, so components that only trigger actions won't re-render when state changes.

---

### REACT-171 — Context vs external store
**Difficulty:** Senior
**Category:** State sharing
**Question:** When do you choose an external store (Redux, Zustand, etc.) over context?
**Answer:** Choose a store when state is updated often, read by many components with different slices (selector-based subscriptions), needed outside React, or benefits from devtools, middleware, and persistence. Context fits low-frequency, app-wide configuration such as theme, locale, and auth. Don't adopt a store just to avoid drilling; server data belongs in a server-state library.
**Trade-offs:** Stores add dependency and indirection; context is built in but lacks selective subscriptions.
**Follow-up:** What mechanism lets stores integrate safely with concurrent React?

Answer: `useSyncExternalStore`, which gives tear-free reads by subscribing to the store and re-rendering on change.

---

### REACT-172 — useSyncExternalStore in architecture
**Difficulty:** Senior
**Category:** State sharing
**Question:** Where does `useSyncExternalStore` fit when designing shared state?
**Answer:** It is the primitive for subscribing React components to state that lives outside React (stores, browser APIs like `matchMedia` or online status). It guarantees consistent snapshots during concurrent rendering and supports a server snapshot for SSR. Most apps use it indirectly via libraries; custom code uses it for small browser-API hooks or in-house stores.
**Follow-up:** What must `getSnapshot` guarantee?

Answer: Return the same value when the store hasn't changed (referentially stable), otherwise React loops or re-renders endlessly.

---

### REACT-173 — Server state vs client state
**Difficulty:** Intermediate
**Category:** State sharing
**Question:** Why separate server state from client UI state architecturally?
**Answer:** Server state is remote, asynchronous, shared, and can go stale, needing caching, deduping, retries, invalidation, and background refetch. UI state is synchronous and local. Using a server-state tool (TanStack Query, SWR, RTK Query, or framework loaders) avoids hand-rolling this in a global store, which then shrinks to small client concerns.
**Follow-up:** What is the common mistake?

Answer: Copying fetched data into local or global state, creating two sources of truth that drift. Read from the cache directly and derive.

---

### REACT-174 — Provider tree organization
**Difficulty:** Intermediate
**Category:** Provider architecture
**Question:** How do you keep a growing provider tree manageable?
**Answer:** Put app-wide providers in one `AppProviders` component with a deliberate order (dependencies first, e.g. query client before components that use it). Scope feature providers to their route or feature subtree rather than the root so they mount and unmount with it and avoid re-rendering the world. Avoid a pyramid by composing providers in a list helper only if it stays readable.
**Follow-up:** Why scope providers low?

Answer: It limits re-render impact, ties state lifetime to the feature, and keeps the root lean for faster startup.

---

### REACT-175 — Dependency injection via context
**Difficulty:** Senior
**Category:** Provider architecture
**Question:** How can context be used for dependency injection, and why?
**Answer:** Provide services (API client, analytics, feature flags, clock) via context so components depend on an interface rather than a concrete import. Tests and Storybook supply fakes by wrapping with a different provider, and different environments can swap implementations. It's more explicit than module mocking and keeps components decoupled from infrastructure.
**Follow-up:** What is the risk?

Answer: Overuse hides dependencies and adds provider boilerplate. Reserve it for true infrastructure seams, not every utility.

---

### REACT-176 — Safe context hooks
**Difficulty:** Intermediate
**Category:** Provider architecture
**Question:** How should you design the consumer hook for a context so misuse fails fast?
**Answer:** Create the context with no meaningful default, export a `useX()` hook that reads it and throws a descriptive error if the provider is missing, and keep the raw context private. This gives a clear failure instead of `undefined` crashes elsewhere and a single place to add typing or derived values.
**Code:** `export function useAuth(){ const c=useContext(AuthCtx); if(!c) throw new Error('Wrap in <AuthProvider>'); return c; }`
**Follow-up:** When is a default value appropriate?

Answer: When the context has a sensible no-provider behavior, such as a default theme, so components work standalone.

---

### REACT-177 — Designing a shared UI kit
**Difficulty:** Senior
**Category:** Shared UI
**Question:** What principles guide a shared component library used across teams?
**Answer:** Keep it domain-agnostic: no business logic, API calls, or feature imports. Provide accessible primitives, consistent tokens, composable APIs, forwarded refs, and `className`/style escape hatches. Version and document it (Storybook), test accessibility, and treat API changes as breaking. Prefer a small, well-built core to a sprawling catalog that nobody trusts.
**Follow-up:** What belongs in the app instead?

Answer: Domain-specific components like `OrderSummary`; they compose UI-kit primitives with business logic and live in their feature.

---

### REACT-178 — Headless components
**Difficulty:** Senior
**Category:** Shared UI
**Question:** What are headless components and why are they architecturally attractive?
**Answer:** They provide behavior, state, and accessibility (keyboard, focus, ARIA) without styling, via hooks or unstyled components (Radix, React Aria, Headless UI). Teams apply their own design while reusing hard-to-get-right interaction logic. It separates concerns: behavior is shared and stable; look-and-feel is customizable per product or theme.
**Follow-up:** What is the cost?

Answer: Consumers must supply the styling and markup, so initial setup is more work than a styled kit, and design consistency depends on a wrapper layer.

---

### REACT-179 — Theming and design tokens
**Difficulty:** Intermediate
**Category:** Shared UI
**Question:** How should theming be architected in a React UI kit?
**Answer:** Define design tokens (color, spacing, type) as the single source and expose them via CSS variables, so themes swap by changing variables at a root element without React re-rendering everything. A context only carries theme choice or JS-needed values. Components consume tokens rather than raw values, enabling dark mode and brand variants cheaply.
**Follow-up:** Why CSS variables over context for colors?

Answer: Changing a CSS variable updates styles in the browser without re-rendering React components, and it works for SSR without flicker.

---

### REACT-180 — Avoiding boolean-prop explosion
**Difficulty:** Senior
**Category:** Component API
**Question:** A `Button` has grown `isPrimary`, `isDanger`, `isGhost`, `isLarge`. How do you fix the API?
**Answer:** Replace combinable booleans with constrained enums (`variant`, `size`), since booleans permit invalid combinations. If structure varies, move to composition (`<Button><Button.Icon/>…`) or separate components for genuinely different behaviors. Typing variants as union types makes impossible states unrepresentable and documents the API.
**Code:** `variant: 'primary'|'danger'|'ghost'; size: 'sm'|'md'|'lg'`
**Follow-up:** What if variants multiply across props?

Answer: Use a variant helper (e.g. `cva`) for combinations and consider explicit wrapper components for rarely used, distinct cases.

---

### REACT-181 — Polymorphic `as` prop
**Difficulty:** Senior
**Category:** Component API
**Question:** What is a polymorphic component and what are the pitfalls?
**Answer:** A component that renders different elements via an `as` (or `asChild`) prop, e.g. a `Button` rendered as `<a>` or a router `Link`. It keeps styling and behavior reusable across semantic elements. Pitfalls: complex TypeScript typing for props and refs, accessibility mistakes (a div acting as a button), and prop collisions. `asChild` slot patterns avoid some typing pain.
**Follow-up:** Why does it matter for routing?

Answer: Buttons that navigate should render as the router's `Link` so navigation is client-side and semantically a link.

---

### REACT-182 — Route as module boundary
**Difficulty:** Senior
**Category:** Routing
**Question:** How can routes act as architectural boundaries?
**Answer:** Each route maps to a page component owned by a feature. The route config is the app's table of contents: it wires URL → page, layouts, loaders, error elements, and lazy boundaries. Pages compose feature components; features don't know their URLs beyond helpers. Centralizing route definitions makes navigation, permissions, and splitting points easy to find and change.
**Follow-up:** How do features link to each other without coupling?

Answer: Through typed route helpers or path constants exported from a routing module, rather than hard-coded strings scattered everywhere.

---

### REACT-183 — Nested routes and layouts
**Difficulty:** Intermediate
**Category:** Routing
**Question:** What is the benefit of layout routes with nested routing?
**Answer:** A parent route renders shared chrome (nav, sidebar) plus an outlet where child routes render. Layouts persist across child navigation, preserving state and avoiding remount, and give natural places for error and loading boundaries and for auth gating. URL hierarchy mirrors UI hierarchy, so ownership is clear.
**Follow-up:** Where do you put an auth guard?

Answer: On a layout route wrapping protected children, so one check covers the subtree and unauthenticated users redirect once.

---

### REACT-184 — URL as state
**Difficulty:** Intermediate
**Category:** Routing
**Question:** What kind of state should live in the URL instead of component state?
**Answer:** State that should be shareable, bookmarkable, and survive reload or back/forward: filters, sort, pagination, selected tab, open item ID, search query. The URL becomes the source of truth and components derive from it. Keep ephemeral UI state (hover, open dropdown) local. Parse and validate search params at the boundary.
**Follow-up:** What is the downside?

Answer: Every change creates history entries and string parsing; debounce typing-driven updates and use replace instead of push for minor changes.

---

### REACT-185 — Loaders vs component-level fetching
**Difficulty:** Senior
**Category:** Routing
**Question:** What is the architectural difference between fetching in route loaders and in components?
**Answer:** Loaders start fetching when navigation begins, in parallel with code loading, avoiding render-then-fetch waterfalls and keeping data requirements declared next to the route. Component fetching is closer to usage and more flexible, but can chain requests down the tree. Many apps combine them: loaders prefetch into a query cache, components read from it.
**Follow-up:** What does a loader prefetch into a cache give you?

Answer: Instant render on navigation when warm, deduped requests, and components that still use the same cache hooks for updates.

---

### REACT-186 — Route-level code splitting
**Difficulty:** Intermediate
**Category:** Code splitting
**Question:** Why is the route the first place to code-split?
**Answer:** Routes are natural user-visible boundaries: users load only the page they visit. Lazy-load page components with `React.lazy` or the router's lazy API and show a Suspense fallback. It reduces initial bundle size with little complexity, and a failed chunk can be handled by the route's error boundary.
**Code:** `const Settings = lazy(() => import('./pages/Settings'));`
**Follow-up:** What can go wrong after a deploy?

Answer: Old clients request chunks that no longer exist. Handle chunk-load errors with a reload or retry in the error boundary.

---

### REACT-187 — Feature-level splitting
**Difficulty:** Senior
**Category:** Code splitting
**Question:** Beyond routes, when should you split code at the feature or component level?
**Answer:** For heavy, conditionally shown pieces: rich editors, charts, maps, modals, admin-only tools. Lazy-load behind user intent (open, tab selected) and wrap in Suspense with a stable-size fallback. Don't split tiny components; each chunk adds a request and potential loading flicker. Measure with a bundle analyzer first.
**Follow-up:** How do you avoid the loading flash?

Answer: Preload on hover/focus or idle time, or keep the fallback layout-stable so content doesn't jump.

---

### REACT-188 — Preloading chunks and data
**Difficulty:** Senior
**Category:** Code splitting
**Question:** How do you make lazy-loaded routes feel instant?
**Answer:** Trigger the dynamic import and data fetch before the user commits: on link hover/focus/viewport entry, or after idle. Many routers support prefetch on intent. Combine chunk preload with data prefetch into the query cache. Balance against bandwidth: preload only likely next steps, and respect data-saver settings.
**Follow-up:** Does preloading change the architecture?

Answer: It requires routes to declare their code and data needs in a place the router or links can trigger, reinforcing centralized route config.

---

### REACT-189 — Error boundary placement
**Difficulty:** Senior
**Category:** Error handling
**Question:** Where should error boundaries be placed in an app?
**Answer:** Layered: a root boundary as a last resort, route-level boundaries so a failing page doesn't take down the shell, and local boundaries around independent widgets (feed, chart, third-party embed) so one failure degrades gracefully. Granularity trades blast radius against noise. Each boundary should offer a recovery action (retry, reset on navigation) and report to monitoring.
**Follow-up:** How does a boundary reset?

Answer: Via a `key` change, a reset callback, or a `resetKeys` prop (react-error-boundary) tied to route or data changes.

---

### REACT-190 — Error boundary limits
**Difficulty:** Intermediate
**Category:** Error handling
**Question:** What errors do error boundaries not catch?
**Answer:** They don't catch errors in event handlers, asynchronous code (setTimeout, promises outside render), server-side rendering errors, or errors thrown in the boundary itself. Handle event and async errors with try/catch and surface them to state or a toast; to route async errors into a boundary, rethrow during render via state.
**Code:** `setState(() => { throw err; });`
**Follow-up:** Why must boundaries be class components (or a library)?

Answer: Only class components implement `getDerivedStateFromError`/`componentDidCatch`; there's no hook equivalent, so use `react-error-boundary`.

---

### REACT-191 — Suspense boundaries as architecture
**Difficulty:** Senior
**Category:** Suspense
**Question:** How do you decide where to put Suspense boundaries?
**Answer:** Boundaries define loading UX granularity. Place them where a coherent partial UI can show a placeholder: around the page for route-level fallbacks, and around independent sections so fast content isn't blocked by slow content. Too few gives full-page spinners; too many yields popcorn loading. Nest them so inner boundaries refine outer ones, and keep fallbacks layout-stable.
**Follow-up:** What happens with no boundary above a suspending component?

Answer: The nearest ancestor boundary handles it; with none, React throws (in client rendering you need a root-level boundary).

---

### REACT-192 — Suspense with error boundaries and transitions
**Difficulty:** Senior
**Category:** Suspense
**Question:** How do Suspense, error boundaries, and transitions work together in navigation?
**Answer:** Suspense handles "not ready yet", error boundaries handle "failed", and transitions keep the current UI visible while new content loads. Wrapping navigation or state updates in `startTransition` avoids replacing already-shown content with a fallback; the old screen stays interactive until the new one is ready. Pair each Suspense with an error boundary so failures show recovery UI.
**Follow-up:** How does the user see pending state during a transition?

Answer: `useTransition` returns `isPending`, which you can use to dim content or show a subtle progress indicator.

---

### REACT-193 — Avoiding waterfalls architecturally
**Difficulty:** Senior
**Category:** Data loading
**Question:** How do nested components cause request waterfalls and how do you structure code to avoid them?
**Answer:** When a parent fetches then renders a child that fetches, the second request starts only after the first completes. Avoid by hoisting data requirements to the route/loader, starting independent fetches in parallel, prefetching, or fetching on the server. Suspense doesn't remove waterfalls; it just makes them easier to write, so start requests early.
**Follow-up:** When is a waterfall unavoidable?

Answer: When a request depends on another's result (e.g. user id needed for the next query); then minimize hops, or collapse them with a backend endpoint.

---

### REACT-194 — Server/client component boundary
**Difficulty:** Senior
**Category:** Server Components
**Question:** At a high level, how do React Server Components change architecture?
**Answer:** Components run by default on the server, can access data directly, and ship no JavaScript to the client. Interactivity lives in Client Components marked with `"use client"`. Architecture becomes about choosing the boundary: keep data access and static composition on the server, push interactivity (state, effects, handlers, browser APIs) to small client leaves. Requires a framework supporting RSC.
**Follow-up:** What can't server components do?

Answer: Use state, effects, event handlers, or browser-only APIs; they also can't pass non-serializable props like functions to client components.

---

### REACT-195 — Placing the "use client" boundary
**Difficulty:** Senior
**Category:** Server Components
**Question:** Where should the `"use client"` boundary go, and what does it affect?
**Answer:** As deep as practical, on the smallest interactive component. The directive marks a module boundary: it and everything it imports become client code. Putting it on a page or layout pulls large subtrees into the bundle. Extract the interactive piece (button, form control) into its own client file and keep surrounding structure on the server.
**Follow-up:** Do children of a client component become client?

Answer: Only those it imports. Server components passed as `children` props remain server-rendered.

---

### REACT-196 — Composing server into client
**Difficulty:** Staff
**Category:** Server Components
**Question:** How can a Client Component render Server Component content?
**Answer:** It can't import one, but the parent server component can pass it as `children` or another prop. The client component renders the already-resolved server output in its slot. This enables client wrappers (modals, tabs, context providers) around server-rendered content without moving that content into the client bundle.
**Code:** `<ClientTabs><ServerPanel /></ClientTabs>`
**Follow-up:** How do client-only providers fit in a server layout?

Answer: Wrap them in a small client component (`Providers`) used by the server layout, passing `children` through.

---

### REACT-197 — Extract a hook or a component?
**Difficulty:** Intermediate
**Category:** Refactoring
**Question:** When do you extract logic into a custom hook versus a new component?
**Answer:** Extract a hook to share stateful logic or separate behavior from rendering without adding UI or a DOM node. Extract a component when you need a reusable piece of UI, an isolated render/update scope, or a place to hold state with its own lifecycle (e.g. per list item). If the logic only exists to serve one chunk of JSX, a component is often cleaner than a hook that returns many values.
**Follow-up:** What is a smell for a bad hook extraction?

Answer: A hook returning a dozen values the component only forwards, or one that wraps a single `useState`. That adds indirection without cohesion.

---

### REACT-198 — Custom hook design
**Difficulty:** Senior
**Category:** Refactoring
**Question:** What makes a custom hook a good architectural unit?
**Answer:** A focused responsibility, a small stable return surface, no hidden global dependencies, and a name reflecting intent (`useCheckoutForm`, not `useStuff`). It should hide implementation (which library, which endpoint) behind domain terms, accept parameters instead of reading ambient state, and be testable via a renderHook. Avoid hooks that bundle unrelated concerns.
**Follow-up:** Do hooks share state between components?

Answer: No. Each call gets its own state; sharing requires context, a store, or a cache.

---

### REACT-199 — Facade API for the data layer
**Difficulty:** Senior
**Category:** Data layer
**Question:** What is a facade over the data layer, and why use one in a React app?
**Answer:** A thin module of domain-named hooks and functions (`useOrders`, `useCancelOrder`) that wrap the fetching library, HTTP client, and cache keys. Components depend on the facade, not on `useQuery`, URLs, or response shapes. This centralizes query keys, mapping, error normalization, and invalidation, and lets you swap libraries or backends with localized changes.
**Code:** `export const useOrders = (f) => useQuery({ queryKey: orderKeys.list(f), queryFn: () => api.orders.list(f) });`
**Follow-up:** What is the risk of a facade?

Answer: It can become a leaky or bloated abstraction that mirrors the library 1:1. Keep it domain-shaped and add methods only as features need them.

---

### REACT-200 — Modular monolith vs micro-frontends
**Difficulty:** Staff
**Category:** Architecture at scale
**Question:** When would you choose micro-frontends over a modular monolith for a React app?
**Answer:** Default to a modular monolith: one deployable with enforced feature boundaries, shared tooling, and simple dependency management. Consider micro-frontends only for real organizational needs: many autonomous teams needing independent deploy cadences, or incremental migration of a legacy app. They bring costs: duplicated dependencies, runtime integration (module federation), shared-state and routing coordination, design consistency, and harder end-to-end testing.
**Trade-offs:** Team autonomy and independent releases vs complexity, performance overhead, and UX inconsistency.
**Follow-up:** How do you limit the downsides if you adopt them?

Answer: Share a versioned design system, define narrow contracts (events, URL, props) between apps, share React as a singleton, and monitor bundle duplication.
