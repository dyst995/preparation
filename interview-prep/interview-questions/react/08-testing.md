# React testing

Questions REACT-351 through REACT-400. React 18 and later. Each answer is meant to be spoken out loud: what the idea is, how you apply it in a test, and why a team should care.

### REACT-351 — Testing the way a person uses the screen

**Difficulty:** Junior
**Category:** Testing philosophy

**Question:**
What does it mean to test a React component the way React Testing Library intends?

**Answer:**
React Testing Library is a set of helpers that render a component into a page and let you inspect it the way a person would. You look up buttons, links, and fields by their role or label, then click or type and read what the screen shows. The test describes the task, such as signing in or saving a name, rather than the state variable that stores it. That keeps the test useful when someone rewrites a hook or splits a component, as long as the visible behavior stays the same.

**Follow-up:**
Should a passing test survive a refactor that does not change the feature?

Answer: Yes. If the user can still finish the same task, the test should stay green. A failure that only means “we renamed state” is a test you will learn to ignore.

### REACT-352 — Leaving implementation details out of the test

**Difficulty:** Intermediate
**Category:** Testing philosophy

**Question:**
Why do senior engineers avoid asserting on state, props, or CSS class names when they test a React UI?

**Answer:**
An implementation detail is anything a user cannot see or operate, such as a `useState` name, a private function, or a generated class string. A test that reaches into those pieces locks the current design. The next person who moves logic into a hook, or switches a class to a different styling approach, has to edit the test even though the feature still works. Assert on the heading, the error text, or the enabled button instead. The test then fails when the product breaks, which is the signal you actually want.

**Follow-up:**
When is reading `container.firstChild` or a style class acceptable?

Answer: It is a last resort for something with no accessible handle, such as a purely visual canvas. Prefer a role or text query first, and leave a short comment explaining why the escape hatch is there.

### REACT-353 — render, screen, and the document

**Difficulty:** Junior
**Category:** Queries

**Question:**
What do `render` and `screen` give you, and why do most tests query through `screen`?

**Answer:**
`render` mounts the React tree into a DOM container and returns helpers such as `rerender` and `unmount`. `screen` is a set of queries already bound to the whole document, so you do not have to destructure them on every line. Querying from `screen` also sees content that React portals into `document.body`, which the local container can miss. After the test, the library unmounts the tree so the next test starts from an empty document. You end up writing assertions about the page, not about the object `render` returned.

**Code:**

```jsx
import { render, screen } from '@testing-library/react'

render(<SaveButton />)
expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
```

**Follow-up:**
What is `screen.debug()` for?

Answer: It prints the current DOM so you can see why a query missed. Use it while you are stuck, then remove it so CI logs stay readable.

### REACT-354 — getBy, queryBy, and findBy

**Difficulty:** Intermediate
**Category:** Queries

**Question:**
How do you choose among `getBy`, `queryBy`, and `findBy`?

**Answer:**
`getBy` looks once and throws if the element is missing or if several elements match. Use it when the node should already be on screen. `queryBy` looks once and returns null when nothing matches, which is how you assert that a message is absent. `findBy` retries for a short time and resolves when the element appears, which is how you wait for data, a lazy panel, or any update after a click. Picking the wrong one either fails too early or hides a real bug. The name of the query is part of the story the test tells.

**Follow-up:**
What is the difference between `getBy` and `getAllBy`?

Answer: `getBy` expects one match and throws if it finds several. `getAllBy` returns the full list so you can assert a count or inspect each row.

### REACT-355 — getByRole and the accessible name

**Difficulty:** Intermediate
**Category:** Queries

**Question:**
Why is `getByRole` the query React Testing Library wants you to reach for first?

**Answer:**
`getByRole` looks through the accessibility tree, the same information a browser exposes to assistive technology. A button has the button role, a text field has the textbox role, and a heading can be filtered by level. The `name` option matches the accessible name, which comes from the visible text, a label, or `aria-label`. If the query cannot find a name, a screen reader user is likely stuck as well. The test therefore checks behavior and a basic access contract in one step. You are not searching for a div that happens to look like a button.

**Code:**

```jsx
screen.getByRole('heading', { level: 1, name: 'Billing' })
screen.getByRole('button', { name: 'Pay now' })
```

**Follow-up:**
What does the `hidden` option change?

Answer: By default, role queries skip elements that are not exposed, such as a closed disclosure. Pass `{ hidden: true }` only when you intentionally need something that is in the accessibility tree as hidden.

### REACT-356 — Labels, text, placeholders, and test ids

**Difficulty:** Intermediate
**Category:** Queries

**Question:**
When should you use `getByLabelText`, `getByPlaceholderText`, `getByText`, or `getByTestId`?

**Answer:**
`getByLabelText` is the right query for a form control, because it uses the label a person sees and a screen reader announces. `getByPlaceholderText` is weaker: a placeholder disappears while typing and is a poor substitute for a label. `getByText` fits status messages, headings, and paragraphs that are not interactive controls. `getByTestId` finds a `data-testid` you invented. It still works if the copy changes, but it skips the accessibility check and can drift from anything a user would notice. Start with role and label, and add a test id only when no accessible query can express the element.

**Follow-up:**
How do you keep a test id from becoming the default?

Answer: Add one only at the edge, for a canvas, a map, or a third-party widget with no role. Review new test ids in code review the same way you would review a skipped lint rule.

### REACT-357 — Multiple matches and tighter queries

**Difficulty:** Intermediate
**Category:** Queries

**Question:**
What should you do when a query throws because it found more than one element?

