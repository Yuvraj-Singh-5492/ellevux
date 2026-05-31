# Ellevux — shadcn / TypeScript / Vite component library (literal task deliverable)

This folder is a **self-contained, runnable** project that integrates the three
provided React components **exactly as written** — TypeScript, the shadcn
`@/components/ui` structure, the `cn` helper in `@/lib/utils`, path aliases, and
shadcn design tokens.

> ⚠️ This is the **full shadcn migration** deliverable, separate from the live
> Ellevux site. The live site (`../react_landing.html` etc.) runs the *adapted*
> versions of these components on its CDN/no-build stack. This folder exists to
> satisfy the "integrate this component into a shadcn project" task templates
> literally. It needs **Node.js installed** and a build step.

## Prerequisites
1. **Install Node.js** (LTS) from https://nodejs.org.

## Run it
```bash
cd shadcn-version
npm install        # react, framer-motion, lucide-react, tailwind, typescript, vite, clsx, tailwind-merge
npm run dev        # open the printed http://localhost:5173 URL
```
`src/main.tsx` renders all three component demos stacked, on the dark theme.

## Components (all in `src/components/ui/`, per shadcn convention)
| File | Export | Demo |
|---|---|---|
| `ui/shape-landing-hero.tsx` | `HeroGeometric` | `components/demo.tsx` → `DemoHeroGeometric` |
| `ui/section-with-mockup.tsx` | `SectionWithMockup` (default) | `components/section-with-mockup-demo.tsx` → `SectionMockupDemoPage` |
| `ui/ai-models-preview.tsx` | `AiModelsList` | `components/ai-models-demo.tsx` → `DemoOne` |

## Project structure
```
shadcn-version/
├─ components.json              # shadcn config (aliases: @/components, @/components/ui, @/lib/utils)
├─ index.html                   # <div id="root">, loads /src/main.tsx
├─ package.json
├─ tailwind.config.js           # darkMode:class + shadcn color tokens -> CSS vars
├─ postcss.config.js
├─ vite.config.ts               # @ -> ./src path alias
├─ tsconfig.json / tsconfig.node.json
└─ src/
   ├─ main.tsx                  # renders all three demos; adds .dark to <html>
   ├─ index.css                 # @tailwind + shadcn :root/.dark oklch token vars
   ├─ lib/
   │  └─ utils.ts               # cn() (clsx + tailwind-merge)
   └─ components/
      ├─ demo.tsx
      ├─ section-with-mockup-demo.tsx
      ├─ ai-models-demo.tsx
      └─ ui/
         ├─ shape-landing-hero.tsx
         ├─ section-with-mockup.tsx
         └─ ai-models-preview.tsx
```

## Notes on faithful integration
- **TypeScript preserved** — these are the original `.tsx` sources (types, `interface`,
  `React.FC`, generics intact), unlike the live-site adaptations.
- **`/components/ui` matters** — components are imported as `@/components/ui/<name>`.
  shadcn's convention keeps reusable primitives there so `npx shadcn@latest add <name>`
  has a predictable target and every `@/components/ui/...` import resolves. (The
  `section-with-mockup` task example imported from `@/components/blocks/...`; per the
  task's own "copy to /components/ui" instruction, the file lives in `ui/` and the
  demo import was corrected to match.)
- **Tailwind tokens** — `ai-models-preview` uses shadcn semantic classes
  (`bg-card`, `text-muted-foreground`, `bg-muted`, `ring-border`, `bg-background`).
  The task shipped these as a Tailwind 4 `@theme inline` block; this project is
  Tailwind 3, so the equivalent tokens are defined as CSS variables in
  `src/index.css` (`:root` + `.dark`, the same oklch values) and mapped in
  `tailwind.config.js`. Dark theme is applied by default.
- **Dependencies** — `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`
  are declared in `package.json`; `npm install` pulls them.
- **Images** — `section-with-mockup`'s demo uses the original Fey marketing PNG
  URLs from the task. Swap them for your own/Unsplash assets as needed.

## Scaffold equivalent (from scratch)
```bash
npm create vite@latest ellevux -- --template react-ts
cd ellevux && npm install
npx shadcn@latest init          # components.json, lib/utils.ts (cn), tailwind setup, @ aliases
npm install framer-motion lucide-react
# then drop the three components into src/components/ui/ and the demos into src/components/
```
