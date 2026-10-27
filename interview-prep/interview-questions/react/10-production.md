# REACT10 — Production

React 18+/19, Next.js App Router where relevant; production concerns for shipping and operating React apps. Leave SSR/RSC deep dives that belong in section 07 alone; leave unit RTL testing in section 08; leave TS typing in section 09.

### REACT-451 — Vite production build basics

**Difficulty:** Junior

**Category:** build & ship

**Question:**

What does a Vite production build do differently from `vite` in development, and why does that matter for shipping?

**Answer:**

A Vite production build runs `vite build`, which bundles with Rollup, minifies, tree-shakes, and emits hashed assets into `dist` for static hosting. Dev uses native ESM and fast HMR; prod optimizes for download size and cacheability. You ship the built assets, not the Vite server. The trade-off is longer build time and harder local debugging of the minified output unless you keep source maps carefully. Failure mode: deploying the wrong folder or forgetting to set `base` for subpath hosting, so asset URLs 404 in production and the app never boots for users.

**Follow-up:**

How do hashed filenames help CDN caching?

Answer: Content hashes let you set long `Cache-Control` on assets because a code change produces new filenames, so clients never keep a stale JS/CSS file after a deploy.

### REACT-452 — Webpack vs Vite for React apps

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

When would you still choose Webpack over Vite for a production React app?

**Answer:**

Vite wins for most greenfield SPAs with fast DX and simple Rollup production builds. Choose Webpack when you inherit a complex plugin ecosystem, need Module Federation at scale, or have custom loaders that Webpack already owns. Production parity matters: CI build time, bundle analyzer support, and how you inject env at build time. Trade-off: Webpack config debt versus Vite’s simpler defaults. Failure mode: switching tools mid-release without validating tree-shaking and CSS code-splitting, then shipping a larger or broken bundle that only shows up under real traffic.

**Follow-up:**

What production check would you run after migrating bundlers?

Answer: Compare main-route JS size, critical CSS, and a smoke test of dynamic `import()` chunks before and after the migration on the same commit.

### REACT-453 — Tree-shaking pitfalls

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

Why might tree-shaking fail to drop unused library code from a React production bundle?

**Answer:**

Tree-shaking needs ESM with side-effect-free modules and static imports. Common failures: importing a barrel file that re-exports everything, libraries marked with `"sideEffects": true`, or using CommonJS `require`. Lodash full imports versus `lodash-es` is a classic. Result is a fat vendor chunk. Mechanism: the bundler cannot prove a module is unused if side effects might run. Trade-off: convenience of barrels versus smaller ships. Failure mode: assuming `import { x }` always shakes when the package’s entry re-exports everything and declares side effects, so production still carries dead code.

**Follow-up:**

How do you confirm a package is actually shaken out?

Answer: Inspect the production bundle or analyzer for that package’s symbols; if they appear, fix the import path or package `sideEffects` config.

### REACT-454 — Code-splitting strategy

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

How do you decide what to code-split in a production React app?

**Answer:**

Split by route first—each major page becomes a dynamic `import()` so the initial shell stays small. Then split heavy, rarely used UI: admin panels, editors, charts. Keep above-the-fold critical path in the main chunk. Measure with a bundle analyzer and real LCP, not gut feel alone. Prefer prefetch for likely next routes so the split does not feel laggy. Trade-off: more network round-trips and Suspense flashes versus a smaller first load. Failure mode: over-splitting tiny components, adding waterfalls, or splitting something on the critical path so LCP gets worse after “optimization.”

**Follow-up:**

Where should shared vendor code land?

Answer: Prefer one stable vendor chunk for large shared deps so browsers cache it across routes, without forcing every page to download unused libraries.

### REACT-455 — Bundle budgets

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

What is a JS bundle budget and how do you enforce it in CI for React?

**Answer:**

A budget is a hard or soft ceiling on JS (and often CSS) size for key routes—for example 170 KB gzipped for the main entry. You set it from product goals and device baselines, then fail CI when the production build exceeds it. Tools like bundlesize, size-limit, or Lighthouse CI compare artifacts. Result: regressions get caught before merge. Trade-off: budgets that are too tight block needed features; too loose ignore bloat. Failure mode: budgeting uncompressed size or ignoring lazy chunks that still load on the critical path and hurt real users.

**Follow-up:**

Should budgets be per-route or only global?

Answer: Per critical route is better—global totals hide a single page that pulls a huge optional dependency into first paint.

### REACT-456 — Analyzing production bundles

**Difficulty:** Junior

**Category:** build & ship

**Question:**

How do you analyze what is inside a React production bundle?

**Answer:**

Generate a production build, then open a treemap with `rollup-plugin-visualizer`, Webpack Bundle Analyzer, or `source-map-explorer`. Look for unexpected large packages, duplicated versions, and giant icon or locale files. Start from the biggest leaf and ask if that code is needed on first load or can be lazy. Share the report in the PR when size jumps. Trade-off: analysis slows CI if run always; often gate it on main or weekly. Failure mode: analyzing a development build, which includes HMR and unminified code and lies about production size.

**Follow-up:**

What duplicate dependency pattern should you watch for?

Answer: Two major versions of the same library (for example React or date-fns) pulled by different packages, which doubles weight until you align versions.

