# Website — technology, playground, hosting

Status: **draft** · 2026-09-30

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript (strict) | Same as the extension |
| Build | Vite | Same as the extension |
| Routing and static output | React Router v7 framework mode with `prerender` for every route (decision W-D2, taken: React Router over `vite-react-ssg`). Production pages ship without router hydration: static HTML plus one small enhance script; interactive parts are React islands loaded on demand (decision W-D6) | Static HTML per page for SEO and fast first paint; React where it is needed. A hydrated router page costs ≈ 130 KB gzip, over both JavaScript budgets |
| Content | MDX (`@mdx-js/rollup`) + the pipeline in [content-pipeline.md](content-pipeline.md) | One format for authored and imported pages |
| i18n | `i18next` + `react-i18next`, locale JSON like the extension's `public/locales` | Shared habits and translators |
| Styling | CSS Modules + design tokens (light / dark via `prefers-color-scheme` and a toggle) | No runtime CSS-in-JS |
| Graph drawing (playground) | `react-force-graph-2d`, the library the extension's Graph View uses | Visual consistency |
| Tests | Vitest, Playwright smoke, Lighthouse CI | |

Brand assets (logo, topographic background) are exported from the extension
as SVG files. The Website does not import extension source code.

## Repository layout

```text
Website/
  app/
    routes/            one file per route in the sitemap (one shared module for rendered sources)
    components/        layout, cards, badges, spec frame, playground
    enhance/           the only up-front script in production (theme, diagrams, islands)
    styles/            tokens, globals
  content/
    pages/<locale>/    Website-authored MDX
    _imported/         fetched and rendered sources (not committed)
  public/
    locales/           da, de, en, es, fr, it, pt
    brand/             SVG assets
    screenshots/       extension screenshots (WebP)
  scripts/
    content-sync.ts    fetch pinned sources (--local | --remote)
    content-pin.ts     re-pin every repo to its sibling HEAD, re-sync, re-vendor
    engine-vendor.ts   build vendor/trust-graph at the TrustGraph pin (--verify)
    content-build.ts   render sources, check links, anchors, modelVersion
    postbuild.ts       static pages, CSP, sitemap, link check, budgets
    preview.ts         serve build/client like GitHub Pages
  vendor/trust-graph/  TrustGraph packages (compiled) and corpus at one commit (generated, committed)
  content.sources.json
  specs/               these design specs
```

## Playground

Interactive demo on `/how-it-works`.

- **Engine:** `@dtp/trust-graph` and `@dtp/trust-query` running in the
  browser, the same code as the extension and the Personal Server. The
  playground is a *client* of the model; it never re-implements the walk.
  It builds the heap and asks its questions through the corpus runner of
  `@dtp/conformance` (`buildState`, `runTrust`), so a playground answer and a
  conformance run are the same call.
- **Dependency (decision W-D9):** while the packages are unpublished, the
  Website vendors them. `npm run engine:vendor` reads TrustGraph at one
  commit with `git show` (never its working tree), compiles
  `packages/{trust-graph,trust-protocol,trust-query,conformance}/src` with
  TrustGraph's own `tsconfig.base.json`, and writes JS + declarations, the
  package manifests, and `corpus/` byte for byte into `vendor/trust-graph/`
  with `VENDOR.json` (commit, versions, sha256 per file). The folder is
  committed, so local builds and CI need no TrustGraph checkout, no
  network, and no TrustGraph build. `@dtp/*` imports resolve to it through
  Vite aliases (`vite.aliases.ts`) and tsconfig `paths`. The vendored commit
  follows the TrustGraph ref in `content.sources.json`; `npm run
  content:pin` moves both, and `content:build` warns while they differ.
  Once the packages are published, the aliases are replaced by npm
  dependencies at the same versions and `vendor/` is deleted.
