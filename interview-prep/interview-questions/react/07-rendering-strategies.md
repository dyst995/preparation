# Rendering strategies

Questions REACT-301 through REACT-350. React 18 and later, including Server Components where they change how a page is rendered. Concepts are framework-shaped where the industry talks that way, and the judgment is about the rendering model.

### REACT-301 — Client-side rendering

**Difficulty:** Junior
**Category:** Rendering strategies

**Question:**
Walk me through client-side rendering. What does the browser receive, and when does the user actually see the interface?

**Answer:**
Client-side rendering means the server sends a small HTML document, usually a root element and script tags, and React builds the page in the browser. After the bundle downloads, React creates the tree, fetches data from the client, and paints the UI. Users often see a blank shell or a spinner until that work finishes. This is a fair choice for signed-in products where SEO is irrelevant and the team wants a simple static host. Public marketing pages suffer because crawlers and first-time visitors wait on JavaScript before the content exists.

**Follow-up:**
If the product is behind login, why do some teams still server-render the first screen?

Answer: The layout and primary data can appear before the heavy interaction bundle finishes, which matters on a slow phone. You pay with server work and a hydration step, so it is worth doing when time-to-content is part of the product.

### REACT-302 — Server-side rendering

**Difficulty:** Junior
**Category:** Rendering strategies

**Question:**
What is server-side rendering in a React app, and what do you get in exchange for the extra server work?

**Answer:**
Server-side rendering means the server runs React for the request, produces HTML for that page, and sends it down so the user can read content before JavaScript finishes. The browser then hydrates that HTML so clicks and state start working. You get a faster first view and HTML that crawlers can read. You also take on server CPU, caching decisions, and the requirement that the first client render matches the markup exactly. It fits public pages and any screen where waiting on a bundle would feel broken.

**Follow-up:**
Does server-rendered HTML mean the page is interactive as soon as it paints?

Answer: No. The user can read the markup immediately, but event handlers attach during hydration. Until that finishes for a control, the control looks ready and still ignores input.

### REACT-303 — Static site generation

**Difficulty:** Junior
**Category:** Rendering strategies

**Question:**
How is static generation different from rendering on each request?

**Answer:**
Static site generation renders pages ahead of time, at build or on a scheduled job, and stores the HTML as files a CDN can serve. When a request arrives, the server does not run React at all. It just returns the file. That gives you excellent cache hit rates, cheap hosting, and stable performance under traffic spikes. It fits content that is the same for every visitor: docs, blogs, marketing, catalogs that change a few times a day. Per-user data does not belong in that HTML, because one cached file is shared by everyone.

**Follow-up:**
What happens when an editor publishes one article on a ten-thousand-page static site?

Answer: A full rebuild of every page is the blunt option. Incremental regeneration, or a targeted rebuild of that URL, updates one file and leaves the rest of the cache alone.

### REACT-304 — Incremental static regeneration

**Difficulty:** Intermediate
**Category:** Rendering strategies

**Question:**
What problem does incremental static regeneration solve, and what do you accept in return?

**Answer:**
Incremental static regeneration keeps the static-file model but lets a page refresh after it is already published. The first visitors receive the cached HTML. After a revalidation window, or when you trigger a rebuild, the platform regenerates that one page in the background and swaps the cache. You avoid rebuilding the entire site for a single product or article change. The important design point is staleness: someone will see the previous version until regeneration finishes, so the window has to match how fresh the business actually needs the page to be.

**Follow-up:**
Two people hit an expired page at the same moment. What should they see?

Answer: Both should get the current cached HTML, and one regeneration should run in the background. You do not want a stampede of identical rebuilds, and you do not want either visitor waiting on that rebuild.

### REACT-305 — Choosing a strategy per route

**Difficulty:** Intermediate
**Category:** Rendering strategies

**Question:**
How do you decide among client rendering, server rendering, static generation, and incremental refresh for a real product?

**Answer:**
I pick the strategy per route, based on who needs the HTML and how shared the data is. A marketing page can be static. A product page can be static with revalidation. A personalized home can be server-rendered per request or streamed. A dense logged-in tool can be client-rendered. The mistake is rendering a public article on the client because the app is "a React app," or server-rendering a highly interactive canvas on every request and paying CPU for HTML nobody indexes.

**Follow-up:**
What question do you ask the product owner before you choose?

Answer: I ask who must see the content in the first HTML response, how long that content may be stale, and whether two anonymous visitors should receive the same bytes.

### REACT-306 — Hydration

**Difficulty:** Junior
**Category:** Hydration

**Question:**
What is hydration, in terms of the DOM the server already produced?

**Answer:**
Hydration is the step where React takes HTML the server already sent and attaches event handlers, state, and the component tree on top of those existing DOM nodes. The user can see the page before this finishes, but buttons do nothing until hydration reaches them. React walks the tree and expects the client render to describe the same elements the server produced. Hydration matters because it is the bridge from a fast first paint to a working app, and it is also where mismatches, extra JavaScript, and main-thread jank show up.

**Follow-up:**
Why do we call `hydrateRoot` instead of `createRoot` on server-rendered markup?

Answer: `hydrateRoot` adopts the existing DOM and attaches React to it. `createRoot` expects to create the UI itself, so using it on a full server document throws away the HTML you just paid to send.