### REACT-457 — Source maps in production

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

Should you ship public source maps with a production React app?

**Answer:**

Prefer hidden or private maps: upload maps to your error tracker (Sentry, etc.) and omit them from the public CDN, or use `hidden-source-map` so the browser does not fetch them but the server can. Public maps help debugging but expose original source and comments to anyone. Result: readable stack traces for your team without giving competitors a free repo dump. Trade-off: slightly harder local reproduction of minified bugs for outsiders. Failure mode: leaving `*.map` publicly downloadable next to every chunk after a “temporary” debug deploy that never got cleaned up.

**Follow-up:**

What does a hidden source map achieve?

Answer: The build embeds a sourceMappingURL that tools can use server-side, but browsers are not guided to fetch the map file from your public origin.

### REACT-458 — Env vars: NEXT_PUBLIC_ and VITE_

**Difficulty:** Junior

**Category:** build & ship

**Question:**

Why must client-exposed env vars use `NEXT_PUBLIC_` or `VITE_` prefixes, and what is the risk?

**Answer:**

Bundlers only inline env vars that are explicitly prefixed for the client, so server secrets stay out of the browser bundle by default. Anything `NEXT_PUBLIC_*` or `VITE_*` is embedded at build time and visible to anyone who downloads the JS. Result: safe defaults for API keys that must be public; never put DB passwords or private API keys there. Trade-off: rebuild required when those values change across environments. Failure mode: naming a secret `NEXT_PUBLIC_SECRET` and thinking the prefix is just convention—it ships to every user immediately.

**Follow-up:**

When do client env values get fixed?

Answer: At build time for typical Vite/Next client bundles, so changing host env without rebuilding will not update already shipped JS.

### REACT-459 — Feature flags: edge vs client

**Difficulty:** Senior

**Category:** build & ship

**Question:**

When should feature flags be evaluated at the edge versus only on the client in a React/Next app?

**Answer:**

Evaluate at the edge or server when the flag changes HTML structure, SEO content, or must prevent shipping dead UI code for a cohort. Client-only flags are fine for post-hydration experiments that do not affect first paint critically. Edge evaluation avoids a flash of the wrong variant and can gate whole routes before JS runs. Trade-off: edge config complexity and cache keying by cohort. Failure mode: client flag flips after paint, causing layout shift, wrong analytics attribution, or briefly exposing an unfinished feature to everyone who loads the shell.

**Follow-up:**

How do flags interact with CDN caching?

Answer: If HTML varies by flag, the cache key or cookie must include the cohort; otherwise users get another cohort’s cached page.

### REACT-460 — Error Boundaries vs route error.tsx

**Difficulty:** Intermediate

**Category:** runtime reliability

**Question:**

How do React Error Boundaries differ from Next.js App Router `error.tsx`, and when do you use each?

**Answer:**

Error Boundaries are React components that catch render errors in their child tree and show fallback UI. In App Router, `error.tsx` is a special boundary for a route segment, with a reset affordance; `global-error.tsx` covers the root. Use nested `error.tsx` for recoverable segment failures and local Boundaries for widgets that should fail independently—charts, embeds. Neither catches event-handler or async errors outside render. Trade-off: too many boundaries fragment UX; too few take down whole pages. Failure mode: assuming Boundaries catch `useEffect` fetch failures without extra handling and logging.

**Follow-up:**

What errors do Error Boundaries never catch?

Answer: Errors in event handlers, asynchronous code outside render, and server-side issues outside the client boundary’s scope—you handle those separately.

### REACT-461 — Logging client errors safely

**Difficulty:** Intermediate

**Category:** runtime reliability

**Question:**

What should you avoid sending when logging client-side React errors to a backend?

**Answer:**

Do not send passwords, tokens, full form PII, payment fields, or raw localStorage dumps. Prefer error message, stack (scrubbed), release version, route, and non-identifying context like feature flag cohort. Redact emails and IDs unless policy allows retention. Result: useful ops signal without a privacy incident. Mechanism: centralize a logger that strips known sensitive keys before network send. Trade-off: less context can slow debugging. Failure mode: serializing the whole Redux or Zustand store into the error payload “just in case,” then leaking session data.

**Follow-up:**

Why attach a release version to every client error?

Answer: So you can tell whether a spike is from the new deploy and compare against source maps for that exact build.

### REACT-462 — Hydration mismatch diagnosis

**Difficulty:** Senior

**Category:** runtime reliability

**Question:**

How do you diagnose a React hydration mismatch in production?

**Answer:**

In prod you often see a warning in logs or a flash of wrong content, then a client re-render. Compare server HTML to first client render: look for `Date.now()`, `Math.random()`, locale-dependent formatting, `window` checks that change markup, or invalid HTML nesting. Repro with the same locale and timezone as the user cohort that reports it. Result: identify the divergent node quickly. Trade-off: suppressing mismatches hides real bugs. Failure mode: wrapping everything in `suppressHydrationWarning` or rendering only after mount without understanding SEO and CLS cost for public pages.

**Follow-up:**

Why can browser extensions cause false hydration noise?

Answer: They mutate the DOM before React hydrates, so the client tree no longer matches server HTML even when your app is correct.