**Answer:**
The library throws on purpose so you do not assert on a random match. Tighten the query with an accessible name, a heading level, or `getAllByRole` when you truly want the whole set. You can also scope the search with `within` so you look inside one row, dialog, or form. A regex or exact string helps when several nodes share a word. The fix belongs in the query, not in `container.querySelector`, because the query still documents how a person would tell those elements apart.

**Follow-up:**
How does the `exact` option change a text query?

Answer: Text queries are exact by default, so a substring will not match. Set `exact: false` or pass a regular expression when you only need part of a longer sentence.

### REACT-358 — Scoping with within

**Difficulty:** Junior
**Category:** Queries

**Question:**
How does `within` help when a page repeats the same controls?

**Answer:**
`within` takes an element you have already found and returns queries that search only inside it. A table of users might have an Edit button on every row. You find the row by the person’s name, then find Edit inside that row. The test reads like the action a person takes: locate the record, then press its button. Without that scope, `getByRole('button', { name: 'Edit' })` throws because many buttons share the name. Scoping also keeps the test from passing because some other Edit button on the page was enabled.

**Code:**

```jsx
import { within } from '@testing-library/react'

const row = screen.getByRole('row', { name: /ada lovelace/i })
expect(within(row).getByRole('button', { name: 'Edit' })).toBeEnabled()
```

**Follow-up:**
Can you nest `within` more than once?

Answer: Yes. You might enter a dialog, then a field group inside it. Each scope should match a region a person would point at.

### REACT-359 — userEvent and fireEvent

**Difficulty:** Intermediate
**Category:** User interaction

**Question:**
Why do teams prefer `userEvent` over `fireEvent` for clicks and typing?

**Answer:**
`fireEvent` dispatches the one DOM event you name. `userEvent` plays a fuller sequence: pointer movement, hover, focus, keydown, input, and keyup, in an order close to a real browser. A click on a disabled or covered control fails with `userEvent`, while `fireEvent.click` can still invoke the handler. Typing goes through each character, so a mask or an `onKeyDown` guard actually runs. The extra fidelity catches bugs that a single synthetic change event skips. Use `fireEvent` only when you must dispatch a low-level event the helper does not model.

**Code:**

```jsx
import userEvent from '@testing-library/user-event'

const user = userEvent.setup()
await user.click(screen.getByRole('button', { name: 'Save' }))
```

**Trade-offs:**
`userEvent` is asynchronous and a little slower, and older snippets that call `userEvent.click` without `setup()` are out of date. `fireEvent` stays useful for odd cases such as a specific `scroll` or `composition` event. For ordinary UI, the slower helper is the one that matches production.

**Follow-up:**
What happens if you forget to await `user.click`?

Answer: The test continues before React has processed the update, so the assertion flakes or you see an `act` warning. Always await each `userEvent` call.

### REACT-360 — setup, pointer checks, and delays

**Difficulty:** Intermediate
**Category:** User interaction

**Question:**
What does `userEvent.setup()` change, and why is the default delay there?

**Answer:**
`setup()` returns a user instance with shared options, such as `delay` between keystrokes or `advanceTimers` when you are on fake timers. The default delay mimics a person typing, which matters for inputs that react between characters. Pointer helpers also check that the element is visible and not blocked, so a test cannot click a control that is off-screen or sitting under a modal. Call `setup()` once per test and reuse that user. Sharing one global user across tests leaks options and makes failures harder to explain.

**Follow-up:**
When would you set `delay: null`?

Answer: Set it when you are on fake timers and you do not want keystroke delays, or when a long string makes the test slow. Keep the default delay if the component reacts between keystrokes.

### REACT-361 — Typing, clearing, and keyboard submission

**Difficulty:** Intermediate
**Category:** User interaction

**Question:**
How do you type into a field, clear it, and submit with the keyboard?

**Answer:**
Find the field by its label, then `await user.type(field, 'ada@example.com')`. `type` focuses the control and sends one character at a time, which updates a controlled input the same way a browser does. `user.clear` selects the current value and deletes it before you type a replacement. To submit, focus the button and `await user.keyboard('{Enter}')`, or press Enter while focus is still in a form that submits on Enter. These steps catch a handler that only listened to `onClick` on a non-focusable element. A single `fireEvent.change` would skip that bug.

**Follow-up:**
How do you choose an option in a `<select>`?

Answer: Use `await user.selectOptions(select, 'monthly')` with the option’s value or label. The helper sets the value and fires the change sequence the browser would fire.

### REACT-362 — findBy for UI that appears later

**Difficulty:** Intermediate
**Category:** Async testing

**Question:**
How do you assert on content that shows up after a request or a state update?

**Answer:**
`findBy` is the async form of `getBy`. It returns a promise, retries until the element is in the document, and fails if the timeout expires. You use it after rendering a component that fetches on mount, or after a click that opens a panel. The await also flushes React updates, so you usually do not wrap the call in `act` yourself. Pair it with a specific role and name so you wait for the real result, not for any text that happens to appear. The failure message tells you what the document contained when time ran out.

**Code:**

```jsx
render(<Profile id="1" />)
expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
```

**Follow-up:**
What timeout does `findBy` use, and when would you change it?

Answer: The default is about one second. Raise it for a known slow interaction, or lower it when a missing element should fail fast. Do not paper over a missing `await` with a huge timeout.

### REACT-363 — waitFor and waitForElementToBeRemoved

**Difficulty:** Intermediate
**Category:** Async testing

**Question:**
When do you use `waitFor` or `waitForElementToBeRemoved` instead of `findBy`?

