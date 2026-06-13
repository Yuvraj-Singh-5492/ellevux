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

## Deployment (Vercel)
- Hosted on **Vercel**, team **ellevux**. GitHub repo **github.com/Yuvraj-Singh-5492/ellevux**, production branch **`main`** (local work is on the `site-redesign` branch, pushed to remote `main`). **Pushing to `main` auto-deploys** — no Vercel token needed for code deploys (Node isn't installed → the Vercel CLI is out; GitHub→Vercel cloud build is the path). Live at **`ellevux.vercel.app`**.
- `vercel.json`: host-based rewrites (`app.ellevux.com/` → `/dashboard.html`, every other `/` → `/react_landing.html`) + immutable caching for `/iphone_model` + `/mannequin_model`. `.vercelignore` keeps internal/dev files (`*.md`, `.obsidian/`, `supabase/`, `shadcn-version/`, `iphone-preview.html`) OUT of the public deploy.
- **Tokens** (the user generates short-lived, revocable ones on request; never commit them): GitHub fine-grained PAT (git push), Vercel token (project/domain API — note: SAML scope re-auth expiry on the team), Supabase access token (Management API + CLI `secrets set`).
- The `deployment-plan` + `paypal-paywall` memory files hold the live IDs/refs; DNS-cutover steps are under "In progress".

## Project Structure
- `react_landing.html` — main landing page (React/CDN) + the **scroll-driven 3D hero overlay** (self-contained ES module near `</body>`, gated by `window.ENABLE_3D` set in an inline `<head>` script). Blocks: `Navbar` (now **View Demo + Get Started**, no login), `Hero`, `HeroShapes`, `HeroMockup`, `MiniBentoGrid` (`id="features-bento"`, the bust anchor), `AlternatingSections` (the **5 feature sections**, mockups removed; ids `feat-voice`/`feat-sms`/`feat-routing`/`feat-crm`/`feat-calendar` that the 3D beats anchor to), an empty `feat-logo` div (logo-finale anchor), `CTA`, `Footer`. `*.bak` backups are gitignored.
- `iphone_model/` (`scene.gltf` + `.bin` + textures) — iPhone 15 Pro, CC-BY-4.0 "polyman". `mannequin_model/` (`scene.gltf` + `.bin`) — CHMIL Mannequin Bust, CC-BY-4.0 "CHMIL Studio". Both are runtime assets for the hero overlay (the iPhone is rendered + dissolved; the mannequin is **only surface-sampled** for the bust shape, never rendered). The `apple_iphone_15_pro_black.zip` / `chmil_mannequin_bust_2024.zip` are the source archives. **Both models need a CC-BY credit line before public launch.**
- `iphone-preview.html` — standalone validation harness for the scroll-3D overlay (kept in sync with the live module; has a debug HUD + mock sections). Iterate/eyeball big 3D changes here first, then splice to `react_landing.html`.
- `nav.js` — shared refined header on the static marketing pages (pricing / how-it-works / changelog). **No login** (View Demo + Get Started); fully static now (no Supabase session check). Dashboard, login, and signup have their own headers.
- `dashboard.html` — the app shell (sidebar + tabs: overview/agents/calls/calendar/settings) behind login. Data via `window.supabaseClient`. **`?demo`** runs it logged-out with seeded sample data + a playable call recording (the merged voice demo) — all behind a `DEMO` flag (real dashboard untouched).
- `login.html` / `signup.html` — split-screen auth; email/password + Google OAuth. The gateway to the dashboard (the marketing site no longer links to login).
- `pricing.html` — tiers (Growth dominant) + Enterprise strip + FAQ. PayPal paywall wired (sandbox client-id + plan IDs live; express-only checkout).
- `demo.html` — now just a **redirect** to `dashboard.html?demo&play` (the standalone voice demo was folded into the dashboard demo). `demo.mp3` is the call recording the demo plays.
- `docs.html` — rewritten as the plain-language **"How it works"** page (kept the filename + capability anchor ids so feature links still work). `changelog.html` — filterable timeline.
- `supabase-config.js` — exposes `window.supabaseClient` (do NOT recreate the client).
- `supabase/` — `schema/subscriptions.sql` + `functions/paypal-webhook/` (Edge Function).
- `shadcn-version/` — standalone Vite+TS+shadcn project holding the literal .tsx component deliverables (needs Node; not part of the live site).
- `logo.png` (cropped wordmark) + `logo-icon.png` (icon only, used in the header lockup).
- `PAYPAL_SETUP.md` — step-by-step for finishing the PayPal paywall.

## What's been done (this redesign cycle)
- **Site-wide visual overhaul:** refined floating-glass header (shared `nav.js` + React Navbar) with logo lockup (icon + "ellevux" text); redesigned footer (multi-column, socials reduced to **Instagram + email only**); hero CTAs unified to pill+arrow+hover-lift.
- **Real glassmorphism** applied consistently (gradient surface + top light-catch + sheen + `saturate`, dedicated classes so the global `.glass-panel` stays safe) across: landing features + product mockups, dashboard cards, pricing cards, docs cards, changelog cards, demo player. Home and dashboard glass/grid values were matched.
- **Redesigns:** changelog (single-rail filterable timeline), docs (sticky scrollspy sidebar + search), demo (two-panel player + transcript; fixed a fake-animation bug), login/signup (split-screen), dashboard (glass cards, hero-style ambient bg), pricing (dominant Growth tier, real copy, $297 setup-fee callout, FAQ).
- **Scroll-driven 3D hero (the centerpiece):** one particle system now threads a **6-shape narrative** through the page — **iPhone 15 Pro** (real GLTF, "calling Ellevux" screen) dissolves to titanium **sand** → **robot bust** (surface-sampled from `mannequin_model`) → then through all five feature sections, alternating sides into the empty columns: **voice waveform** (Custom AI Voice, `feat-voice`) → **chat bubble** (SMS, `feat-sms`) → **location pin** (Multi-Location, `feat-routing`) → **database cylinder** (CRM, `feat-crm`) → **calendar** (Google Calendar, `feat-calendar`) → **Ellevux logo** finale (centered, sampled from `logo.png`, anchored to an empty `feat-logo` div). The tail is a generalized `FEAT` beat-array (each entry: target cloud + anchor id + side + width) + one morph loop; the iPhone→bust intro stays hardcoded. The old feature MOCKUPS were removed (sections are text + an empty column the 3D rides in); sections reordered/tightened to `min-h-[50vh]`.
- **Capability-gated (Option C):** an inline `<head>` script sets `window.ENABLE_3D` once — true only on capable desktops (not touch/`pointer:coarse`/mobile UA, ≥4GB + ≥4 cores, hardware-accelerated WebGL, not reduced-motion). Otherwise the module bails early (no renderer, no 5.86MB model download) and `AlternatingSections` drops the min-heights + empty columns for a compact static layout. This also fixes Brave-without-HW-accel (software WebGL → off).
- **Perf:** renderer DPR capped at **1.5**, particle count trimmed (~5200 desktop), per-particle scatter basis precomputed once. The iPhone model was shrunk **9.45MB → 5.86MB** (stubbed the runtime-overridden screen emissive, downscaled normal/metallicRoughness maps to 512). `vercel.json` sets immutable 1-yr caching on `/iphone_model` + `/mannequin_model` (was re-validating every load → the "smooth local / janky live" gap).
- **The six small mockup 3D accents stay disabled** (UMD `three.min.js` removed) — CSS fallbacks.
- **PayPal paywall (sandbox fully configured):** `subscriptions` table + RLS, `paypal-webhook` Edge Function deployed AND **fixed** (activates only on real payment — ACTIVATED/PAYMENT.SALE.COMPLETED, NOT SUBSCRIPTION.CREATED, which had granted free access on popup-open). Product + 3 plans (Starter/Growth/Scale, each $297 setup fee) + webhook created via API; the 4 function secrets are set; the full pipeline was tested end-to-end in sandbox. Checkout is express-only (`disable-funding=card,credit,paylater`). Remaining = go-live with Live creds. See PAYPAL_SETUP.md.

- **Marketing / app split:** the site now has NO login (login lives only on the dashboard/app side). The nav (React `Navbar` + `nav.js` + footer) leads with **View Demo** + **Get Started**; `nav.js` no longer touches Supabase. Login/signup remain the gateway to `dashboard.html`.
- **Interactive demo dashboard:** `dashboard.html?demo` runs the console with no login, seeded sample data (agents + calls), neutered writes, and a "Live demo" pill + Get Started CTA — all behind a `DEMO` flag (real dashboard untouched). The old **voice demo was merged in**: a recorded call (`recording:'demo.mp3'`) is playable from the call list → opens an audio + transcript popup (`openCallRecording`). `demo.html` is now just a redirect to `dashboard.html?demo&play`.
- **Docs → "How it works":** `docs.html` was rewritten into a plain-language, jargon-free page (4 steps + capability cards) for non-technical owners; kept the filename + the capability anchor ids so the landing's "Explore capability" links still work. Nav/footer relabeled "How it works".
- **Copy:** all em dashes removed from user-facing copy (replaced contextually with commas/colons/periods/parentheses).

## In progress / pending
- **DNS cutover to the real domain** is the main open item. The new site is LIVE only at `ellevux.vercel.app`; **`ellevux.com` still serves an OLD, different landing** (on a separate Vercel account) until the cutover. To flip it: user adds 3 TXT records at GoDaddy (host `_vercel`: `vc-domain-verify=ellevux.com,72f57a644a0a5b14fece` / `…www.ellevux.com,ea4ddaa2d1850097ae2c` / `…app.ellevux.com,ae6bbcfc834a42db001e`), then a fresh Vercel token to verify (the prior token hit a SAML re-auth wall). At cutover also point signup/login + Supabase Auth URLs + Google OAuth at `app.ellevux.com`.
- **CC-BY credit line** for the two models before public launch — "polyman" (iPhone) + "CHMIL Studio" (mannequin).
- **PayPal go-live:** repeat the sandbox setup with Live creds (Live app + 3 plans + webhook), swap the IDs in `pricing.html`, set `PAYPAL_API=https://api-m.paypal.com`; clean up the sandbox test rows in `subscriptions`.
- **Supabase free-tier auto-pauses after ~7 idle days** (REST → Cloudflare 521 while gateway 401s answer) — login/dashboard/paywall die until the project is Restored in the dashboard. Decide on keep-alive or Pro before launch.

## Directives
- **Premium aesthetic** — glassmorphism, smooth/calm motion, sleek palette. No generic placeholders.
- **User dislikes badge/pill chips** — keep things clean; don't add little status badges.
- **Safe-edit workflow:** preview-first for big changes; verify served (`HTTP 200`); commit so changes are revertible. The user prefers being asked before large/irreversible moves.
- **Copy:** authoritative, concise, persuasive SaaS tone.
- Local server must be running when testing (avoids CORS).

## Related
- [[index]] — vault map of content
- [[claude]] — context & directives for Claude