### REACT-463 — Suspense fallback UX in production

**Difficulty:** Intermediate

**Category:** runtime reliability

**Question:**

What makes a good Suspense fallback UX for production React apps?

**Answer:**

Fallbacks should preserve layout shape to limit CLS—skeletons matching final dimensions beat spinners in empty voids. Keep them short-lived via prefetch and caching; avoid nested fallbacks that cascade blank screens down the tree. For route transitions, a top progress indicator plus stable chrome works better than replacing the whole shell. Design an error path when data never arrives. Trade-off: detailed skeletons cost design work and can feel fake if stuck. Failure mode: a full-page spinner on every navigation that trains users to think the app is down.

**Follow-up:**

How do you avoid Suspense waterfalls?

Answer: Start fetches earlier (router prefetch, parent loaders) so child Suspense boundaries resolve without sequential round-trips.

### REACT-464 — Offline and PWA lightly

**Difficulty:** Junior

**Category:** runtime reliability

**Question:**

When is a light PWA or offline shell worth it for a React product app?

**Answer:**

Worth it when users expect revisit speed or brief offline read—internal tools on flaky networks, content readers. Keep scope light: precache the app shell and critical static assets, not a full offline data sync unless product truly needs it. Service workers add update and cache-invalidation complexity you must own. Trade-off: stale shell after deploys if `skipWaiting` and cache versioning are wrong. Failure mode: aggressive caching of HTML that traps users on a broken old deploy until they hard-refresh or clear site data.

**Follow-up:**

What is the first offline feature you would ship?

Answer: A versioned app-shell precache with a clear “new version available” reload path, before attempting offline mutations.

### REACT-465 — Core Web Vitals overview

**Difficulty:** Junior

**Category:** performance ops

**Question:**

Which Core Web Vitals matter for a React app in production, and what does each roughly measure?

**Answer:**

LCP measures how quickly the largest contentful paint appears—often hero image or main heading. INP measures responsiveness to user input across the page lifetime. CLS measures unexpected layout shift. Together they capture load feel, interaction feel, and visual stability for real users. React apps often hurt LCP with huge JS before paint, INP with long main-thread work, and CLS with late fonts or ads. Trade-off: optimizing one metric can worsen another if you defer the wrong work. Failure mode: chasing lab scores while field users on mid-tier mobiles still suffer badly.

**Follow-up:**

What typically dominates LCP on a React marketing page?

Answer: The hero image or primary text block—optimize that asset and avoid blocking it behind a large JS boot.

### REACT-466 — RUM vs lab performance

**Difficulty:** Senior

**Category:** performance ops

**Question:**

How do RUM and lab tests differ for React performance, and how do you use both?

**Answer:**

Lab tools (Lighthouse, WebPageTest) give controlled, repeatable scores on a fixed device and network—great for CI budgets and PR gates. RUM collects real user timings with variety in devices, caches, and geography—truth for SLOs. Ship both: fail PRs on lab regressions, watch RUM percentiles after release before calling it done. Trade-off: lab can miss third-party variance; RUM is noisy and needs careful sampling and bot filters. Failure mode: celebrating a green Lighthouse while p75 INP in the field is red for your actual audience.

**Follow-up:**

Which percentile would you track for an SLO?

Answer: Often p75 for Core Web Vitals alignment, with p95 watched for tail pain on key journeys.

### REACT-467 — Image CDN and srcset

**Difficulty:** Junior

**Category:** performance ops

**Question:**

How do image CDNs and `srcset` help React production LCP?

**Answer:**

Serve responsive images from a CDN with automatic format (WebP/AVIF), resizing, and edge caching close to users. Use `srcset` and `sizes` so the browser downloads a width appropriate to the layout, not a desktop hero on mobile. In Next, `next/image` wires much of this when configured. Result: smaller bytes and faster LCP on the critical image. Trade-off: CDN cost and complexity of art direction. Failure mode: a single 4000px PNG in `img src` with no dimensions, crushing LCP and causing CLS when it finally loads.

**Follow-up:**

Why set width and height (or aspect-ratio) on images?

Answer: So the browser reserves space before the image loads and CLS stays low when the image arrives.

### REACT-468 — Font loading in production

**Difficulty:** Intermediate

**Category:** performance ops

**Question:**

How should you load web fonts in a production React app to protect CLS and text visibility?

**Answer:**

Self-host or use a reliable CDN, subset weights you actually use, and prefer `font-display: swap` or optional with a close fallback metrics match. Preload the critical woff2 for above-the-fold text. Avoid loading five families on first paint. Result: text appears quickly without huge late shifts that tank CLS. Trade-off: swap can still shift if fallback metrics differ a lot from the final face. Failure mode: `@import` from CSS that blocks rendering, or FOIT that leaves blank text for seconds on slow networks.

**Follow-up:**

What does size-adjust on fallback fonts help with?

Answer: It tunes fallback metrics closer to the web font so when the real font swaps in, layout barely moves.

### REACT-469 — Third-party script cost

**Difficulty:** Senior

**Category:** performance ops

**Question:**

How do you manage third-party scripts in a production React frontend?

**Answer:**