**Answer:**
`findBy` waits until a query succeeds. `waitFor` retries an arbitrary assertion, such as “this button is enabled” or “this mock was called twice.” `waitForElementToBeRemoved` waits until a node that is already on screen goes away, which fits a loading message that should disappear. Prefer `findBy` when appearance is the whole story, because the call is shorter and the error points at the missing role. Reach for `waitFor` when the condition is not a simple query. Always wait on something the user can observe or on a mock you own, and keep the callback free of extra clicks.

**Follow-up:**
Why can a side effect inside `waitFor` cause a confusing failure?

Answer: The callback runs many times, so a click or a state change inside it repeats. Put the action before `waitFor`, and leave only the assertion inside.

### REACT-364 — Loading, success, and error on one component

**Difficulty:** Intermediate
**Category:** Async testing

**Question:**
How do you structure tests for a component that loads data, then shows success or an error?

**Answer:**
Give each outcome its own test so a failure points at one path. In the success test, mock a resolved payload and `findBy` the heading or row that only success renders. In the error test, mock a rejection or a 500 and `findBy` the alert. For the loading state, hold the promise open so the spinner stays visible, assert it, then resolve and wait until the spinner is gone. Asserting all three in one test hides which step broke and often races. The mock belongs at the network edge so the component still runs its real `useEffect` and render logic.

**Follow-up:**
How do you hold a fetch open so you can see the spinner?

Answer: Return a promise you control from the mock and do not resolve it until after the loading assertion. Then resolve it and wait for the finished UI.

### REACT-365 — Stubbing fetch

**Difficulty:** Intermediate
**Category:** Mocking

**Question:**
How do you stub `fetch` in a component test, and what do people usually forget?

**Answer:**
A fetch stub replaces `global.fetch` with a function that returns a promise of a response. The response needs what the component actually reads, often `ok` and a `json` method that resolves the body. A plain object makes `response.json` throw, and the failure looks like a product bug. Restore the stub afterward so the next file does not inherit it. Assert the URL when the contract matters, and still assert the UI the user sees. A stub that only checks that fetch was called can pass while the screen stays blank.

**Code:**

```jsx
jest.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  json: async () => ({ name: 'Ada' }),
})
```

**Follow-up:**
Why is a hand-rolled fetch mock awkward once you have several endpoints?

Answer: Each test starts reimplementing status codes, headers, and JSON. That is the point where Mock Service Worker usually pays for itself.

### REACT-366 — Mocking a module

**Difficulty:** Senior
**Category:** Mocking

**Question:**
How does mocking a module differ from stubbing one function, and what should you watch for?

**Answer:**
A module mock replaces an export before the component imports it. In Jest and Vitest that call is hoisted, so the factory cannot read a `const` declared later in the file. That shows up as a confusing reference error. Mock the smallest export you can, often a client function, and keep the React component real. Mocking the component under test, or every child, leaves nothing meaningful to render. Reset mocks between tests so call counts do not leak. When the module is really an HTTP call, intercept the network instead of replacing the import.

**Follow-up:**
How do you keep part of a module real while replacing one export?

Answer: Import the actual module inside the factory and spread it, then override the one function. You still render the real UI and only replace the collaborator you do not want to run.

### REACT-367 — Why Mock Service Worker sits on the network

**Difficulty:** Intermediate
**Category:** Network mocking

**Question:**
What problem does Mock Service Worker solve in React tests?

**Answer:**
Mock Service Worker intercepts requests at the network boundary and returns responses you define. The component, the data hook, and the real `fetch` implementation all run. You do not replace the client module, so headers, query strings, and error handling stay honest. Handlers can return JSON, an error status, or a delayed response, which maps cleanly onto loading and failure UI. Unhandled requests can be set to fail the test, so a new call does not silently hit the real network. The same handlers can often be reused in the browser during local development.

**Trade-offs:**
A fetch stub is less setup when one component makes one call. MSW is more machinery: a server, handlers, and a lifecycle. The payoff is a test that breaks when the URL, method, or response shape drifts, which is the failure you want for data-heavy UI.

**Follow-up:**
Does MSW replace a contract test against the real API?

Answer: No. It checks how the UI behaves given a response you control. A separate contract or end-to-end check still has to notice when the real service changes.

### REACT-368 — The MSW server lifecycle

**Difficulty:** Intermediate
**Category:** Network mocking

**Question:**
How do you start, reset, and stop an MSW server around a React test file?

**Answer:**
Create a server with `setupServer` and the handlers for this feature. Call `listen` once before the file runs so interception is on. Reset handlers after every test so a one-off override does not leak into the next case. Close the server after the file so other suites are not still intercepted. In MSW 2, handlers use `http.get` and `HttpResponse.json`. Turn on errors for unhandled requests. That setup sounds ceremonial, but it is what keeps a green test from depending on leftover state or on the developer’s network.

**Code:**

```js
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/profile', () => HttpResponse.json({ name: 'Ada' })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Follow-up:**
How do you override one response for a single test?

Answer: Call `server.use` inside that test with a more specific handler. `resetHandlers` in `afterEach` drops the override so the next test sees the defaults again.

### REACT-369 — Testing a custom hook with renderHook

**Difficulty:** Intermediate
**Category:** Hooks

**Question:**
When should you use `renderHook`, and what does it actually do?

**Answer:**
`renderHook`, from `@testing-library/react` on React 18, renders a tiny host component that calls your hook. `result.current` is the latest return value. You use it when the hook is a unit of logic with no important markup, such as a counter, a reducer wrapper, or a small state machine. Updates go through `act` so React flushes them the way a real render would. If the hook’s value is only meaningful on screen, render the component that uses it and assert the UI instead. A hook test that reimplements the component is extra maintenance.

**Code:**

```jsx
import { renderHook, act } from '@testing-library/react'

