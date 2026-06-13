# Context for Claude

Hello Claude! You are picking up development of **Ellevux**, an AI receptionist SaaS for service businesses. Read this + `handover.md` before starting.

## Architecture
- **Frontend:** Multi-page **static site** (HTML/CSS/JS). `react_landing.html` runs **React via CDN + in-browser Babel** — there is **no build step, no npm, no bundler**. Tailwind is the **CDN build (v3)**, configured inline per page.
- **CDN globals** (not ES imports): React, `window.Motion` (framer-motion), `window.lucide`, Supabase.
- **three.js r0.149 is loaded as an ES module via an importmap** (only the landing's scroll-3D hero overlay uses it — a self-contained `<script type="module">` importing `three` + `GLTFLoader` + `MeshSurfaceSampler` + `RoomEnvironment`). The UMD `three.min.js`/`window.THREE` was **removed** to cut load, so the six small mockup accents now show their CSS fallbacks. For r0.149, addons only exist as `examples/jsm` ESM — there is no `THREE.GLTFLoader` UMD global.
- **Backend/DB:** Supabase via `supabase-config.js`, which exposes **`window.supabaseClient`** — reuse it; never call `createClient` yourself or reference `window.SUPABASE_URL` (it's undefined → breaks all auth).

## Hard constraints (don't fight these)
1. **No TypeScript in the live pages** — the inline Babel has no TS preset; strip type annotations/`interface`/generics. (The `shadcn-version/` folder is the only place real .tsx lives, and it needs Node, which isn't installed.)
2. **Node is NOT installed; Python 3.12 IS.** Run via `python -m http.server 3000` from the project root; open pages directly (`http://localhost:3000/<page>.html`). Hard-refresh / `?v=N` to bust cache.
3. **Git is installed but NOT on PATH** — call it as `"C:\Program Files\Git\cmd\git.exe"`. Project is a git repo; commit work so it's revertible.
4. **Adapt component-integration tasks** (shadcn/.tsx snippets) to this stack — plain JS, CDN globals, palette-mapped Tailwind classes. Don't paste .tsx verbatim into live pages (it won't run).
5. **PowerShell output here glitches** (empty/duplicated returns). Reliable pattern: write results to a temp file with `[System.IO.File]::WriteAllText(...UTF8 no BOM)`, then read it back; clean up after. Avoid parallel git/PowerShell calls (they collide). `Remove-Item` with globs can hit the protected project root — delete by literal path.

## Directives for development
1. **Premium aesthetic** — polished, modern, glassmorphism, sleek palette, calm purposeful motion. No generic placeholders. (A `ui-ux-design` skill + many design/animation/3D skills are installed — use them.)
2. **User dislikes little badge/pill chips** — lean minimal; don't add status badges/trust-chip rows (they've been removed repeatedly).
3. **Safe-edit workflow** — for big/risky changes, build a preview file first and let the user eyeball it before touching live pages; verify `HTTP 200`; keep `.bak`/commits. Ask before large or hard-to-reverse moves; don't build big things unprompted (the user said: "don't create anything by yourself, I'll tell you what to make").
4. **I can't download/source files or skills** from the internet (no fetch tool). Models/skills/credentials must come from the user; I then wire them up.
5. **Copywriting:** authoritative, concise, persuasive SaaS tone.

## Current state (as of this session)
The whole site was redesigned earlier (shared glass header via `nav.js` + React Navbar, reduced footer, site-wide glassmorphism, redesigns of pricing/docs/changelog/demo/login/signup/dashboard).

The landing page now has a **4-beat scroll-driven 3D hero** (a single particle system in a self-contained `<script type="module">`): **iPhone 15 Pro** (real GLTF with a "calling Ellevux" screen) → dissolves to **sand** → reassembles into a **robot bust** (surface-sampled from `mannequin_model`) at the features grid → disintegrates → reforms into a **chat bubble** at the Custom AI Voice section → reforms into a **calendar** at the Google Calendar Sync section. Built/validated in `iphone-preview.html` first, then spliced live. The six old small Three.js accents are disabled (UMD `three.min.js` removed to cut load → CSS fallbacks). **This 3D work is LIVE but not yet git-committed; the two models are CC-BY-4.0 and need a credit line before launch.** See `handover.md` for tunables + the commit plan.

A **PayPal paywall** (Stripe stopgap) is scaffolded (table + deployed Edge Function + pricing wiring) and **blocked on the user's PayPal account**.

Treat the existing files as the single source of truth. Good luck!