Treat each tag as a product decision: measure main-thread and network cost with RUM and coverage tools before and after. Load non-critical scripts after interaction or via Partytown/worker patterns when appropriate; use async/defer correctly. Prefer server-side or tag-manager governance with named owners and a kill switch. Result: fewer INP regressions from tag soup on marketing pages. Trade-off: marketing and analytics may push back on delays. Failure mode: injecting three competing analytics SDKs in the root layout with no budget, owner, or way to disable them fast.

**Follow-up:**

What is a practical kill switch for a bad third party?

Answer: A remote feature flag or tag-manager pause that stops loading the script without requiring a full frontend redeploy.

### REACT-470 — React Profiler in production builds

**Difficulty:** Senior

**Category:** performance ops

**Question:**

Can you use the React Profiler in production, and what are the cautions?

**Answer:**

Production builds can include profiling via a special React build or the Profiler API with `onRender`, but it adds overhead and must be sampled carefully for short windows. Prefer temporary profiling builds or brief sessions for suspected regressions, not always-on for every user. Browser React DevTools profiling stays for local and staging. Trade-off: visibility versus CPU and bundle cost on real devices. Failure mode: shipping the profiling React build to all users permanently, slowing INP while you forget it was enabled for “just one week” of investigation.

**Follow-up:**

What does the Profiler `onRender` callback give you?

Answer: Timing for a subtree’s render commit—id, phase, actualDuration—so you can sample expensive screens without DevTools attached.

### REACT-471 — XSS via dangerouslySetInnerHTML

**Difficulty:** Intermediate

**Category:** security client

**Question:**

Why is `dangerouslySetInnerHTML` risky in production React, and how do you use it safely if you must?

**Answer:**

It injects raw HTML, bypassing React’s usual text escaping, so unsanitized user or CMS content becomes XSS in the browser. If you must render HTML, sanitize with a maintained library on a strict allowlist, prefer server-side sanitization, and never concatenate untrusted strings into the HTML. Pair with CSP as defense in depth. Result: rich content without script execution. Trade-off: sanitizers can strip needed markup or miss novel vectors if misconfigured. Failure mode: “trusting” CMS authors or only filtering `<script>` tags while leaving `onerror` attributes intact.

**Follow-up:**

Is Markdown rendering automatically safe?

Answer: No—Markdown-to-HTML pipelines still need sanitization because raw HTML or dangerous links can pass through converters.

### REACT-472 — CSP nonces with Next.js

**Difficulty:** Senior

**Category:** security client

**Question:**

How do Content Security Policy nonces help a Next.js React app in production?

**Answer:**

A CSP can block inline scripts and unexpected origins. Nonces (or hashes) allow specific inline bootstraps Next needs while denying attacker-injected scripts. You generate a per-request nonce, set it on the CSP header, and pass it to allowed script tags through the framework’s hooks. Result: defense in depth against XSS that escapes sanitization. Trade-off: harder local debugging and careful middleware plumbing across environments. Failure mode: `'unsafe-inline'` for convenience, which largely defeats script CSP, or a static nonce reused across users and requests.

**Follow-up:**

Why must nonces be per-request?

Answer: A fixed nonce becomes a secret anyone can reuse in injected markup; rotating per response keeps allowed inline scripts tightly scoped.

### REACT-473 — Storing tokens: memory vs cookie

**Difficulty:** Senior

**Category:** security client

**Question:**

Where should a React SPA store auth tokens in production, and what are the trade-offs?

**Answer:**

Memory (in-app state) reduces persistence XSS theft after refresh but forces silent re-auth or refresh flows. HttpOnly Secure SameSite cookies keep tokens off `document.cookie` and pair well with BFF patterns, though CSRF must be handled deliberately. localStorage is convenient and commonly stolen via XSS. Prefer cookies plus backend session, or short-lived access tokens in memory with rotating refresh. Trade-off: SPA purity versus security posture. Failure mode: long-lived JWTs in localStorage with a single XSS becoming full account takeover across devices.

**Follow-up:**

Why are HttpOnly cookies resistant to XSS token theft?

Answer: JavaScript cannot read HttpOnly cookies, so injected scripts cannot exfiltrate the token via `document.cookie`.

### REACT-474 — Open redirects in client routers

**Difficulty:** Intermediate

**Category:** security client

**Question:**

How can client-side React routers create open redirect risks?

**Answer:**

If you redirect to a `next` or `returnUrl` query param without validating it is a relative path on your origin, attackers craft login links that send users to phishing sites after auth looks legitimate. Always allowlist paths, reject `//evil.com`, and prefer route names over raw URLs. Log rejected redirects for abuse detection. Result: post-login navigation stays on your app. Trade-off: slightly more redirect helper code. Failure mode: `window.location = params.next` because “the router will handle it”—browsers will happily leave your origin.

**Follow-up:**

What is a safe validation rule for return URLs?

Answer: Accept only paths starting with a single `/` and not `//`, or map against a fixed set of named internal routes.

### REACT-475 — Canary UI with feature flags

**Difficulty:** Intermediate

**Category:** releases

**Question:**

How do you use feature flags for a canary React UI release?

**Answer:**

