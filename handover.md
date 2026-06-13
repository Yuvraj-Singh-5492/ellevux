# Ellevux Project Handover

## Overview
Ellevux is an autonomous AI receptionist platform for service businesses (HVAC, plumbing, dental, etc.). It answers calls in <12s, qualifies leads, and books jobs to the calendar 24/7. The front-end is a **multi-page static site** (HTML/CSS/JS); the landing page runs React via CDN + in-browser Babel (no build step). Backend/DB is **Supabase**.

## Stack realities (important — read before editing)
- **No build step, no npm, no node_modules.** Libraries load as CDN globals: React, `window.Motion` (framer-motion), `window.lucide`, Supabase. Tailwind is the **CDN build (v3)**, configured inline per page via `tailwind.config`.
- **three.js r0.149 is now loaded as an ES module via an `<script type="importmap">`** (only used by the landing's scroll-3D hero overlay — a separate `<script type="module">` that imports `three`, `GLTFLoader`, `MeshSurfaceSampler`, `RoomEnvironment`). The old UMD `three.min.js` was **removed** to cut load, so `window.THREE` is now undefined and the six little mockup accents fall back to their CSS placeholders. (Note: `examples/js/*` UMD builds don't exist on CDNs for r0.149 — addons MUST come via the importmap, not `THREE.GLTFLoader`.)
- **TypeScript does NOT work** in the inline Babel — write plain JS/JSX (no type annotations).
- **Node is not installed**; **Python 3.12 is.** Run the site with `python -m http.server 3000` from the project root, then open pages directly (e.g. `http://localhost:3000/react_landing.html`). Python's server lists files at `/`.
- **Git is installed** (full path `C:\Program Files\Git\cmd\git.exe`; not on PATH). The project IS a git repo — use commits as the safety net.
- **Supabase CLI** is at `%LOCALAPPDATA%\supabase-cli\supabase.exe` (logged in via the user's own shell; an isolated/sandboxed shell can't read that token — the user must run privileged supabase commands themselves).

## Project Structure
- `react_landing.html` — main landing page (React/CDN) + the **scroll-driven 3D hero overlay** (self-contained ES module near `</body>`). Shared building blocks: refined `Navbar`, `Hero`, `HeroShapes` (floating gradient bars), `HeroMockup` (interactive console), `MiniBentoGrid` (features card-grid + modal; the `<section>` has `id="features-bento"`), `AlternatingSections` (product mockups; `Custom AI Voice & Tone` has `id="feat-voice"`, `Google Calendar Sync` has `id="feat-calendar"` — the 3D overlay anchors to these), `CTA`, `Footer`. `react_landing.html.bak` is the pre-3D-splice backup.
- `iphone_model/` (`scene.gltf` + `.bin` + textures) — iPhone 15 Pro, CC-BY-4.0 "polyman". `mannequin_model/` (`scene.gltf` + `.bin`) — CHMIL Mannequin Bust, CC-BY-4.0 "CHMIL Studio". Both are runtime assets for the hero overlay (the iPhone is rendered + dissolved; the mannequin is **only surface-sampled** for the bust shape, never rendered). The `apple_iphone_15_pro_black.zip` / `chmil_mannequin_bust_2024.zip` are the source archives. **Both models need a CC-BY credit line before public launch.**
- `iphone-preview.html` — standalone validation harness for the scroll-3D overlay (kept in sync with the live module; has a debug HUD + mock sections). Iterate/eyeball big 3D changes here first, then splice to `react_landing.html`.
- `nav.js` — shared refined header injected on the static pages (pricing/docs/changelog/login/signup/demo). Edit once → updates everywhere. Dashboard is intentionally excluded.
- `dashboard.html` — logged-in app shell (sidebar + tabs: overview/agents/calls/calendar/settings). Data via `window.supabaseClient` with a LocalStorage mock-mode fallback.
- `login.html` / `signup.html` — split-screen auth; email/password + Google OAuth (both working).
- `pricing.html` — redesigned tiers (Growth dominant) + Enterprise strip + mini FAQ. Has the PayPal paywall wiring.
- `demo.html` (+ `demo.mp3`) — audio player + call transcript (static).
- `docs.html` / `changelog.html` — redesigned (sticky scrollspy/search; filterable timeline).
- `supabase-config.js` — exposes `window.supabaseClient` (do NOT recreate the client).
- `supabase/` — `schema/subscriptions.sql` + `functions/paypal-webhook/` (Edge Function).
- `shadcn-version/` — standalone Vite+TS+shadcn project holding the literal .tsx component deliverables (needs Node; not part of the live site).
- `logo.png` (cropped wordmark) + `logo-icon.png` (icon only, used in the header lockup).
- `PAYPAL_SETUP.md` — step-by-step for finishing the PayPal paywall.