### REACT-307 — Why hydration is expensive

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
The HTML is already on screen. Why can hydration still make the page feel slow?

**Answer:**
Hydration feels like a free follow-up to server HTML, but the browser still downloads the components, parses them, and runs a render to attach behavior. That work competes with input on the main thread, so a page can look ready while scrolling and clicks lag. Large client trees make this worse because every interactive component has to ship. The practical question is which parts of the page need to become interactive, and how fast. If a section is static text, paying to hydrate it buys nothing the user can feel.

**Follow-up:**
What would you measure if a page paints quickly and then ignores the first tap?

Answer: I would look at main-thread time during hydration and interaction to next paint, plus how much JavaScript the route shipped. A fast first paint with a huge client tree is a hydration problem.

### REACT-308 — Hydration mismatches

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
What is a hydration mismatch, and why is it more than a console warning?

**Answer:**
A hydration mismatch happens when the HTML from the server does not describe the same tree React renders on the client during hydration. React then warns, and in development it may patch the DOM or discard the server markup and render again. Users can see a flicker, broken attributes, or a full client re-render that throws away the benefit of server HTML. This matters because the bug often hides in code that "works" after load. The first paint was already wrong, so the recovery is expensive and confusing.

**Follow-up:**
React Strict Mode runs render twice in development. Does that by itself cause a mismatch?

Answer: A pure render can run twice and still match. A mismatch means the server HTML and the client render disagreed. Strict Mode makes impure renders easier to notice, which is useful when the impurity is what diverged.

### REACT-309 — Causes of hydration errors

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
Which kinds of code usually cause a hydration mismatch, and how do you keep the first render stable?

**Answer:**
The usual causes are values that differ between server and client: `Date.now()`, `Math.random()`, locale formatting, time zones, and reading `window`, `localStorage`, or media queries during the first render. Invalid HTML nesting, like a `div` inside a `p`, also makes the browser repair the DOM before React hydrates, so the trees diverge. Browser extensions can inject nodes too. I treat the first render as pure with respect to the environment. Anything that depends on the browser waits until after mount, or the server and client both receive the same value as a prop.

**Code:**

```jsx
function Price({ cents }) {
  const [label, setLabel] = useState("…");
  useEffect(() => {
    setLabel(new Intl.NumberFormat().format(cents / 100));
  }, [cents]);
  return <span>{label}</span>;
}
```

**Follow-up:**
When is `suppressHydrationWarning` a reasonable escape hatch?

Answer: It is reasonable for a tiny text node you accept will differ, such as a timestamp, and only on that element. It is a poor fix for a structural mismatch, because React will still recover badly and the warning was the useful signal.

### REACT-310 — Streaming server rendering

**Difficulty:** Intermediate
**Category:** Streaming

**Question:**
What does streaming server rendering change compared with building one HTML string and then sending it?

**Answer:**
Streaming server rendering means the server sends HTML in chunks as soon as each part is ready, instead of waiting for the whole page. The browser can paint the shell, nav, and any finished sections while slower data is still loading on the server. React uses Suspense boundaries to decide where a chunk can flush. This improves time to first content on pages that have one slow query and a lot of cheap layout. It does not remove the need to hydrate, and a slow chunk still delays interaction inside that boundary.

**Follow-up:**
What has to be true of the runtime for streaming to actually flush early?

Answer: The server needs to write chunks as they are ready, and nothing downstream should buffer the entire response. A proxy or compression setup that holds the body until it ends will quietly turn streaming back into a buffered render.

### REACT-311 — First byte versus a finished document

**Difficulty:** Intermediate
**Category:** Streaming

**Question:**
How do time to first byte and "page finished" move when you switch from a buffered render to a stream?

**Answer:**
With a buffered server render, time to first byte waits on the slowest data source, because nothing is sent until the full HTML string exists. With streaming, the server flushes the document start quickly, so first byte reflects the shell, while slow regions arrive later as extra chunks. The user sees layout sooner. First byte and first content improve, but the page is not finished, and interaction still waits on hydration of chunks that have arrived. In review I want both numbers, so a fast header does not hide a product region that streams in last.

**Follow-up:**
Which number would you refuse to celebrate by itself?

Answer: Time to first byte. A fast header with the product region still pending can look great in one metric and feel unfinished. I want first content of the primary region, and interaction timing, next to it.

### REACT-312 — Suspense boundaries while streaming

**Difficulty:** Intermediate
**Category:** Streaming

**Question:**
What is a Suspense boundary doing during a streaming server render?

**Answer:**
A Suspense boundary is the point where React is allowed to show a fallback and keep rendering the rest of the tree. During streaming SSR, each boundary is a flush point: HTML outside it can be sent immediately, and the inside is replaced later when its data resolves. The fallback is real HTML, so the user sees a stable slot. Boundaries matter because they define what you are willing to show unfinished. A boundary around the whole page brings back buffered behavior. A boundary around one slow widget keeps the rest of the page moving.

**Code:**

```jsx
<header>{title}</header>
<Suspense fallback={<p>Loading reviews…</p>}>
  <Reviews productId={id} />
</Suspense>
```

**Follow-up:**
Does the fallback have to be a spinner?