Ship the code dark, enable the flag for a small percentage or internal cohort, watch errors and Core Web Vitals, then ramp gradually with clear stop criteria. Flags let you decouple deploy from release so binary risk and product risk separate. Keep flag checks near the feature edge and clean up old flags after full rollout. Trade-off: flag debt and combinatorial testing. Failure mode: a flag that only hides a button while still mounting buggy providers that break the whole app for everyone regardless of cohort.

**Follow-up:**

What metric would gate a ramp from 5% to 50%?

Answer: Error rate and p75 INP/LCP for the flagged cohort versus control, plus any critical business conversion guardrail.

### REACT-476 — Gradual rollouts for frontend

**Difficulty:** Senior

**Category:** releases

**Question:**

Beyond flags, how do you gradually roll out a React frontend deploy?

**Answer:**

Use CDN or platform weighted traffic across two artifact versions, or sticky canaries by region or cell. Combine with health checks on client error rates tagged by release version. Gradual rollout limits blast radius when HTML and JS are immutable per version. Keep APIs backward compatible while two fronts live. Trade-off: two versions live longer, so contracts must stay dual-safe. Failure mode: rolling JS but caching HTML that points at deleted chunks, producing white screens for a subset of users who cannot recover without hard refresh.

**Follow-up:**

Why must HTML and asset versions stay coherent?

Answer: Old HTML referencing new hashed chunks—or the reverse—causes 404s for JS/CSS and breaks the app until cache expires.

### REACT-477 — Rolling back a bad frontend deploy

**Difficulty:** Intermediate

**Category:** releases

**Question:**

How do you roll back a bad React production deploy quickly?

**Answer:**

Prefer re-promoting the previous known-good artifact on the CDN or host (Vercel/Netlify previous deployment) rather than “hotfix forward” under panic. Invalidate or version HTML so clients fetch the old entry quickly. Keep feature flags as a first brake when the binary is fine but a flag went wrong. Practice the runbook before you need it. Trade-off: rollback may reintroduce recently fixed bugs. Failure mode: only reverting Git without waiting for CDN cache and service-worker caches to release the bad shell.

**Follow-up:**

What should be in your rollback runbook?

Answer: Who can promote previous deploy, how to purge HTML cache, how to disable the flag, and how to verify error rates drop.

### REACT-478 — Cache busting and CDN

**Difficulty:** Junior

**Category:** releases

**Question:**

How does cache busting work for React static assets on a CDN?

**Answer:**

Production bundlers emit content-hashed filenames (`app.abc123.js`). You set long-lived cache headers on those files and short or no-cache on `index.html` or the document that references them. After deploy, HTML points at new hashes, so browsers fetch fresh JS without renaming manually or guessing versions. Trade-off: many old assets linger until TTL or manual purge, which costs storage. Failure mode: caching HTML for a week so users keep loading deleted chunk names after a deploy and see a blank page.

**Follow-up:**

Should you purge all CDN assets on every deploy?

Answer: Usually no—purge or revalidate HTML/entry documents; hashed assets can expire naturally unless storage cost demands cleanup.

### REACT-479 — Preview deployments

**Difficulty:** Junior

**Category:** releases

**Question:**

Why are preview deployments valuable for React/Next production workflows?

**Answer:**

Every PR gets an isolated URL with production-like build settings so designers and QA review real CSS, routing, and data wiring before merge. You catch hydration issues and env mistakes early, when fixing is cheap. Protect previews with auth so draft features are not indexed or public. Trade-off: cost and the need for preview-specific env and data seeding. Failure mode: treating a preview pointed at production data as safe, then leaking PII or mutating live records from a PR link.

**Follow-up:**

What should previews never share with production?

Answer: Write access to production databases and secrets that can affect live users; use ephemeral or sanitized datasets.

### REACT-480 — Correlating frontend and backend spans

**Difficulty:** Senior

**Category:** observability

**Question:**

How do you correlate a React client span with backend traces in production?

**Answer:**

Propagate W3C `traceparent` (or your vendor’s header) from the browser fetch or XHR into API requests so the APM stitches one distributed trace. Tag the UI with `service=web` and release version for filtering. Sample carefully to control cost while keeping enough signal for incidents. Result: one click shows which API or DB call slowed the button handler. Trade-off: header propagation and privacy review for identifiers. Failure mode: only logging disconnected frontend timestamps with no shared trace id, so on-call guesses under pressure during a latency incident.

**Follow-up:**

What breaks correlation across origins?

Answer: Missing CORS exposure of tracing headers or a gateway that strips `traceparent` before it reaches the service.

### REACT-481 — Session replay ethics and PII

**Difficulty:** Senior

**Category:** observability

**Question:**

What privacy concerns come with session replay on a React app, and how do you mitigate them?

**Answer:**

Replay can capture keystrokes, DOM text, and screens with PII—health, finance, messages—creating a compliance and trust risk. Mask inputs by default, block sensitive routes, obtain consent where required, and limit retention windows. Prefer sampling over 100% capture and restrict who can watch. Result: enough UX debugging without becoming a surveillance store. Trade-off: masked replays are harder to diagnose. Failure mode: enabling full replay on checkout and password fields because “we’ll remember to exclude them later,” then discovering the data already stored.

**Follow-up:**

What is a safe default for input masking?

