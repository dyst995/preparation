# Local Component State — Answers

## Core recall

1. **`useState` / `useReducer`** in that component.  
2. **No** — ownership can stay with the parent; props are distribution, not a new global kind.  
3. Deep prop drilling; distant unrelated consumers; must survive unmount/route change.  
4. It is **destroyed** (that fiber’s state is gone).  
5. When **siblings** need the same value — nearest common parent owns it.  
6. Complex coordinated transitions / testable action logic — still in one component.  
7. Changing `key` **remounts** → fresh local state.  
8. **React Query** (server state), not Redux-as-fetch-cache by default.

## Explain why

1. Easier to reason about, delete, and avoid cross-app re-renders.  
2. One level is normal composition; many levels of pass-through add noise and coupling.  
3. Page unmounts; `useState` on that page goes away.  
4. They might share via a parent or URL; tools depend on distance/frequency/kind.  
5. Keeps blast radius small; Context is for awkward distance / many consumers.  
6. New identity should start clean — remount clears stale field state.

## Compare and contrast

1. **Local:** one owner (maybe with props). **Shared client:** distant multi-owner client data.  
2. **Props:** explicit, narrow. **Context:** implicit, any descendant; re-render caveats.  
3. **Lift:** single source of truth. **Duplicate:** drifts out of sync.  
4. Both local; reducer for complex transitions.  
5. **Local:** dies on leave. **URL:** shareable/sticky across mounts.  
6. **Controlled:** parent owns value. **Internal local:** child owns until exposed.

## Predict the behavior

1. **Reset** (typically `''` again) — new mount.  
2. **No** — two states.  
3. **Yes** — parent owns one `query`.  
4. **Reset** — new fiber for new key.

## Debugging

1. Yes — use URL, layout-level state, or persisted store.  
2. Overkill — keep local (or nearest parent).  
3. Outgrowing local via **prop drilling** — Context/store or compose differently.  
4. Duplicated local state — **lift** `selectedId`.

## Application

1. Parent `const [openId, setOpenId] = useState(null)`; items get `isOpen` / `onToggle`.  
2. Move `selectedId` to parent; pass down value + setter/callback.  
3. e.g. table row hover, column picker open, ephemeral confirm dialog on that page.  
4. Drill depth; distant consumers; persist across unmount.  
5. **Local** to `OrdersPage` (or its layout) unless many routes open the same modal system.

## Interview questions

1. **Spoken:** Start `useState`/`useReducer` on the owner; props to children OK; lift for siblings; leave local for deep drilling, distant sharing, or persistence needs — then pick Context/Zustand/Redux/URL/RQ by kind.  
   **Follow-ups:** Drilling vs Context; unmount resets.

2. **Spoken:** Yes if one owner holds the source of truth and passes data down — still local UI state.

3. **Spoken:** Lift first to nearest parent; Context when the tree shape makes lifting painful or consumers are widespread.

4. **Spoken:** Owner unmounted; use URL, higher layout state, or a store — or accept reset.

5. **Spoken:** Simple fields → `useState`; complex multi-field transitions → local `useReducer`.

## Connections

1. This is the practical home for kind #1 in the four-kinds table.  
2. Hook API is how local state is stored on the fiber.  
3. New key / remount → new hook list → empty local state.  
4. Drill → Context; distant frequent → Zustand/Redux; fetched → RQ.  
5. Parent `useState` + value/`onChange` props = local ownership with composed children.
