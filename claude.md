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

## Current state (as of 2026-06-14)
**Deployed on Vercel** (team `ellevux`, GitHub `Yuvraj-Singh-5492/ellevux`, branch `main` — pushing auto-deploys), live at **`ellevux.vercel.app`**. The real **`ellevux.com` still serves an OLD, separate landing** until the DNS cutover (3 GoDaddy `_vercel` TXT records + a fresh Vercel token). `handover.md` has the deploy details + open items.

**Landing:** a single scroll-3D particle system threads a 6-shape story — iPhone → sand → robot bust → voice waveform → chat bubble → location pin → database → calendar → centered Ellevux-logo finale (the old feature mockups were removed; the 3D rides in the empty column beside each feature, ids `feat-voice/-sms/-routing/-crm/-calendar` + `feat-logo`). It's **capability-gated** via `window.ENABLE_3D` (full 3D only on capable desktops; phones/weak/software-WebGL/reduced-motion get a static hero + compact features and skip the model download). Perf-tuned (DPR 1.5, fewer particles, precomputed scatter) and the iPhone model shrunk to 5.86MB with immutable caching. Six old small accents stay disabled (CSS fallbacks). Iterate big 3D changes in `iphone-preview.html` first.

**Marketing vs app:** no login on the marketing site (nav = **View Demo + Get Started**); login lives only on the dashboard/app side. **`dashboard.html?demo`** is a no-login interactive demo (sample data, neutered writes, a playable call recording — the old `demo.html` voice demo was merged in; demo.html now redirects). `docs.html` is now a plain-language **"How it works"** page. Em dashes were removed from all copy.

**PayPal paywall (Stripe stopgap) — sandbox fully configured:** table + RLS, deployed+fixed webhook (activates on real payment only), product + 3 plans + webhook + the 4 secrets all set, pipeline tested end-to-end. Remaining = go-live with Live creds. Note: free-tier Supabase **auto-pauses after ~7 idle days** (login/paywall die until Restored). Models are CC-BY-4.0 ("polyman" iPhone, "CHMIL Studio" mannequin) and **still need a credit line before public launch**.

Treat the existing files as the single source of truth. Good luck!