Answer: Mask all input values and known PII text nodes by default, then unmask only low-risk fields explicitly approved by security.

### REACT-482 — Versioned release markers

**Difficulty:** Intermediate

**Category:** observability

**Question:**

Why should every production React build emit a release version marker?

**Answer:**

Tag errors, RUM beacons, and logs with a git SHA or semver so spikes map cleanly to a deploy. Error trackers use the same release to select matching source maps for readable stacks. Annotate dashboards when a version goes live so timelines align with change. Result: faster “did we cause this?” answers during incidents. Trade-off: build pipeline must inject the version reliably across environments. Failure mode: all environments reporting `version=unknown`, so you cannot tell canary from stable in the same error chart when paging.

**Follow-up:**

Where do you inject the release string?

Answer: At build time into a compile-time constant or `window` bootstrap, then attach it in the logger and analytics init.

### REACT-483 — Shipping locales

**Difficulty:** Junior

**Category:** accessibility & i18n ops

**Question:**

How do you ship multiple locales for a React app without bloating the main bundle?

**Answer:**

Load locale message catalogs asynchronously per language, keep the default locale lean, and avoid bundling every translation into the entry chunk. Detect locale from URL, cookie, or `Accept-Language` with a clear fallback chain. Cache catalogs aggressively after first load. Result: French users download French strings, not twenty languages upfront. Trade-off: a brief fallback flash if the catalog loads late on first visit. Failure mode: importing a mega JSON of all locales in `main.tsx`, inflating everyone’s first load for no reason.

**Follow-up:**

Why put locale in the URL for public sites?

Answer: Shareable links, clearer CDN caching, and better SEO than only storing language in localStorage.

### REACT-484 — a11y checks in production ops

**Difficulty:** Junior

**Category:** accessibility & i18n ops

**Question:**

Besides CI axe runs covered elsewhere, what accessibility ops matter once a React app is live?

**Answer:**

Monitor real user feedback and support tickets for keyboard and screen-reader issues, spot-check critical journeys after redesigns, and watch for CLS that harms zoom and focus. Keep a fast path to fix regressions in shared components that power many screens. Production is where third-party widgets often break accessibility quietly after a vendor update. Trade-off: you cannot automate every assistive-technology combination. Failure mode: assuming green CI means the live checkout with a new payment iframe is still usable from the keyboard alone.

**Follow-up:**

What is one production signal of an a11y regression?

Answer: A sudden rise in “cannot submit” support tickets from keyboard-only users after a UI library upgrade.

### REACT-485 — Multi-brand theming in production

**Difficulty:** Intermediate

**Category:** design system versioning

**Question:**

How do you run multi-brand React UIs in production without forking the app?

**Answer:**

Centralize tokens—color, type, spacing—as CSS variables or theme packages selected by host, path, or tenant config at boot. Share one component library; swap tokens and brand assets rather than copying screens. Validate contrast and focus styles per brand before launch. Document which props are brand-safe versus layout-structural. Trade-off: more QA matrix across brands on each release. Failure mode: hard-coded brand colors inside feature components, so a new brand requires hunting magic strings through the tree and shipping uneven UI.

**Follow-up:**

When do you need separate deploys per brand?

Answer: When legal isolation, release cadence, or completely different feature sets outweigh the cost of one configurable codebase.

### REACT-486 — Design-system versioning

**Difficulty:** Senior

**Category:** design system versioning

**Question:**

How should a React design system be versioned for production consumers?

**Answer:**

Use semver: breaking visual or API changes bump major; additive components minor; fixes patch. Publish changelogs and codemods for majors so app teams can migrate with less fear. Apps pin versions and upgrade intentionally in their own release trains. Result: predictable breakage instead of surprise Monday outages. Trade-off: multiple majors living across a monorepo of apps for a while. Failure mode: always publishing under `latest` with silent breaking CSS that shifts layout across every product overnight without anyone pinning a stable version.

**Follow-up:**

Why might you dual-publish styles and components?

Answer: So teams can adopt token fixes without immediately taking component API breaks, reducing forced big-bang upgrades.

### REACT-487 — Monorepo UI package publish

**Difficulty:** Intermediate

**Category:** design system versioning

**Question:**

What matters when publishing a React UI package from a monorepo to production apps?

**Answer:**

Build a clean dist with proper `exports`, peerDependency on React to avoid duplicate Reacts, and a stable CSS strategy consumers understand. Use changesets or similar for version bumps and release notes. Consume via private registry or workspace links in monorepo apps, but still verify the published tarball. Trade-off: local workspace speed versus verifying the published artifact matches what outsiders install. Failure mode: shipping TypeScript source as main without compiling, or bundling React into the library and breaking hooks at runtime in the host.

**Follow-up:**

Why list React as a peerDependency?

Answer: So the host app provides a single React instance; bundling React inside the library often causes invalid hook call errors.

### REACT-488 — SPA vs SSR/edge decision

**Difficulty:** Staff

**Category:** staff architecture

**Question:**

When should a staff engineer keep a React SPA versus moving to SSR or edge rendering?

**Answer:**