const { result } = renderHook(() => useCounter())
act(() => result.current.increment())
expect(result.current.count).toBe(1)
```

**Follow-up:**
How do you wait for an async hook to settle?

Answer: Use `await waitFor(() => expect(result.current.status).toBe('ready'))`. The wait retries until the hook’s state matches, the same way `findBy` retries for an element.

### REACT-370 — rerender, unmount, and a wrapper

**Difficulty:** Intermediate
**Category:** Hooks

**Question:**
How do you change props, unmount, or wrap a hook under `renderHook`?

**Answer:**
`renderHook` accepts `initialProps` and returns `rerender`. Pass the next props into `rerender` when you want to see how the hook reacts to a new id or a new filter. `unmount` runs cleanup, which is how you check that a subscription or a timer is cleared. The `wrapper` option places the hook inside providers, such as a query client or an auth context, without rendering a full page. Read `result.current` after each update. Do not store the first return value in a variable and expect it to change, because that object is a snapshot from the earlier render.

**Follow-up:**
What bug does forgetting `wrapper` usually look like?

Answer: The hook throws because a context value is missing, or it returns the default and the assertion looks like a logic bug. Provide the same providers the app uses, with test-only data.

### REACT-371 — A custom render that supplies providers

**Difficulty:** Intermediate
**Category:** Providers

**Question:**
How do you test a component that must sit under context, a router, or a query client?

**Answer:**
Build a small `renderWithProviders` helper that wraps `render` with the providers the feature needs. Each test calls that helper instead of repeating five wrappers. Give the helper options for things that vary, such as the current user or the starting URL, and keep the defaults boring and valid. Create a fresh client or store per test so cached data does not leak. The component then runs the same hooks it runs in production. Mocking `useContext` directly skips the provider and often hides a missing default or a bad memo.

**Code:**

```jsx
function renderWithProviders(ui) {
  return render(<AuthProvider user={{ id: '1' }}>{ui}</AuthProvider>)
}
```

**Follow-up:**
Should every test in the app share one giant wrapper?

Answer: Share providers that the whole product always has. Add feature-specific providers only in that feature’s helper so a billing test does not need a chat socket.

### REACT-372 — MemoryRouter and visible navigation

**Difficulty:** Intermediate
**Category:** Routing

**Question:**
How do you test routing behavior without a real browser history?

**Answer:**
`MemoryRouter` from React Router keeps history in memory. You pass `initialEntries` so the tree starts on a known URL, render the routes, and then click a real link or button. Assert the heading, form, or text that belongs to the next screen. That test covers the route table, the link, and the page together. You do not need to stub `window.location`. If a guard redirects anonymous users, start at the private URL with no user and assert the sign-in screen. The assertion stays on UI a person can read.

**Code:**

```jsx
render(
  <MemoryRouter initialEntries={['/settings']}>
    <AppRoutes />
  </MemoryRouter>,
)
expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
```

**Follow-up:**
How do you test a redirect?

Answer: Start at the URL that should bounce, with the auth or feature flag set the way the guard expects. Assert the destination content, and query that the old heading is gone.

### REACT-373 — Mocking useNavigate

**Difficulty:** Intermediate
**Category:** Routing

**Question:**
When is it reasonable to mock `useNavigate`, and when is it a shortcut you should skip?

**Answer:**
Mock `useNavigate` when the unit you care about is “this button asks the router to go to `/checkout`,” and the destination screen is heavy or unrelated. The mock is a function you assert on with the path. It does not prove the route exists or that the next page renders. Prefer `MemoryRouter` when the navigation is the feature, because a click then shows real UI. Module mocks of `react-router-dom` are easy to get wrong: you must keep the rest of the module intact or `Link` and `Routes` disappear. Treat the mock as a narrow tool, not the default.

**Follow-up:**
What should the assertion look like?

Answer: Expect the mock to have been called with the path, and with options such as `{ replace: true }` if that behavior matters. Still assert any toast or disabled state the click changes on this screen.

### REACT-374 — When a snapshot is a fair check

**Difficulty:** Junior
**Category:** Snapshots

**Question:**
When is a snapshot test a reasonable part of a React suite?

**Answer:**
A snapshot stores a serialized value and fails when that value changes. It is a fair check for a small, stable, pure output: a short bit of markup for an icon wrapper, or a plain object a formatter returns. You should be able to read the diff and decide whether the change was intended. Inline snapshots work well when the string fits on a few lines and reviewers will actually look at it. The snapshot is a guard against accidental edits, not a description of behavior. If you cannot explain the diff in a sentence, the snapshot is too big.

**Follow-up:**
What should you do the first time a legitimate copy change updates a snapshot?

Answer: Read the diff, confirm the new copy is what you meant, and commit the update in the same change. A snapshot update with no review is how mistakes get blessed.

### REACT-375 — Why page snapshots become a liability

**Difficulty:** Intermediate
**Category:** Snapshots

**Question:**
Why do large component snapshots tend to rot, and what should you write instead?

**Answer:**
A snapshot of a whole page fails on copy edits, dates, generated ids, and hashed class names. After a few weeks people update the snapshot without reading the diff, so the test stops protecting anything. It also passes without stating what the user can do. Replace it with a few queries: the heading is present, the primary button is enabled, and the error is absent. Those fail for a reason you can say out loud. Keep a snapshot only where the serialized form is the product, such as a tiny primitive you truly want to freeze.

**Trade-offs:**
Snapshots are cheap to add and noisy to own. Behavioral queries take longer to write and stay meaningful. A suite that is mostly snapshots feels covered until the first hurried `-u` commit.

**Follow-up:**
How do generated ids and dates break snapshots?

Answer: They change on every run or every build, so the diff is churn. Freeze the clock and the id generator in the test, or stop snapshotting that output.

### REACT-376 — Unit, component, and integration in a React app

**Difficulty:** Intermediate
**Category:** Test strategy

**Question:**
How do unit, component, and integration tests differ for a React codebase?

**Answer:**
A unit test calls a pure function or reducer with inputs and checks the return value. No DOM is required. A component test renders one screen, interacts as a user, and mocks the network edge. An integration test renders several real components together, including providers and the router, and checks a workflow such as filtering a list and opening a row. Say what is real and what is mocked, because the names overlap in conversation. The useful default for UI is the component or integration test, because that is where React bugs show up.

**Trade-offs:**
Pure unit tests are fast and pinpoint a bad calculation. They miss a wrong label or a broken effect. Broad integration tests catch those bugs and take longer to debug. You want both layers, with most UI confidence sitting in the rendered tree.

**Follow-up:**
Where do hook tests sit on that scale?

Answer: A `renderHook` test is a unit test of stateful logic. If the hook exists only to feed one component, a component test is usually enough and is harder to get out of date.

### REACT-377 — What a component test should own

**Difficulty:** Intermediate
**Category:** Test strategy

**Question:**
What behavior belongs in a React Testing Library test, and what should stay elsewhere?

**Answer:**
A component test should own visible rules: validation copy, disabled buttons, conditional panels, loading and error text, and keyboard access to the main action. Use real children when they are small. Leave cross-page session expiry, payment widgets, and pixel checks in ten browsers to an end-to-end or visual suite. Do not retest a pure price function that already has a unit test, except one example that the formatted price appears. If the bug could happen without a browser and without another team's service, render it here.

**Follow-up:**
How many cases should one component file contain?

Answer: One case per behavior that can break on its own. Three clear tests beat one script that clicks through an entire product.

### REACT-378 — Coverage as a weak signal

**Difficulty:** Intermediate
**Category:** Coverage

**Question:**
Why can a React project have high coverage and still ship broken screens?

**Answer:**
Coverage tools mark a line as covered when a test executes it. They do not check that the assertion was right. A render with no expect, a giant snapshot, or a click that never reads the screen all raise the number. Branches behind a mock never run, so the score ignores the path users hit. Chasing 100 percent invites tests that only import a file. Use the report to find a module nobody renders, then write a behavioral test. A gate is a floor for forgotten files, not proof the UI works.

**Trade-offs:**
A gate stops a pull request from adding a file with zero tests. It also invites filler tests once the number becomes the goal. Pair the gate with review of the assertions, or the number will climb while confidence stays flat.

**Follow-up:**
What is a healthier coverage habit on a feature branch?

Answer: Look at the uncovered lines in the file you edited and decide which ones are user-visible. Cover those with a query. Leave trivial glue alone if a test would only mirror the code.

### REACT-379 — What an act warning means

**Difficulty:** Senior
**Category:** React 18

**Question:**
What is React telling you with “an update was not wrapped in act”?

**Answer:**
`act` flushes renders and effects so assertions see the UI React has committed. The warning means a state update happened outside that flush, often after the test already finished. Typical causes are a fetch nobody awaited, a `userEvent` call that was not awaited, or a timer that fires late. React 18 surfaces this more often because updates are batched and effects run after paint. Treat it as a sign the test and the component disagree about when work is done. A late update after unmount is also a real product bug, not only noise.

**Follow-up:**
Does wrapping every line in `act` fix a sloppy test?

Answer: It can hide the warning without waiting for the right UI. Await `findBy` or `userEvent` first. Add `act` yourself when you advance timers or call a hook updater directly.

### REACT-380 — Clearing act warnings in async tests

**Difficulty:** Senior
**Category:** React 18

**Question:**
How do you track down and clear an `act` warning in an async React test?

**Answer:**
Read which component updated. That name usually points at the fetch, subscription, or timer. Await the UI that appears when that update lands, instead of asserting too early. If you use fake timers, advance them inside `act` so the timeout’s `setState` is flushed before the test ends. If the update arrives after unmount, abort the request or ignore the result in the effect cleanup, then assert that no warning remains. Do not swallow `console.error` globally. A warning you silence in setup will return in production as a setState-on-unmounted bug. The test should end with the component idle.

**Follow-up:**
Why does React 18 sometimes make this show up when React 17 did not?

Answer: Effects and batched updates settle on a slightly different schedule, and the testing renderer reports late updates more consistently. The product code may have been racy already.

### REACT-381 — Suspense fallbacks and resolved UI

**Difficulty:** Senior
**Category:** Suspense

**Question:**
How do you test a Suspense boundary in React 18?

**Answer:**
Suspense shows a fallback while a child is suspended. A child suspends by throwing a promise, which is what `React.lazy` and suspense-aware data libraries do. A normal `useEffect` fetch does not suspend, so it never shows that fallback. Render the boundary, hold the promise so the fallback stays visible, and assert that text. Then resolve the promise and `findBy` the finished heading. If the promise resolves in the same tick, you may never see the fallback, so control it when both frames are part of the contract.

**Code:**

```jsx
render(
  <Suspense fallback={<p>Loading profile</p>}>
    <Profile id="1" />
  </Suspense>,
)
expect(screen.getByText('Loading profile')).toBeInTheDocument()
expect(await screen.findByRole('heading', { name: 'Ada' })).toBeInTheDocument()
```

**Follow-up:**
What does a `useEffect` fetch test look like if it is not Suspense?

Answer: Assert the loading text that your own state renders, then `findBy` the success text when the mock resolves. You are waiting on your state, not on a boundary.

### REACT-382 — Testing an error boundary

**Difficulty:** Senior
**Category:** Error boundaries

**Question:**
How do you test that an error boundary renders its fallback?

**Answer:**
An error boundary is a class component, or a library built on one, that catches errors thrown while rendering its children. Render a child that throws, and assert the fallback role or text. React logs the error, so spy on `console.error` for that test and restore it, or the suite treats the log as a failure. A throw inside `onClick` is not caught in React 18, because event-handler errors skip the boundary. If the boundary can reset, click try again and assert the recovered UI with a child that throws only once.

**Code:**

```jsx
function Bomb() {
  throw new Error('boom')
}

