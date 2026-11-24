# Lance — Agent Rules & Standards

These rules keep Lance from re-tangling after the unslop + untangle passes.
Read before making changes. When in doubt, ask.

---

## 1. No new tangles (untangle-codebase standard)

Every change must answer: **should these pieces change together?**

| Problem | What to do |
|---|---|
| **Hidden links** — two pieces that must change together but nothing shows it | Colocate them. One module, one file, one export. If code in `src/screens/X` and `src/components/Y` always change together, move them together. |
| **Needless links** — stable code importing volatile code | Dependency direction: stable → stable. UI screens should not import volatile store internals directly; go through the command registry or store actions. |
| **Surplus** — wrappers, dead code, speculative generality | Delete it. If nothing uses it, remove it. If a wrapper only passes through, inline it. |
| **Special cases** — `if` for one value, param for one caller, swallowed exception | Fix the design so the special case isn't needed. If it's a real requirement, make it explicit and documented. |

**Rule:** A typical change lands in one place. If you touch 5+ files for one feature, stop and restructure first.

---

## 2. UI standards (glass chrome, near-solid content)

Visual direction: Apple-like glass chrome + near-solid content surfaces. Calm, not
noisy. Every change must answer: should this be glass or surface?

| Element | Standard |
|---|---|
| Chrome (sidebar, topbar, modal, command palette, toast, status bar) | `.glass` — frosted, blurred, translucent gradient, top highlight. |
| Content (Card, MetricCard, EmptyState, list rows, tables) | `.surface` / `.list-surface` — near-solid fill, no blur, soft shadow. |
| Gradients on buttons/cards/backgrounds | No, except the `.glass`/`.surface` utilities above. Solid fills otherwise. |
| Glows, blobs, radial washes, backdrop-blur on content | No. Ambient mesh lives only on `body`. |
| Gradient text | No. Solid text color. |
| `transition-all` | No. Name transitions: `transition-colors`, `transition-[transform,opacity]`. |
| Magnetic hover / cursor lean | No. Remove `Magnetic` wrappers. |
| Uppercase tracked labels | No. Sentence case, normal tracking. |
| `font-bold` (700–900) | No. Weights 400–500, 600 at most for rare emphasis. |
| Emoji as icons/decoration | No. Lucide line icons, 16–18px, stroke 1.5, muted color. |
| Sparkles ✨ for AI | No, except where AI is the subject. |
| Greeting headlines (`Welcome back`) | No. Page/period title. |
| Exclamation marks in UI | No. Plain statements. |
| Changes without reference (`+12%!!`) | No. `+12% vs last month`. |
| Placeholders (`Search anything…`) | No. `Search`. |
| Pills for counts/badges | No. Quiet mono text or keycaps. |
| Equal cards side by side | No. One main chart + compact stats, varied widths. |
| Looping motion (`animate-pulse`, `animate-ping`) | No. Static unless live. One entrance per screen. |

**Palette (60-30-10):** 60% neutral base, 30% secondary (blue-lavender structural),
10% accent. Default theme accent is amber gold `#FFAD00`; other themes keep their
own accent as their 10% pop. Green is reserved for success/paid/positive semantics
(`--success`), never for interactive chrome.

**Typography:** Default theme uses Playfair Display (display) + Source Sans 3 (body),
both self-hosted under SIL OFL. Other themes keep their own pairing. Page titles
carry `.font-display`; body copy uses `--font-body`.

**Themes:** 7 themes (Default, Studio, Terminal, Craft, Motion, Lens, Scale) keep
their fonts/accents but must follow all passes above. Default theme: warm graphite
neutral ramp, amber accent.

**Motion:** durations 120/150/200ms via `--dur-tap/ui/enter`; `prefers-reduced-motion`
and `prefers-reduced-transparency` always win.

## 3. Store conventions

- **One store, not slices.** `src/store/index.ts` is the single `create()` call (Constitution).
- Domain slices live in `src/store/slices/` (meta, toasts, updater) and are **spread** into the single `create()`.
- Entity CRUD stays in `src/store/index.ts` — all entities follow the same `load/create/update/delete` pattern.
- Cross-slice references use `get()` at call time, never captured at creation time.
- `startLoad`/`endLoad`/`setError` from `src/store/slices/base.ts` — never redefine locally.
- Toast timer state lives in `src/store/slices/toasts.ts`, not interleaved with entity CRUD.

---

## 4. App shell (App.tsx)

- App.tsx is thin: state + outlet + engine hooks.
- Shell engines live in `src/lib/engines/` as hooks (e.g. `usePortalPolling`).
- No `document.dispatchEvent(new CustomEvent('lance:...'))` — use `src/lib/commands.ts` (`commands.dispatch` / `commands.on`).
- No `setTimeout(..., 350)` wait-and-hope patterns.

---

## 5. Feature components (the 187 trackers)

- New trackers use `src/components/ui/RecordTracker.tsx` — one generic component configured per entity.
- Do not hand-roll list/create/delete UI for a new entity.
- Store-based: pass store slice actions. DB-based: pass `getDb()` functions.
- RecordTracker props: `entity`, `title`, `icon`, `list`, `load`, `create`, `update?`, `remove`, `fields`, `columns`, `filterBy?`.

---

## 6. Testing

- Tests depend on **behavior**, not DOM internals. Do not spy on `document.dispatchEvent`.
- Spy on `commands.dispatch` for command-registry interactions.
- Remove tests that repeat the implementation or can't fail.
- Fix failing tests — never skip or ignore.
- After any change: `npm run build`, `npm run lint`, `npm run test` must all pass.

---

## 7. Before every commit

```
npm run doctor         # check local toolchain
npm run verify         # typecheck + lint + test + build
```

`npm run verify` runs `typecheck`, `lint`, `test` and `build`; all must pass.
See `CONTRIBUTING.md` for the PR workflow and `docs/ROADMAP.md` for places
where outside contributions are welcome.

---

## 8. Files created in this cleanup

| File | Purpose |
|---|---|
| `src/lib/commands.ts` | Typed command registry (replaces 32 `lance:...` CustomEvent sites) |
| `src/store/slices/base.ts` | Shared store helpers (startLoad/endLoad/setError) |
| `src/store/slices/meta.ts` | Loading/errors/portal slice |
| `src/store/slices/toasts.ts` | Toast queue slice (timer map extracted) |
| `src/store/slices/updater.ts` | Update-check slice |
| `src/lib/engines/usePortalPolling.ts` | Portal polling engine (was inline in App.tsx) |
| `src/components/ui/RecordTracker.tsx` | Generic tracker (replaces copy-paste feature trackers) |

---

## 9. What NOT to do

- Don't add new `lance:...` CustomEvent dispatch/listen sites.
- Don't add `transition-all`, `backdrop-blur`, gradient fills, or decorative sparkles.
- Don't create a new feature tracker by copying an existing one — use RecordTracker.
- Don't add state/actions to the store without considering if they belong in a slice.
- Don't ignore test failures.

---

Credit: unslop by Damir Sokolovsky (@heydamir, CC BY 4.0); untangle-codebase by caldoai.