Keep a SPA when the product is authenticated, SEO-light, and highly interactive after one shell load—internal tools, dashboards. Move to SSR or edge when first content must be fast for anonymous users, SEO matters, or personalization at the edge beats a blank client boot. Cost includes hosting model, caching complexity, and team skills you must staff. Trade-off: SPA simplicity versus TTFB, LCP, and shareability. Failure mode: rewriting to SSR for fashion while the real pain is a 2 MB client bundle you never budgeted or measured in the field.

**Follow-up:**

What evidence would justify SSR for an existing SPA?

Answer: Field LCP/SEO losses on public landing routes that stay poor after code-splitting and image work, with clear revenue or acquisition impact.

### REACT-489 — Cost of client state libraries in prod

**Difficulty:** Staff

**Category:** staff architecture

**Question:**

As a staff engineer, how do you evaluate the production cost of client state libraries in React?

**Answer:**

Count bytes, re-render blast radius, persistence bugs, and onboarding cost—not just developer experience in demos. Measure whether global stores increase INP on hot paths under production data sizes. Prefer server truth and URL state when possible; keep client stores for genuine ephemeral UI. Result: fewer mysterious sync bugs and smaller bundles over time. Trade-off: rejecting a library your team loves needs a clear alternative path. Failure mode: stacking Redux, React Query cache, and ad-hoc Context for the same entities, tripling complexity and memory without ownership.

**Follow-up:**

What production symptom suggests state library sprawl?

Answer: Duplicate network calls and UI that disagrees with itself after mutations because two caches own the same resource.

### REACT-490 — Owning a frontend SLO

**Difficulty:** Staff

**Category:** staff architecture

**Question:**

What does it mean to own a frontend SLO for a React product?

**Answer:**

You define measurable targets—availability of key journeys, p75 LCP and INP, JS error rate per release—and accept pages when error budget is burned. Ownership means dashboards, alerts, release freezes, and capacity to fix rather than only report. Tie SLOs to user journeys like “checkout can complete,” not vanity uptime of the CDN alone. Trade-off: tight SLOs create toil; loose ones hide pain. Failure mode: an SLO nobody checks, or one that alerts on bot traffic and trains the team to ignore every page.

**Follow-up:**

Give an example frontend SLO statement.

Answer: 99% of checkout page views achieve LCP under 2.5s and fewer than 0.1% unhandled JS errors per session, measured weekly in RUM.

### REACT-491 — Production React.StrictMode behavior

**Difficulty:** Intermediate

**Category:** runtime reliability

**Question:**

Does `React.StrictMode` affect production builds, and why does that matter?

**Answer:**

StrictMode’s double-invoking of render and effects is a development-only check; production builds do not double-invoke those lifecycles. That means bugs that only appear because effects were assumed to run once may still exist but without the noisy double mount signal. Use StrictMode in development to find impure renders and missing cleanups early. Trade-off: some libraries complain in StrictMode and teams disable it, losing the signal. Failure mode: “it works in prod so StrictMode warnings are false”—often the opposite for subscription leaks that accumulate slowly.

**Follow-up:**

Why might an effect look fine in production but warn in StrictMode?

Answer: Because StrictMode mounts, cleans up, and remounts in development to prove your cleanup is correct; production mounts once.

### REACT-492 — Public path and asset base URLs

**Difficulty:** Intermediate

**Category:** build & ship

**Question:**

Why do production React deploys break when hosted under a subpath, and how do you fix it?

**Answer:**

Asset URLs and client router basenames assume `/` by default. Under `/app/`, JS and CSS requests hit the wrong absolute paths and the router mismatches deep links. Set Vite `base`, Webpack `publicPath`, and the router `basename` consistently, and make sure the server serves `index.html` for nested routes. Document the base per environment. Trade-off: environment-specific bases complicate one artifact for many hosts. Failure mode: fixing only the bundler base but leaving React Router at `/`, so assets load while in-app links 404.

**Follow-up:**

How do relative asset bases help multiple hosts?

Answer: A relative base can let one build run under different subpaths when the HTML is always served from the correct folder depth.

### REACT-493 — Long tasks and INP in React UIs

**Difficulty:** Senior

**Category:** performance ops

**Question:**

How do long tasks on the main thread hurt INP in production React apps, and what do you do?

**Answer:**

INP suffers when click handlers or heavy renders block input for hundreds of milliseconds on real devices. Profile with the Performance panel, split work with `startTransition`, defer non-urgent updates, virtualize huge lists, and move pure computation off-thread when warranted. Result: buttons feel instant even if secondary data continues loading. Trade-off: transitions add pending UI states you must design for. Failure mode: JSON-parsing a huge payload synchronously in a click handler on every filter keystroke, freezing the UI for mid-tier phones.

**Follow-up:**

When is `startTransition` the wrong tool?

Answer: When the update is truly urgent user feedback—typing into an input—where deferring the value itself feels broken.

### REACT-494 — CDN HTML caching with React SPAs

**Difficulty:** Senior

**Category:** releases

**Question:**

How should HTML be cached for a React SPA behind a CDN?

**Answer:**

Cache hashed assets forever; keep the document short-lived or use stale-while-revalidate with careful purge on deploy. HTML is the pointer to current chunk names, so it must move with releases. For authenticated apps, often bypass CDN cache for HTML entirely. Automate purge as part of the deploy pipeline. Trade-off: more origin hits for HTML versus risk of stale shells. Failure mode: caching `index.html` for 24 hours while deploying breaking chunk renames, trapping users on a dead app until TTL ends.

