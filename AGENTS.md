# Agent guide (Website)

The public site of the Digital Trust Protocol. Specs: [specs/site.md](specs/site.md)
(pages, copy rules), [specs/content-pipeline.md](specs/content-pipeline.md)
(rendering specs from other repos), [specs/tech.md](specs/tech.md) (stack,
budgets, privacy). Plan and decisions: [PLAN.md](PLAN.md).

## Stack

React 19 + TypeScript (strict), Vite 8, React Router v7 framework mode with
`prerender` (static output only), MDX for authored pages, i18next with
`public/locales/<lng>.json`, CSS Modules + tokens in `app/styles/`, Shiki at
build time, oxlint, Vitest. Production pages are static HTML without router
hydration; `app/enhance/` is the only up-front script (decision W-D6).

## Commands

| Command | What it does |
| --- | --- |
| `npm run content:sync` | Fetch pinned sources from sibling checkouts (`--remote`: from GitHub, as CI does) |
| `npm run content:pin` | Re-pin every repo to its sibling's HEAD, re-sync, and rebuild `vendor/trust-graph` (`-- --dry-run` to preview) |
| `npm run engine:vendor` | Rebuild `vendor/trust-graph` at the TrustGraph pin (`-- --ref <commit>`; `-- --verify` checks the lock) |
| `npm run dev` | Dev server (hydrated) |
| `npm run build` | `content:build` → prerender → enhance bundle → postbuild (CSP, sitemap, link check, budgets) |
| `npm run preview` | Serve `build/client` like GitHub Pages |
| `npm run check` | lint + typecheck + test + build; must pass before every commit |

`BASE_PATH` (for example `/Website/`) and `SITE_ORIGIN` configure the deploy target.

## Content rules

- Never hand-copy spec text into pages. Specs are rendered from their owner
  repo at the ref pinned in `content.sources.json`; link to the rendered
  section instead.
- Website-authored prose lives in `content/pages/<locale>/*.mdx` with
  `title`, `description`, `route` frontmatter; UI strings live in
  `public/locales/en.json`. A page that summarizes the model declares
  `modelVersion`, and the build fails when it differs from the pinned spec.
- Copy: plain language; never call a result a person's "score" (say
  trusted / mixed / distrusted / none, or "your circle's evidence").
- No cookies, analytics, third-party hosts, or CDNs. New inline scripts are
  fine (postbuild hashes them into the CSP); new origins are not.
- Keep up-front JavaScript within budget; interactive features are islands
  loaded on demand from `app/enhance/`.
- Never modify the sibling repos (AttentionX, TrustGraph, PersonalServer,
  GlobalServer). Copy assets into `public/` and record their source in PLAN.md.
- The playground never walks the graph itself: it calls the vendored
  `@dtp/trust-graph` / `@dtp/trust-query` through the corpus runner. Never
  edit `vendor/`; regenerate it with `npm run engine:vendor` (decision W-D9).

## Layout

```text
app/routes/           one module per route; source-page.tsx serves every rendered spec
app/components/       layout, content blocks (MDX), source frame, playground island
app/content/          sources config (validated), rendered-page loader (build time only)
app/enhance/          the production up-front script
content/pages/en/     Website-authored MDX
content/_imported/    synced and rendered sources (not committed)
vendor/trust-graph/   TrustGraph packages (compiled) and corpus at one commit, with VENDOR.json (generated)
scripts/              content-sync, content-pin, engine-vendor, content-build, postbuild, preview; logic in scripts/lib
```