render(
  <ErrorBoundary>
    <Bomb />
  </ErrorBoundary>,
)
expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
```

**Follow-up:**
How do you test the reset path without the child throwing forever?

Answer: Use a child that throws once, then renders normally. Click the boundary’s reset action and assert the normal heading.

### REACT-383 — Fake timers for debounce and delay

**Difficulty:** Senior
**Category:** Timers

**Question:**
How do you test a debounce or a delayed update without waiting on the real clock?

**Answer:**
Fake timers replace `setTimeout` and `setInterval` so you control the clock. Render the component, perform the action, and assert the delayed UI is still absent. Then advance just under the delay and assert it is still absent. Advance past the delay inside `act` and assert the UI now shows the debounced value. That proves the delay, not only the final state. Reset to real timers after the test so later tests do not hang. Avoid sleeping with a real `setTimeout` in the test. It is slow and it flakes when the machine is busy.

**Follow-up:**
Why assert before you advance time?

Answer: If you only advance and check the result, a bug that updates immediately still passes. The early assertion locks the delay in place.

### REACT-384 — userEvent together with fake timers

**Difficulty:** Senior
**Category:** Timers

**Question:**
Why do `userEvent` and fake timers often deadlock, and how do you combine them?

**Answer:**
`userEvent` inserts a small delay between keystrokes and pointer steps. Under fake timers those delays never elapse, so `await user.type` never finishes. Configure the user with `advanceTimers` set to your runner’s advance function, or set `delay: null` when you do not need between-key behavior. Advance the debounce interval yourself after typing, inside `act`. `waitFor` can also hang, because its polling timer is frozen unless the runner is set to advance timers automatically. Prefer an explicit advance for debounce tests so the timeline is obvious. Always restore real timers in cleanup.

**Code:**

```js
jest.useFakeTimers()
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
await user.type(screen.getByRole('searchbox'), 'ada')
act(() => jest.advanceTimersByTime(300))
```

**Follow-up:**
What is a safe cleanup if a test throws halfway through?

Answer: Call `jest.useRealTimers()` or the Vitest equivalent in `afterEach`. A leaked fake clock makes the next file’s `findBy` time out.

### REACT-385 — Accessible queries as a product check

**Difficulty:** Intermediate
**Category:** Accessibility

**Question:**
How do Testing Library queries double as a basic accessibility check?

**Answer:**
Role and name queries read the accessibility tree, not the class list. A clickable div with no role fails `getByRole('button')`. An icon-only button fails a name query until you add text or an `aria-label`. An input without a label fails `getByLabelText`. Those failures match what a screen reader would miss. The test is not a full audit of contrast or reading level. It does stop the common regression where someone rebuilds a control as a styled div. Query the element the way the accessibility tree is supposed to expose it.

**Follow-up:**
What extra matcher helps after you have found the node?

Answer: `@testing-library/jest-dom` adds `toHaveAccessibleName` and `toHaveAccessibleDescription`. Use them when the role is right but the announced name is the part that broke.

### REACT-386 — Keyboard and focus

**Difficulty:** Intermediate
**Category:** Accessibility

**Question:**
How do you test keyboard use and focus without a full browser automation tool?

**Answer:**
Use `userEvent.tab()` to move focus and `toHaveFocus` to see where it landed. Activate the focused control with `userEvent.keyboard('{Enter}')`. That catches a widget that only listens to `onClick`, and a dialog that never moves focus inside. jsdom does not calculate layout, so it will not prove a focus trap's pixel position, but it will prove tabbable elements receive focus in DOM order. Keep these tests on the form, the menu, and the modal close control. A native button needs fewer keyboard tests because the browser already handles it.

**Follow-up:**
What should you do when Tab order is wrong because a positive `tabIndex` was added?

Answer: Assert focus order with a few `tab()` calls and remove the positive tab index. The test documents the order a keyboard user needs.

### REACT-387 — Forms, validation, and the submit button

**Difficulty:** Intermediate
**Category:** Forms

**Question:**
How do you test a form’s validation and submit behavior?

**Answer:**
Find each field by its label and the submit control by its button name. Submit once with empty fields and assert the alert or the description near the field. Type a valid value, submit again, and assert the success UI or the payload your handler sent. If the button stays disabled until the form is valid, assert it is disabled first, then enabled after input. Use `toBeInvalid` or the alert text rather than a class name. Cover one invalid case and one valid case in separate tests. A single test that fixes its own errors makes the failure message ambiguous.

**Follow-up:**
How do you assert an error that is tied to one field?

Answer: Query the field by its label and check `toHaveAccessibleDescription` with the error text, or find the alert that names the field. The link should be the same one assistive tech uses.

### REACT-388 — rerender when props change

**Difficulty:** Junior
**Category:** Rendering

**Question:**
How do you test a component’s reaction to new props?

**Answer:**
`render` returns `rerender`. Pass the same component with the next props, and React updates the mounted tree instead of starting over. That is how you show a new selected id or a parent-driven value. Assert the first frame, call `rerender`, then assert the second. Use it when the parent owns the state and the child is controlled. A second `render` mounts another tree and can hide update bugs, and it can leave two copies in the document. Keep the prop change as small as the story you are telling.

**Code:**

```jsx
const { rerender } = render(<Greeting name="Ada" />)
expect(screen.getByText('Hello, Ada')).toBeInTheDocument()
rerender(<Greeting name="Grace" />)
expect(screen.getByText('Hello, Grace')).toBeInTheDocument()
```

**Follow-up:**
When is a second `render` call the wrong move?

Answer: A second `render` mounts another tree and can leave two copies in the document if you have not unmounted. Use `rerender` to update the tree you already have.

### REACT-389 — Why component tests flake in CI

**Difficulty:** Senior
**Category:** CI

**Question:**
Why do React component tests pass locally and flake in CI?

**Answer:**
CI machines are slower and shared, so a one-second timeout can expire before a heavy render finishes. Real timers, real network, and `setTimeout` sleeps depend on the clock. Leftover fake timers, mocks, or a shared cache make order matter: the file passes alone and fails after another file. An assertion that runs before the UI settles shows up as a `findBy` race. A pass that needs a warm worker is not a logic success. Treat a flake as a missing wait, shared state, or a dependency on the outside world.

**Follow-up:**
Should you retry flaky tests in CI as the fix?

Answer: A single retry can keep a pipeline moving while you investigate. Leaving retries on forever trains the suite to be random. Fix the wait or the shared state, then drop the retry.

### REACT-390 — Making tests deterministic

**Difficulty:** Intermediate
**Category:** CI

**Question:**
What habits keep a React test suite deterministic?

**Answer:**
Await every `userEvent` call and every appearance that follows a promise. Drive time with fake timers you advance yourself, then restore real timers. Intercept HTTP so a laptop's network cannot change the result. Build a new store, cache, or user per test, and reset handlers in `afterEach`. Freeze random ids and `Date.now` when they would change the output. Do not depend on test order. If a query is slow only in CI, find the extra work before you raise the global timeout. The test should describe a timeline you control.

**Follow-up:**
Where should a longer timeout live if a heavy test truly needs it?

Answer: Set it on that `findBy` or on that file, with a comment that says why. A global timeout of many seconds makes real failures wait too long.

### REACT-391 — Where component tests stop and browser tests start

**Difficulty:** Intermediate
**Category:** End-to-end

**Question:**
Where is the boundary between React Testing Library and Playwright or Cypress?

**Answer:**
React Testing Library runs in a simulated DOM, usually jsdom, and mounts components without a server. Playwright and Cypress launch a real browser against a running app. They understand layout, navigation, cookies, and file downloads. Keep component tests for UI rules and for screens whose network you can mock. Move a test to the browser when jsdom cannot represent the risk: a layout-dependent focus trap, a cross-page sign-in, or the real production build. The boundary is the environment the bug needs, not which person writes the test.

**Trade-offs:**
Component tests fail closer to the line of code and run on every save. Browser tests catch integration the simulator invents poorly, and they cost more to run and to debug. Duplicating every RTL case in Cypress slows the team without adding information.

**Follow-up:**
What does jsdom specifically fail to prove?

Answer: Real layout, most scrolling, some canvas and media behavior, and the full browser security model. If the bug needs those, write a browser test.

### REACT-392 — What a browser smoke path should cover

**Difficulty:** Intermediate
**Category:** End-to-end

**Question:**
What should a small Playwright or Cypress suite cover for a React app?

**Answer:**
Cover a few journeys that must work for the product to be alive: sign in, finish the core action, and see the result on the next page. Use the real router, the real build, and a test account or a shared stubbed backend. Assert headings and buttons by role so a class-name change does not break the script. Leave field-level validation and hook edge cases in React Testing Library. A smoke path answers whether this deploy boots and a person can finish the main job. Ten stable journeys are enough.

**Follow-up:**
How do Playwright and Cypress differ at a high level?

Answer: Both drive a real browser and click through the app. Playwright is a common choice for multi-browser runs and locators that wait. Cypress is a common choice for an interactive runner, and either tool can own this smoke path.

### REACT-393 — Over-mocking

**Difficulty:** Intermediate
**Category:** Mocking

**Question:**
How do you tell that a React test is mocked so heavily it cannot fail?

**Answer:**
If the test mocks the child, the hook, the router, and fetch, the parent only checks that those mocks were called. You can delete the real JSX and the test may still pass. A useful test lets production code render and checks the text, the role, or a request the component truly makes. Mock a boundary you do not own, such as HTTP, time, or a vendor SDK. Keep your own components real unless one is huge and unrelated. If the mock setup is longer than the screen assertions, delete a mock.

**Follow-up:**
What is a practical rule in review?

Answer: Ask which production line would make this test fail. If the author cannot point at one, the test is describing the mocks.

### REACT-394 — Strict Mode double effects

**Difficulty:** Senior
**Category:** React 18

**Question:**
How does React 18 Strict Mode change component tests that count effects?

**Answer:**
In development, Strict Mode remounts the tree and runs certain effects twice so missing cleanup shows up. A test under Strict Mode may see two fetches even though production runs the effect once. An exact call count then fails for a component that is fine. Assert the settled UI instead. If you do assert a count, know whether this renderer is in Strict Mode. The product fix is an effect that survives a second run and cleans up the first. Turning Strict Mode off only in the test hides the bug it was meant to reveal.

**Follow-up:**
Should test setup drop Strict Mode to make counts easier?

Answer: Only when you are explicit that this file is testing production-shaped single invocation. Prefer an assertion on the screen, which stays correct either way.

### REACT-395 — Cleanup, unmount, and leaked updates

**Difficulty:** Intermediate
**Category:** Lifecycle

**Question:**
How do cleanup and unmount work in a React Testing Library test?

**Answer:**
The library unmounts rendered trees after each test so nodes do not pile up in the document. Call `unmount` yourself when the story is that the user leaves the page. Effects should return a cleanup that aborts fetches, clears timers, and unsubscribes. If they do not, a late resolve still calls `setState` and you get an `act` warning. Assert that leaving does not throw. You rarely need your own `afterEach` cleanup unless auto cleanup was turned off. A leaked timer is often a product bug as well as a test bug.

**Follow-up:**
How do you assert that a timer was cleared on unmount?

Answer: Start the timer, unmount, advance the clock, and assert the callback did not run or that a mock was not called. If it runs, the effect is missing its cleanup.

### REACT-396 — jest-dom matchers

**Difficulty:** Junior
**Category:** Assertions

**Question:**
What does `@testing-library/jest-dom` add, and why are its matchers preferred?

**Answer:**
The package adds DOM matchers such as `toBeInTheDocument`, `toBeDisabled`, `toHaveFocus`, `toHaveTextContent`, and `toHaveAccessibleName`. You import it once in the test setup. The failure messages name the element and the expected state, which is faster to read than a boolean you computed yourself. They also encode the right check, such as “disabled,” instead of poking at a property you might misread. The matchers work in Jest and, with the matching setup, in Vitest. They do not find elements for you. You still query with Testing Library, then assert with a matcher that speaks in UI language.

**Follow-up:**
Why is `toBeInTheDocument` better than checking that the query did not throw?

Answer: `getBy` already throws when the node is missing, so a later matcher documents the state you care about, such as visible text or focus. Use `queryBy` plus `not.toBeInTheDocument` when absence is the point.

### REACT-397 — Portals and modals

**Difficulty:** Intermediate
**Category:** Portals

**Question:**
How do you test a modal that renders through a portal?

**Answer:**
A portal mounts its children on another node, often `document.body`, outside the render container. `screen` searches the whole document, so the dialog heading and buttons are still found. Queries on `container` miss them. Open the dialog with a click, then assert its role and name. Close it with the button a person would use, and assert it is gone. If focus should move inside, assert `toHaveFocus` on the first control. You do not need a portal helper in the test. Document-level queries plus a real open and close are enough.

**Follow-up:**
How do you assert that background content is inert while the dialog is open?

Answer: Assert the dialog is present and that the background control is not reachable or is marked busy, using the roles your dialog implementation exposes. A full focus-trap proof may still need a browser test.

### REACT-398 — Lists, empty states, and conditional UI

**Difficulty:** Junior
**Category:** Conditional UI

**Question:**
How do you test a list that can be empty, loading, or filled?

**Answer:**
Give each visible mode its own test. For an empty payload, assert the empty heading and expect no rows. For a filled payload, find the rows and check a name only that data would produce. For loading, hold the response, assert the status text, then let it finish and assert the status is gone. Conditional panels work the same way: open the switch, see the panel, close it, and see it disappear. Assert absence with `queryBy`, because `getBy` throws before you can say the element is missing.

**Follow-up:**
How do you avoid a brittle assertion on row order?

Answer: Query by the accessible name of a specific row when order does not matter. Assert order only when the product promises a sort, and then check the first and last names.

### REACT-399 — Assertion style that stays readable

**Difficulty:** Junior
**Category:** Assertions

**Question:**
How should assertions in a React test read when someone opens the file six months later?

**Answer:**
Name the test after the behavior, then arrange, act, and assert one outcome. The assertion should mention the role and the text a person sees. Prefer one clear expectation, plus a second only when two things change, such as a toast and a disabled button. A snapshot, a class, and a mock call on the same click fail in three ways and explain none of them. The next reader should be able to demo the test on the real screen. If the name and the assertion disagree, fix that first.

**Follow-up:**
What belongs in the test name?

Answer: The condition and the visible result, such as “disables Pay when the card number is empty.” Skip the component’s function name. The file path already says where the code lives.

### REACT-400 — A practical React test portfolio

**Difficulty:** Intermediate
**Category:** Test strategy

**Question:**
What mix of tests should a React 18 team aim for on a product feature?

**Answer:**
Unit-test pure calculations and reducers with plain inputs. Cover the screen with React Testing Library for the states a person can see: empty, loading, success, error, and the main keyboard action. Mock the network with MSW, and render real children and providers. Use `renderHook` only for shared logic that is awkward to see in markup. Add one or two Playwright or Cypress journeys that cross pages in a real browser. Use coverage to notice a forgotten file, not as the goal. That mix stays fast, fails for visible reasons, and still catches a broken deploy.

**Trade-offs:**
A team that only writes end-to-end tests gets slow feedback. A team that only writes unit tests misses the screen. The mix above puts the most tests where React bugs actually show up, and keeps a thin browser layer for the risks jsdom cannot see.

**Follow-up:**
What would you add first on a legacy page that has no tests?

Answer: One rendered test for the main success path and one for the main error path, with the network mocked. Those two catch more than a large snapshot and give you a place to hang the next case.