**Follow-up:**

What header pair is common for hashed JS?

Answer: `Cache-Control: public, max-age=31536000, immutable` so browsers reuse the exact content-addressed file confidently.

### REACT-495 — Client error budgets and release health

**Difficulty:** Staff

**Category:** observability

**Question:**

How would you define an error budget for a React frontend release?

**Answer:**

Set a baseline crash-free session or error rate for critical pages, allocate a budget for new releases, and halt ramps when burn is too fast against that budget. Combine with performance budgets so a “stable but unusable” release still fails gates. Automate compare of canary versus baseline by release tag. Trade-off: noisy errors from extensions can burn budget if unfiltered. Failure mode: counting every console warning as an error, or ignoring errors that only hit the checkout route while homepage looks healthy.

**Follow-up:**

How do you reduce extension noise in error budgets?

Answer: Filter known third-party stacks, require app-owned frames, and sample by release rather than treating every script error as yours.

### REACT-496 — Dependency upgrade risk in production React

**Difficulty:** Senior

**Category:** build & ship

**Question:**

How do you safely upgrade React or major UI dependencies in production?

**Answer:**

Read breaking changes, run the production build, exercise critical journeys in preview, compare bundle size, and canary the upgrade behind a flag or staged rollout with RUM watch. Pin lockfiles and prefer one React version across the monorepo to avoid duplicates. Schedule upgrades deliberately, not as drive-by bumps. Trade-off: staying current versus change risk on a busy release week. Failure mode: jumping multiple majors at once on Friday without RUM watch, then discovering peer dependency duplicates only after users report blank screens.

**Follow-up:**

Why check for duplicate React after upgrades?

Answer: Nested packages may still resolve an old React, breaking hooks; dedupe and peer ranges must leave a single copy.

### REACT-497 — Monitoring hydration and client boot time

**Difficulty:** Senior

**Category:** performance ops

**Question:**

What production metrics help you monitor React boot and hydration cost?

**Answer:**

Track time to first meaningful client render, hydration duration if exposed, total JS bytes for the route, long-task count during boot, and LCP plus INP for the same sessions. Mark `performance.mark` around hydrate root when useful and export via RUM. Compare mobile p75 after deploys, not only desktop averages. Trade-off: custom marks need maintenance as the boot path changes. Failure mode: only watching server TTFB while a 1 MB JS boot dominates real user time-to-interactive feel after HTML arrives quickly.

**Follow-up:**

Why can TTFB look fine while users still complain?

Answer: The document arrived fast, but parsing and executing a large JS bundle delayed interaction and LCP of client-rendered content.

### REACT-498 — Secrets in frontend CI/CD

**Difficulty:** Intermediate

**Category:** security client

**Question:**

What frontend CI/CD secret mistakes hurt React production security?

**Answer:**

Baking private API keys into build logs or client env, printing `.env` in CI artifacts, and using the same secrets for preview and production are classic failures. Keep deploy credentials in the platform secret store, scope OIDC where possible, and treat `NEXT_PUBLIC_` and `VITE_` as public by definition. Rotate anything that might have leaked in a PR log. Trade-off: more careful env wiring across stages. Failure mode: a leaked preview URL that embeds production write credentials in the JS bundle for anyone who opens sources.

**Follow-up:**

How should previews authenticate to APIs?

Answer: Use ephemeral credentials or a mock/staging API with tight scopes, never production admin keys compiled into the client.

### REACT-499 — Feature flag cleanup as production hygiene

**Difficulty:** Intermediate

**Category:** releases

**Question:**

Why is feature-flag cleanup part of React production ownership?

**Answer:**

Stale flags add dead branches, inflate bundles, and create impossible test matrices that nobody fully understands. After full rollout, remove the flag and the old path in a follow-up PR within a fixed window. Track flag age and owners in the catalog. Result: clearer code and fewer “which world is prod?” incidents during outages. Trade-off: cleanup PRs feel low-glamour next to features. Failure mode: permanent flags that still default off for some users months later because nobody removed the check or the targeting rule.

**Follow-up:**

What process keeps flags from rotting?

Answer: Require an owner and expiry date on each flag, with automated tickets when the flag outlives its rollout window.

### REACT-500 — Production checklist mindset for React releases

**Difficulty:** Staff

**Category:** staff architecture

**Question:**

What staff-level checklist mindset do you want before a major React production release?

**Answer:**

Confirm bundle budgets, source-map upload, release version tagging, error and RUM dashboards, flag defaults, CDN and HTML cache plan, rollback owner, and accessibility smoke on critical paths. Decide blast radius: canary percentage and success criteria before you start the ramp. Result: releases are operations, not hope after merge. Trade-off: heavy process slows tiny fixes—scale the checklist to risk. Failure mode: shipping on Friday with no rollback rehearsal and discovering maps were never uploaded when errors spike overnight with no readable stacks.

**Follow-up:**

What is the one owner you always name before deploy?

Answer: The person empowered to roll back or disable the flag without waiting for a meeting once health signals trip.
