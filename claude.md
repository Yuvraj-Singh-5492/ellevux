# Context for Claude

Hello Claude! You are picking up the development of **Ellevux**, an AI receptionist SaaS platform.

## Architecture
- **Frontend:** Vanilla HTML, CSS, JavaScript. Some pages (like `react_landing.html`) might use React via CDN/standalone bundles, and Tailwind CSS for styling.
- **Backend/DB:** Supabase (`supabase-config.js`).

## Current State
The project has multiple HTML files representing the core pages (Landing, Login, Signup, Dashboard, Pricing, Demo, Docs, Changelog). 
A local development server is currently running on port 3000 to view the pages correctly and prevent CORS issues.

## Important Directives for Development
1. **Premium Aesthetic:** The user expects a highly polished, modern, and "premium" design. Avoid generic placeholders. Use dynamic animations, glassmorphism, and sleek color palettes.
2. **Local Server:** Always assume the project needs to run on `localhost` (e.g., via Python or Node server) rather than raw file paths.
3. **Copywriting:** Maintain an authoritative, concise, and persuasive tone for SaaS marketing copy.

## Recent Context
I recently finalized some layout adjustments on the hero section of `react_landing.html` (specifically headline sizing and graphic centering), as well as copy updates to the FAQ and ToS. Proceed with standard front-end web development practices taking these existing files as the single source of truth.

Good luck!