Answer: It should be honest reserved space: a skeleton, a short status, or a region with a stable size. A tiny spinner in a tall slot is what produces layout shift when the real content arrives.

### REACT-313 — How wide a streaming boundary should be

**Difficulty:** Senior
**Category:** Streaming

**Question:**
How do you decide what goes inside a Suspense boundary and what stays in the shell?

**Answer:**
I place a Suspense boundary around a region that can load independently and still leave the page understandable. The product title, price, and primary action usually stay outside, because a fallback there looks like a broken page. Reviews, related items, and secondary charts can sit inside. Too many tiny boundaries create a noisy sequence of pop-ins and extra round trips of HTML. One giant boundary hides everything behind the slowest call. The test I use is simple: if this section were late, would the user still know what page they are on and what to do next?

**Follow-up:**
A designer wants every card to stream in on its own. What do you push back with?

Answer: Independent data is not enough. A cascade of tiny holes costs HTML round trips and visual noise. I group cards that arrive together and reserve their space, unless one card is genuinely much slower than the rest.

### REACT-314 — Selective hydration

**Difficulty:** Senior
**Category:** Hydration

**Question:**
What is selective hydration, and why does it matter on a long page?

**Answer:**
Selective hydration means React does not have to finish hydrating the entire page before it can respond to input. With streaming and Suspense, sections hydrate as their JavaScript arrives, and React can prioritize the boundary the user is interacting with. If someone clicks a region that is waiting, that region jumps the queue. This matters on large pages because a comments widget at the bottom should not block the add-to-cart button at the top. You still have to keep each interactive island small. Prioritizing a huge tree just moves the jank to the place the user touched.

**Follow-up:**
If the user clicks a button whose code has not arrived yet, what should happen?

Answer: React records the interaction, prioritizes that boundary, and replays the click once that region can hydrate. The rest of the page should not have to finish first.

### REACT-315 — React Server Components

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
What is a React Server Component, and what does the browser never receive?

**Answer:**
React Server Components run only on the server and never ship their implementation to the browser. They can read data close to the source, render their output, and pass the result into the client tree. Their own JavaScript is not part of the bundle. Client components still hydrate and handle state, effects, and events. The split matters because most of a page is often formatting and data access, while a smaller part is interactivity. Keeping that work on the server cuts the script the browser has to download, while the parts that must respond to input stay on the client.

**Follow-up:**
If a Server Component renders a `<button>`, can that button have an `onClick`?

Answer: The button can be static markup from the server. A click handler is client behavior, so the interactive button needs to live in a client component that the server renders as a child.

### REACT-316 — Server and client components in one tree

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
How do Server Components and client components share one tree, and which direction can import the other?

**Answer:**
A single page is usually a tree of both. Server Components can render client components and pass them serializable props, such as a product id or a prepared list of items. Client components cannot import Server Components, because that would pull server-only code into the browser bundle. If a client component needs a server-rendered slot, you pass that slot as children or another prop from a Server Component parent. The rule keeps the dependency direction clear: server code may compose client islands, and the client receives the finished output plus the islands it must hydrate.

**Follow-up:**
Why do people pass a Server Component as `children` into a client layout?

Answer: The parent Server Component renders the server subtree and hands the finished slot across the boundary. The client layout can wrap it without importing server code, so the slot stays out of the bundle.

### REACT-317 — What is allowed to stay on the server

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
How do you decide whether a module can stay a Server Component?

**Answer:**
Server Components can use server-only resources: databases, private SDKs, file access, and secrets that must never reach the browser. They cannot use state, effects, or browser events, because there is no component instance sitting in the document waiting for a click. Anything that needs `useState`, `useEffect`, or a DOM API belongs in a client component. I use that as the design test. If the module's job is to fetch and format, I keep it on the server. If its job is to respond to the user over time, it is client code, with data prepared on the server.

**Follow-up:**
Can a Server Component pass a database row straight through as a prop?

Answer: Only the serializable fields the client needs. Secrets, methods, and driver objects stay on the server. I map the row down to a plain object at the boundary.

### REACT-318 — When to mark `use client`

**Difficulty:** Intermediate
**Category:** Server Components

**Question:**
When do you add the `'use client'` directive, and where should it sit in the tree?

**Answer:**
I add `'use client'` when the module needs state, effects, event handlers, or a browser API. The directive marks that file and the modules it imports as part of the client graph. I keep it off the page root, because a root directive pushes the whole page into the bundle just to make one widget interactive. I push the directive down to the smallest component that actually needs it, and I leave data fetching and layout in Server Components above it. The signal is a hook or a DOM dependency.

**Code:**

```jsx
"use client";

export function AddToCart({ productId }) {
  return <button onClick={() => add(productId)}>Add</button>;
}
```

**Follow-up:**
A page file only renders an `AddToCart` client component. Does the page file itself need `'use client'`?

Answer: No. A Server Component page can render `AddToCart` and pass a product id. The directive belongs on the button module, which is the file that uses the event handler.

### REACT-319 — How the client boundary spreads

**Difficulty:** Senior
**Category:** Server Components

**Question:**
You add `'use client'` to one file and the bundle jumps. What happened?

