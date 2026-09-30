# Website — technology, playground, hosting

Status: **draft** · 2026-09-30

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript (strict) | Same as the extension |
| Build | Vite | Same as the extension |
| Routing and static output | React Router v7 framework mode with `prerender` for every route (decision W-D2: vs `vite-react-ssg`) | Static HTML per page for SEO and fast first paint; React where it is needed |
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
    routes/            one file per route in the sitemap
    components/        layout, cards, badges, spec frame, playground
    styles/            tokens, globals
  content/
    pages/<locale>/    Website-authored MDX
    _imported/         fetched sources (not committed)
  public/
    locales/           da, de, en, es, fr, it, pt
    brand/             SVG assets
  scripts/
    content-sync.ts    fetch pinned sources
  content.sources.json
  specs/               these design specs
```

## Playground

Interactive demo on `/how-it-works`.

- **Engine:** `@dtp/trust-graph` and `@dtp/trust-query` running in the
  browser, the same code as the extension and the Personal Server. The
  playground is a *client* of the model; it never re-implements the walk.
- **Data:** a small demo graph (about 20 people, a few X accounts and posts)
  built from the corpus `demo-chain` cases and the extension's demo WoT seed
  (`AttentionX/docs/demo-wot.md`).
- **Controls:** root, subject, green knob (0–100), red knob, max degree
  (1–7), binding mode (lenient / strict), time slider (for `x` / `y`
  windows), and toggles to add or remove one statement or one `10011` claim.
- **Output:** resolution, degree, trust / distrust / Neutral counts, the
  evidence list, the path highlighted on the graph, and each X account's
  binding (bound, unconfirmed, or cut with the reason).
- **Data** also includes one X account with two competing npub hints, so the
  two modes visibly take different routes (TrustGraph identity-binding.md §7). A results table is
  always shown as the text alternative to the canvas.
- **Loading:** a lazy route chunk (≤ 250 KB gzip), loaded only on this page.
- **No network.** A later option, "try with your npub", would query a public
  Global Server and needs explicit consent and a privacy notice.
- **Guard:** CI runs the playground's preset scenarios and compares the
  results with their corpus cases.

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
  host allows it).
- Success is measured with Chrome Web Store and GitHub statistics, not with
  visitor tracking.