## What's been done (this redesign cycle)
- **Site-wide visual overhaul:** refined floating-glass header (shared `nav.js` + React Navbar) with logo lockup (icon + "ellevux" text); redesigned footer (multi-column, socials reduced to **Instagram + email only**); hero CTAs unified to pill+arrow+hover-lift.
- **Real glassmorphism** applied consistently (gradient surface + top light-catch + sheen + `saturate`, dedicated classes so the global `.glass-panel` stays safe) across: landing features + product mockups, dashboard cards, pricing cards, docs cards, changelog cards, demo player. Home and dashboard glass/grid values were matched.
- **Redesigns:** changelog (single-rail filterable timeline), docs (sticky scrollspy sidebar + search), demo (two-panel player + transcript; fixed a fake-animation bug), login/signup (split-screen), dashboard (glass cards, hero-style ambient bg), pricing (dominant Growth tier, real copy, $297 setup-fee callout, FAQ).
- **Scroll-driven 3D hero (the big new thing):** a single particle system tells a **4-beat narrative** as you scroll — (1) the **iPhone 15 Pro** (real GLTF, "calling Ellevux" screen composited onto its display) dissolves into titanium **sand** → (2) reassembles into a **robot bust** (surface-sampled from `mannequin_model`, ~31° left turn) above the features grid → (3) disintegrates and reforms into a **chat bubble** (left, at the Custom AI Voice section) → (4) reforms into a **calendar with a booked slot** (right, at the Google Calendar Sync section). One shared disintegrate→drift→reassemble "shift style"; reduced-motion + tab-pause + offscreen-skip handled. Lives in a self-contained `<script type="module">` (own renderer/scene, module three) so it doesn't touch the React tree.
- **The six small mockup 3D accents are now disabled** (UMD `three.min.js` removed to cut load) — they fall back to their CSS placeholders. Re-enable by restoring the UMD script if ever needed.
- **PayPal paywall** (Stripe stopgap): `subscriptions` table created + RLS, `paypal-webhook` Edge Function deployed, pricing.html wired (mock fallback until Client/Plan IDs set). See PAYPAL_SETUP.md.

## In progress / pending
- **The 4-beat scroll-3D hero is built and LIVE but NOT yet git-committed** (working-tree change in `react_landing.html` + the two model folders + `iphone-preview.html`). The user has been iterating on it live for many turns (placement, timing, the scatter look, the calendar shape). When the user says so: commit on a branch (`react_landing.html` + `iphone_model/` + `mannequin_model/`; the extracted glTFs are runtime assets). The tunables are all small consts in the module — scroll-keyed beat windows (`smooth(vh*a, vh*b, curY)` for the phone/bust; rect-keyed `clamp01((vh*2.1 - rect.top)/...)` for the bubble/calendar), anchor placement in `assemblyCenter`/`2`/`3`, shape sizes (`HEAD_H`, `CLOUD_W`, `CAL_W`), particle count `N`.
- **CC-BY credit line** for the two models still needs to be added (footer or a `/credits`) before going public — "polyman" (iPhone) + "CHMIL Studio" (mannequin).
- **AlternatingSections order was changed** (Custom AI Voice & Tone first; Google Calendar Sync in the 3rd slot; SMS Follow-Up moved last) — `reverse` flags kept alternating.
- **PayPal:** blocked on the user creating a PayPal account (sandbox app + 3 subscription plans with the $297 setup fee). Then set secrets + register the webhook.

## Directives
- **Premium aesthetic** — glassmorphism, smooth/calm motion, sleek palette. No generic placeholders.
- **User dislikes badge/pill chips** — keep things clean; don't add little status badges.
- **Safe-edit workflow:** preview-first for big changes; verify served (`HTTP 200`); commit so changes are revertible. The user prefers being asked before large/irreversible moves.
- **Copy:** authoritative, concise, persuasive SaaS tone.
- Local server must be running when testing (avoids CORS).

## Related
- [[index]] — vault map of content
- [[claude]] — context & directives for Claude