**Answer:**
`'use client'` marks a module boundary. It is wider than the single component in that file. Once a file is in the client graph, every module it imports joins that graph unless you keep those imports on the server side of the boundary. That is why a convenience import of a date formatter or a design-system barrel can accidentally ship a large dependency to the browser. I check the import direction when I add the directive. Shared pure helpers can be imported from both sides if they avoid pulling in server-only or client-only code.

**Follow-up:**
How would you confirm the boundary is the cause?

Answer: I inspect the client bundle for that route and look for modules that should have stayed on the server. If a data-formatting package appears there, an import crossed the boundary and needs to move back above it.

### REACT-320 — Props that cross the server boundary

**Difficulty:** Senior
**Category:** Server Components

**Question:**
What can you pass from a Server Component into a client component, and what fails?

**Answer:**
Props that cross from a Server Component into a client component have to be serializable. The server renders, then sends a payload the browser can parse, so functions, class instances, and most complex objects cannot be passed. Dates, Map, and Set are common surprises unless the framework has a defined encoding. I pass plain data: ids, strings, numbers, and arrays of records the client actually needs. Large object graphs are a performance problem even when they serialize, because they bloat the flight payload. If the client needs behavior, I pass data and let the client module own the function.

**Follow-up:**
Why is "pass a callback from the server" the wrong fix for a click handler?

Answer: The function cannot be serialized into the payload. The handler has to be defined in a client module. The server passes the data that handler should close over, such as an id.

### REACT-321 — Server Actions at a high level

**Difficulty:** Intermediate
**Category:** Server Actions

**Question:**
What is a Server Action, and why is it part of the rendering conversation?

**Answer:**
A Server Action is a function that the client can invoke but that runs on the server. In the form case, the browser submits fields and the server applies the mutation, checks auth, and updates data next to the database. The client does not need a hand-written fetch for every form, although you still have a network call. This matters because mutations are part of rendering architecture: after the action, the server can refresh the affected UI. I still treat it as an API: validate, authorize, and make it idempotent, because a hostile caller can invoke it.

**Code:**

```jsx
async function save(formData) {
  "use server";
  await updateName(String(formData.get("name") ?? ""));
}

return (
  <form action={save}>
    <input name="name" />
    <button type="submit">Save</button>
  </form>
);
```

**Follow-up:**
Does `"use server"` make the function private?

Answer: It makes the function run on the server. The client can still invoke it, so authorization has to live inside the action. Hiding the button is not a security boundary.

### REACT-322 — Progressive enhancement with Server Actions

**Difficulty:** Senior
**Category:** Server Actions

**Question:**
How can a Server Action support progressive enhancement instead of requiring the client bundle?

**Answer:**
A form that posts to a Server Action can work as a normal HTML form. Without JavaScript, the browser performs a document request, the server applies the change, and it returns updated HTML. With JavaScript, the same action can run in the background and refresh only the affected region. That is progressive enhancement: the basic task succeeds on a slow device or a failed script, and the enhanced path feels faster when hydration has happened. I would keep that promise for document-style tasks. Drag-and-drop and instant keystroke filters still need client code.

**Follow-up:**
What breaks the no-JavaScript path even if you used a Server Action?

Answer: A click handler that calls `preventDefault` and never lets the form submit, or inputs that exist only in client state and never in form fields. The browser can only post what the document contains.

### REACT-323 — Static rendering versus dynamic rendering

**Difficulty:** Intermediate
**Category:** Static and dynamic rendering

**Question:**
What is the difference between static and dynamic rendering, beyond "it happens at build time"?

**Answer:**
Static rendering produces HTML that can be reused across visitors, because the output does not depend on who is asking at this moment. Dynamic rendering runs at request time, because the result depends on something unique to that request, such as cookies, search params, or per-user data. The distinction matters for caching. A static page can live on a CDN. A dynamic page consumes compute on each hit unless you cache a more specific variant. I decide this from the data dependency. Identical HTML shared by many users should stay static.

**Follow-up:**
Can a page be static even if generating it was expensive?

Answer: Yes. Cost of generation and reuse of the result are different questions. An expensive render that is identical for every visitor is a good candidate to cache as static HTML.

### REACT-324 — What forces a dynamic render

**Difficulty:** Intermediate
**Category:** Static and dynamic rendering

**Question:**
What kinds of dependencies force a route to render dynamically?

**Answer:**
A route becomes dynamic when its HTML depends on request-specific input. Common triggers are cookies, auth headers, search params, and any API read that opts out of caching because the response is personalized. A build-time fetch of a public product list can stay static. Reading the session cookie to greet the user cannot. Frameworks differ on the exact API, but the architecture is the same: one uncached, per-request dependency poisons the cache for that route unless you isolate it. I push personalized bits into a small dynamic hole or a client read, so the shared shell stays cacheable.

**Follow-up:**
A logger reads a request id and the whole page suddenly becomes dynamic. How do you respond?

Answer: I move that read out of the shared render path. Diagnostics that touch the request should not decide the cache lifetime of HTML that is otherwise identical for every visitor.

### REACT-325 — Islands and partial hydration

**Difficulty:** Senior
**Category:** Islands

**Question:**
What is an islands architecture, and how does partial hydration relate to it?

**Answer:**
Islands architecture renders most of the page as static HTML and hydrates only marked interactive regions. A comment box, a search input, or a cart button becomes an island with its own small script. The article text around it never boots a component tree. Partial hydration means attaching behavior only where it is needed. This matters on content-heavy sites because the reading experience should not wait on a framework runtime. The design cost is composition. Islands that need to share state, like a cart button and a mini-cart, need an explicit channel between them.