- **Data:** scenarios are TrustGraph corpus model cases (`walk-*`,
  `threshold-*`, `path-*`, `bind-*`; list in
  `app/components/playground/scenarios.ts`), with their `@name`
  placeholders shown as names. Each corpus query of a case is a preset of
  the controls. The corpus has no `demo-chain` case yet; when it has one
  (built from the extension's demo WoT seed, `AttentionX/docs/demo-wot.md`,
  about 20 people, a few X accounts and posts), it joins the list.
- **Controls:** root, subject, green knob (0–100), red knob, max degree
  (1–7), binding mode (lenient / strict), time slider (for `x` / `y`
  windows), and toggles to add or remove one statement or one `10011` claim.
- **Output:** resolution, degree, trust / distrust / Neutral counts, the
  evidence list, the path highlighted on the graph, each X account's
  binding as the heap holds it, and a corpus check: whether the answer equals
  the corpus expectation for the selected preset. For cases with a known gap
  the check uses the corpus `expectCurrent` (what the library does today)
  and shows `expectModel` (the proposed rule) beside it.
- **Data** also includes one X account with two competing npub hints
  (`bind-03-own-bio-beats-friend-hint`: the root's own Bio says P, a
  friend's hint says Q). Today's heap binds the same way in both modes
  (TrustGraph gap G8), so lenient and strict take different routes only
  once the library closes G8; until then the proposed rule is shown next
  to the answer. A results table is always shown as the text alternative
  to the canvas.
- **Loading:** a lazy island (≤ 250 KB gzip in total: island, engine with the
  corpus scenarios, and the drawing), loaded only on this page. Postbuild
  measures the island with everything it imports and fails over budget.
- **No network.** A later option, "try with your npub", would query a public
  Global Server and needs explicit consent and a privacy notice.
- **Guard:** CI runs the playground's preset scenarios and compares the
  results with their corpus cases
  (`app/components/playground/corpus-guard.test.ts`: every preset through
  the page's engine and controls, compared with the corpus runner's
  expectation choice and matcher; `vendor/trust-graph` checked against
  `VENDOR.json`).

## Hosting and deploy

- Static output; no server-side code.
- Start on GitHub Pages under the `DigitalTrustProtocol` organization; move to
  a custom domain when chosen (decision W-D1; `trust.dance` already hosts the
  contact address). Cloudflare Pages is the alternative if redirects or
  headers are needed.
- GitHub Actions: build on every PR (preview), deploy on `main`.
- Keep the extension's current privacy-policy URL alive
  ([site.md § Privacy policy URL continuity](site.md#privacy-policy-url-continuity)).

## Budgets

| Budget | Target |
| --- | --- |
| JavaScript on marketing pages | ≤ 100 KB gzip |
| Docs and spec pages | Mostly static HTML; ≤ 60 KB gzip JS |
| Playground chunk | ≤ 250 KB gzip, on demand |
| Largest Contentful Paint (4G, mid-range phone) | ≤ 2.0 s |
| Cumulative Layout Shift | ≤ 0.05 |

## Accessibility

WCAG 2.2 AA: keyboard navigation everywhere (including playground controls),
visible focus, contrast in both themes, `prefers-reduced-motion` respected by
the animated logo and graph, alt text on screenshots, semantic headings in
rendered specs.

## SEO

Prerendered HTML, per-page title and description, Open Graph images generated
at build time, `sitemap.xml`, `robots.txt`, canonical URLs, `hreflang` for
localized pages.

## Privacy of the site itself

The site practices what the protocol preaches:

- No analytics, no cookies, no third-party trackers.
- Fonts and scripts are self-hosted; no CDNs.
- Strict Content Security Policy (meta tag on GitHub Pages; header when a
  host allows it). Each page's policy lists the hashes of that page's inline
  scripts; styles allow `'unsafe-inline'` for highlighted code and diagrams.
- A theme choice is kept in `localStorage`, never sent anywhere.
- Success is measured with Chrome Web Store and GitHub statistics, not with
  visitor tracking.