**Follow-up:**
How do two islands share a cart count without hydrating the whole page?

Answer: They share a small store or a browser event outside the static HTML. Each island subscribes. The article body stays plain HTML, and only the widgets ship JavaScript.

### REACT-326 — Islands compared with Server Components

**Difficulty:** Senior
**Category:** Islands

**Question:**
How do islands and Server Components differ if both try to ship less JavaScript?

**Answer:**
Both approaches try to stop shipping a full application runtime for static content, but they compose differently. Islands usually start from HTML and opt into small client widgets. Server Components start from a React tree, render data-heavy components on the server, and opt into client components at the leaves. Islands often treat the page as a document with mounted widgets. I use islands for a content site with a few widgets, and Server Components when the product is a large React UI with a few interactive subtrees.

**Follow-up:**
Which model makes a server-rendered slot inside a client shell more natural?

Answer: Server Components. A server parent can pass rendered children into a client component. Classic islands usually mount widgets into a finished document, so that composition is less natural.

### REACT-327 — SEO and the HTML you send

**Difficulty:** Junior
**Category:** SEO

**Question:**
How does the rendering strategy show up in search results and link previews?

**Answer:**
Search engines and link previews read the HTML you send, and they may not wait for a client render. Client-side rendering risks empty titles, missing body text, and social cards that show a blank shell. Server rendering and static generation put the primary content in the first response, which is what you want for public pages. Streaming is usually fine for SEO if the important text is in the early chunks. I put titles, canonical text, and the main answer in the initial HTML.

**Follow-up:**
A client-rendered page looks fine when you "view source" after load. Is that the document a crawler got?

Answer: View source after hydration shows the live DOM. The crawler received the original response. I check the raw first response, or a fetch with JavaScript disabled, before I trust SEO.

### REACT-328 — Caching HTML versus caching data

**Difficulty:** Senior
**Category:** Caching

**Question:**
When would you cache the finished HTML, and when would you cache the data underneath it?

**Answer:**
Caching HTML means storing the finished markup and serving it without running React again. Caching data means storing the query result and still rendering the page, which can be shared across pages that use the same record. HTML caches are the fastest path to the browser: one personalized bit makes the whole document uncacheable. Data caches are more reusable, but a render still costs CPU. I cache HTML for anonymous shared pages, and I cache data when many views reuse the same records while the markup must vary.

**Follow-up:**
A product record is shared, but the page includes a user-specific price. What do you cache?

Answer: I cache the product data, and I keep the shared description in cacheable HTML if I can. The price stays in a small dynamic slot so one shopper's price never becomes another shopper's document.

### REACT-329 — Revalidating a cached page

**Difficulty:** Intermediate
**Category:** Caching

**Question:**
What does revalidation mean for a page you are already serving from cache?

**Answer:**
Revalidation is the policy for replacing a cached page or cached fetch after you have already served a stale copy. Time-based revalidation serves the old HTML and regenerates in the background once the window expires. On-demand revalidation runs when a CMS publish or a product update tells the cache that one URL is dirty. Both keep the static serving path. The product decision is how wrong the page is allowed to be, and for how long. A price or inventory figure often needs a short window or an explicit purge. A docs page can live for hours.

**Follow-up:**
Why is a publish button that "just clears the whole CDN" a risky design?

Answer: It works, and it also throws away every warm page, so the next wave of traffic rebuilds the site at once. I purge the URLs that embed the changed record and leave unrelated pages warm.

### REACT-330 — Edge rendering trade-offs

**Difficulty:** Senior
**Category:** Edge rendering

**Question:**
When is rendering at the edge a win, and when does it make the request slower?

**Answer:**
Edge rendering runs the server render in a location close to the user, which cuts network latency before the first byte. The gain is real for a lightweight personalized response, a redirect, or an A/B variant. The limit is the runtime. Edge environments often have smaller CPU budgets, short timeouts, and a restricted set of APIs, so a heavy React tree or a chatty database driver can be slower at the edge than in a regional server next to the database. I use the edge for cheap request logic and cache hits. I keep data-heavy renders near the data.

**Follow-up:**
The edge is 20ms from the user and 80ms from the database, and every request needs three queries. Where do you render?

Answer: Near the database. You would spend the proximity savings on three cross-region round trips. The edge can still cache the public result or handle a redirect.

### REACT-331 — Server-side request waterfalls

**Difficulty:** Senior
**Category:** Data loading

**Question:**
What is a waterfall on the server, and why do teams miss them?

**Answer:**
A server waterfall is a chain of sequential awaits: the page waits for the user, then for the account, then for recommendations that needed the account id. The HTML cannot include that last piece until every earlier hop finishes, so latency adds up even though the code is on a fast server. Client waterfalls are a known problem. Server waterfalls hide inside loaders and Server Components because each await looks local and reasonable. They matter more under streaming than people expect. The shell flushes, then a single boundary still waits on its own chain, and that region feels broken.

**Follow-up:**
How do you tell a true dependency from an accidental waterfall?

Answer: If the second call needs an id or a decision from the first, the sequence is real. If both calls could have started from the route params, the sequence is an accident and should run together.

### REACT-332 — Cutting a server waterfall

**Difficulty:** Senior
**Category:** Data loading

**Question:**
How do you structure server data loading so independent work does not stack up?

**Answer:**
I start independent fetches together, as early as their inputs exist, instead of awaiting one and then starting the next. Parent loaders should fetch what they know immediately and pass ids down, or kick off the child fetch before they render the child. Where the framework supports it, composing promises so a child can resume a promise started by the parent removes a round trip. I also split slow, optional work into its own Suspense boundary so the critical path does not wait on it. The check is a trace of that region: parallel spans when calls are independent.

**Code:**

```jsx
const user = await getUser();
const [account, flags] = await Promise.all([
  getAccount(user.id),
  getFlags(user.id),
]);
```

**Follow-up:**
Why can a child Server Component that fetches "its own" data still be a waterfall?

Answer: It cannot start until the parent has rendered it. If the parent awaited something unrelated first, the child fetch starts late. Hoist the independent promise so it begins with the request.

### REACT-333 — Streaming, crawlers, and previews

**Difficulty:** Intermediate
**Category:** SEO

**Question:**
How should you think about streaming when a bot or a preview service fetches the page?

**Answer:**
Some clients read the full stream and execute scripts. Others take the first chunk of HTML and stop. If the main content is behind a Suspense fallback, those clients index the fallback and miss the article. I flush the primary content in the initial shell and stream only supplementary regions. I also keep title, description, and Open Graph tags in the head of that first chunk, because many previewers never see a later replacement. Streaming is a performance tool. The canonical content still has to be present before the first flush completes.

**Follow-up:**
Where would you put a comments block versus the article body?

Answer: The article body goes in the first flush, because it is the canonical content. Comments can sit behind a Suspense boundary and arrive later without changing what a preview shows.

### REACT-334 — Fetching only after hydration

**Difficulty:** Intermediate
**Category:** Data loading

**Question:**
When is it reasonable to load data in an effect after hydration, and when is that a design smell?

**Answer:**
Fetching after hydration means the server HTML renders a shell, React hydrates, and then a `useEffect` or a client query loads the real data. The user sees a second loading state, and the content was absent from the HTML crawlers fetched. It is a reasonable pattern for data that is private, fast-changing, or only needed after interaction, such as a typeahead result. If the page's purpose is that data, I move the fetch to the server render or to a static generation step so the first HTML already contains it.

**Follow-up:**
What extra cost appears if the server already rendered the data and the client fetches it again on mount?

Answer: You pay for two reads and often a loading flash that replaces good HTML with a spinner. If the server data is the source of truth, pass it into the client tree and skip the mount refetch.

### REACT-335 — Shipping less JavaScript

**Difficulty:** Senior
**Category:** Hydration

**Question:**
Server HTML improved first paint, but the page still feels heavy. Where do you look?

**Answer:**
Server rendering alone does not shrink the bundle. If every section is a client component, the browser still downloads and hydrates all of it. The reduction comes from leaving non-interactive trees on the server, or from islands that never hydrate the article body. I judge the page by the client graph and the hydration cost. A page can have a fast first paint and a terrible interaction latency because a megabyte of components is hydrating. Code-splitting a modal still helps, but the bigger win is deleting client boundaries that only format data the server already had.

**Follow-up:**
A teammate code-splits every component and the route is still slow to use. What is left?

Answer: Split points still download when those components hydrate. I would remove client boundaries from static regions so that code never ships, which is a larger cut than splitting it.

### REACT-336 — A static shell with dynamic holes

**Difficulty:** Senior
**Category:** Static and dynamic rendering

**Question:**
What does it mean to prerender a static shell and leave dynamic holes?

**Answer:**
Partial prerendering, or a static shell with dynamic holes, renders the shared parts of a page ahead of time and leaves holes where request-time data will go. The CDN can serve the shell immediately. A Suspense boundary marks each hole, and the server streams the personalized or slow fragment into it. You get most of the static cache benefit without pretending the whole page is anonymous. The design rule is to keep holes small and few. If half the page is a hole, you have reinvented dynamic rendering and added the complexity of a shell.

**Follow-up:**
How is this different from rendering the entire page on every request and caching nothing?

Answer: The shared bytes are built once and served from cache. Only the holes pay request-time cost. A fully dynamic page repeats the whole render, including the parts that never varied.

### REACT-337 — Progressive enhancement

**Difficulty:** Junior
**Category:** Progressive enhancement

**Question:**
What does progressive enhancement mean for a React page that can also hydrate?

**Answer:**
Progressive enhancement means the core task works with basic HTML, and JavaScript improves the experience. A link navigates. A form submits. A Server Action or a classic form handler returns a new document. After hydration, the same controls can intercept the submit, update in place, and preserve scroll. This matters for resilience: flaky networks, blocked scripts, and assistive tech that follows real controls. It also disciplines the API, because the server must be able to finish the job from the request itself. I start with the document behavior, then add the client path.

**Follow-up:**
Which interactions do you stop trying to enhance this way?

Answer: Interactions that have no document equivalent: a drag-and-drop board, a canvas, or a filter that must update on every keystroke. Those are client features with a server-side authority behind them.

### REACT-338 — Client-heavy leaves in a server tree

**Difficulty:** Senior
**Category:** Server Components

**Question:**
Where do a rich editor, a map, or a drag-and-drop chart live if the rest of the page is server-rendered?

**Answer:**
A rich editor, a chart with drag behavior, or a map still belongs in a client component, even inside a Server Component app. I server-render the page around it: the title, the permissions check, the record it should load. The client leaf receives serializable props and owns the interaction. I keep the document's main text out of that leaf when the server already could have rendered it. The goal is a small island with a clear contract. If the island is the entire product, a client-rendered app can be the simpler architecture.

**Follow-up:**
What belongs in the props of that editor island?

Answer: The document id, the initial content, and permission flags. The editing behaviors stay in the client module. Server-only objects and unused columns stay behind.

### REACT-339 — Browser-only APIs and the first render

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
Where can you safely touch `window`, `localStorage`, or `matchMedia`?

**Answer:**
Any read of `window`, `document`, `localStorage`, or `matchMedia` during the first render will disagree with the server, because the server has no browser. The safe pattern is to render a stable fallback first and update after mount, or to gate that subtree so it only renders on the client. In a Server Component tree, that code cannot live in a server module. It has to sit below a client boundary. I also watch libraries that touch the DOM at import time. Those break the server build, so they need a dynamic client-only import behind the leaf that uses them.

**Follow-up:**
Why is an import-time `window` check worse than a check inside `useEffect`?

Answer: Import-time code runs when the server loads the module, so the build or the request crashes before any HTML exists. An effect runs only in the browser, after a stable first render.

### REACT-340 — Errors after the stream has started

**Difficulty:** Senior
**Category:** Streaming

**Question:**
A region fails after the server has already flushed the shell. What can you still do?

**Answer:**
Once the server has flushed the shell, it cannot change the status code or the markup it already sent. If a later region throws, an error boundary around that Suspense region should render the error UI into the hole. An error boundary above the flush cannot rewrite the bytes already on the wire. I place error boundaries next to the boundaries that stream, so a failed review panel does not take down the product page. A missing price should fail the response before the first flush.

**Follow-up:**
Why is "return a 500" no longer available for that review failure?

Answer: The status line was sent with the first chunk. Later bytes can fill a hole or show an inline error, and they cannot change the response into a full error document.

### REACT-341 — Layout stability while regions stream in

**Difficulty:** Intermediate
**Category:** Streaming

**Question:**
How do you keep a streaming page from jumping around as chunks arrive?

**Answer:**
Streaming feels fast and then looks broken if each chunk shoves the page around. I reserve space for regions that stream in: fixed aspect ratios for media, min-height for cards, and skeletons that match the final layout. Suspense fallbacks should be close to the size of the content they replace. Below-the-fold regions can stream more freely because a shift there does not move the thing the user is reading. Cumulative layout shift is the metric I watch. A strategy that improves first byte and wrecks visual stability will fail a real user and a Core Web Vitals review.

**Follow-up:**
The final height depends on the text. How do you reserve space honestly?

Answer: I reserve a minimum that matches the common case and let a small shift happen for outliers. A wildly tall skeleton is its own layout bug. I would rather stream that block only when it is below the fold.

### REACT-342 — Edge cache versus origin cache

**Difficulty:** Senior
**Category:** Caching

**Question:**
How do you choose between caching HTML at the edge and caching it at the origin?

**Answer:**
An edge cache stores the response near the user. An origin cache stores it next to the app, so a miss at the edge can still avoid recomputing. HTML that is safe for everyone should sit at the edge with a clear freshness policy. HTML that varies by cookie should not be cached as a public document, or you will serve one user's page to another. A practical split is a public edge-cached shell and a private, uncached or tightly keyed fragment for the session. Cache keys must include every input that changed the bytes.

**Follow-up:**
Which inputs do people forget to put in the cache key?

Answer: Locale, currency, and experiment bucket. If those change the HTML and stay out of the key, the cache mixes variants and users see the wrong language or the wrong test.

### REACT-343 — Personalization and cacheability

**Difficulty:** Senior
**Category:** Caching

**Question:**
How do you personalize a page without making every response unique?

**Answer:**
Personalization is the force that breaks a shared cache. A name in the header, a cart count, or a recommendation row makes the HTML unique. I separate the page into a shared document and small personalized slots. The slots can be client-fetched after hydration, streamed into a hole, or rendered as a cookie-keyed fragment with a private cache. The test is whether two anonymous users should receive the same bytes. If they should, the personalized piece is a slot. If the whole layout depends on the user, dynamic rendering is the honest model.

**Follow-up:**
A cart badge is the only personalized part of a marketing page. What do you refuse to do?

Answer: I refuse to mark the whole route dynamic for that badge. The page stays cached, and the badge is a small slot filled from the session.

### REACT-344 — Authentication and the rendering model

**Difficulty:** Senior
**Category:** Caching

**Question:**
How does a logged-in session change the way you render and cache a page?

**Answer:**
Authentication changes the cache story more than it changes React. A public page can be static. A page that merely changes a header when a session exists can still cache the body and fill the header later. A page whose content depends on the user has to render dynamically, or render a shell and load private data on the client after the session is known. I never put another user's data in a shared HTML cache. Gating is a server concern: check the session before rendering private markup.

**Follow-up:**
Why is hiding private text with CSS an unsafe "optimization"?

Answer: The text is still in the HTML. A shared cache, a crawler, or a curious client can read it. If the user must not see it, the server must not send it.

### REACT-345 — Forms and client mutations

**Difficulty:** Intermediate
**Category:** Server Actions

**Question:**
When do you post a form to a server function, and when do you run a client mutation instead?

**Answer:**
For a simple create or update, a form that posts to a server function is the better default. The server validates, authorizes, writes, and returns fresh UI. The form still works if the client bundle is slow. A client mutation fits when the interaction is ongoing: optimistic updates, keystroke saves, drag-and-drop, or a multi-step editor that must avoid a round trip on every change. Even then, the server remains the authority. The client predicts the next screen, and the action reconciles with the real result. I choose based on whether the control is a document submit or a live instrument.

**Follow-up:**
How should the UI behave when the optimistic update was wrong?

Answer: It should reconcile to the server result and show the error in context. Leaving the optimistic state on screen teaches the user to trust a write that never landed.

### REACT-346 — Frameworks compared by request model

**Difficulty:** Staff
**Category:** Architecture

**Question:**
How do you compare React frameworks at the architecture level, without turning it into a library checklist?

**Answer:**
I compare frameworks by the request model. One family serves a document per navigation: loaders fetch on the server, the response is HTML, and client components hydrate on top. Another family adds a component-level server model: Server Components render in the tree and client components are the interactive leaves. An islands framework treats the page as static HTML plus explicitly mounted widgets. All three can produce a fast first paint. They differ in where data loading lives, how much JavaScript is the default, and how naturally a mutation refreshes the document.

**Follow-up:**
What would make you leave a component-level server model for a document-and-loader model?

Answer: A product that is mostly navigations and forms, where a full document response is the simple path and the team does not need a mixed server and client component tree.

### REACT-347 — Several strategies on one product page

**Difficulty:** Staff
**Category:** Architecture

**Question:**
Walk through the rendering choices on a public commerce product page.

**Answer:**
Take a commerce product page. The title, price, images, and description are shared and should be static or lightly revalidated HTML so SEO and first paint are solid. Inventory and the signed-in promotions can be a small dynamic hole or a client read, because they change faster and vary by user. The image gallery's zoom and the add-to-cart button are client islands. Reviews can stream in below a Suspense boundary. Public copy stays in the first HTML, and reviews stay off the critical path. The page is several strategies composed, with the public content in the first HTML.

**Follow-up:**
Price is shared, and a loyalty discount is per user. How do you split them?

Answer: The public price stays in the cached HTML. The loyalty price is a personalized slot, streamed or loaded for the session, so the shared document stays the same for everyone else.

### REACT-348 — Focus, assistive tech, and hydration

**Difficulty:** Intermediate
**Category:** Hydration

**Question:**
How do streaming and hydration change accessibility, beyond visual loading states?

**Answer:**
Hydration and streaming change when controls become real. A button painted by the server may not accept the click until it hydrates, so I keep the primary action in an early, small client boundary. Streaming content below the user's focus should not steal focus or reset the scroll position. Fallback text has to be real text, because a screen reader will announce what is present now. If I replace a region, I preserve its heading structure and move focus only when the user asked for a navigation. Visual readiness and operable readiness are different moments, and both need a design.

**Follow-up:**
A streamed region includes a heading. What should the fallback contain?

Answer: A textual status in that same region, with space reserved, and no focus move when it swaps. The heading level of the final content should match the structure the user already started reading.

### REACT-349 — Knowing the strategy is working

**Difficulty:** Senior
**Category:** Architecture

**Question:**
Which measurements tell you a rendering strategy is actually working?

**Answer:**
I judge a rendering strategy with user-facing timings. First contentful paint and largest contentful paint tell me whether meaningful HTML arrived early. Interaction to next paint tells me whether hydration and client work blocked the main thread. Cumulative layout shift tells me whether streaming placeholders were honest about size. I also watch server time to first byte, cache hit rate, and the JavaScript bytes for the route. A static page that ships a huge bundle can lose to a dynamic page with a tiny client island. The winner is the distribution of those numbers on slow devices.

**Follow-up:**
Lab scores look perfect and field INP is poor. Where do you look first?

Answer: Real phones, hydration cost, and third-party scripts. Lab runs often miss the device and the bundle the field has to execute before a tap gets a response.

### REACT-350 — A portfolio of route policies

**Difficulty:** Staff
**Category:** Architecture

**Question:**
As a staff engineer, how do you keep rendering strategy from becoming a one-time framework choice?

**Answer:**
At staff level I treat rendering as a portfolio of route policies, with owners and budgets. Each public route has a stated model: static, revalidated, streamed, or client-rendered, plus a JavaScript budget and a freshness window. We review exceptions when someone marks a shared page dynamic or adds a client boundary around a layout. The platform should make the static path easy and the dynamic path explicit, so the cost shows up in code review. I would rather support three clear patterns than a framework default nobody can explain.

**Follow-up:**
What outcome do you want six months after the platform work?

Answer: Anonymous pages stay cacheable, fresh data pays for server work on purpose, and client code shows up only where a person is interacting. A new route can name its policy without a framework debate.
