# Website — implementation plan

Status: **W1, W2, and W3 built** · 2026-09-30

Source of truth: [README.md](README.md) (increments, open decisions) and
[specs/](specs/) ([site.md](specs/site.md), [content-pipeline.md](specs/content-pipeline.md),
[tech.md](specs/tech.md)). This file maps the increments to tasks and records
the decisions taken while building. A deviation from a spec is also written
into that spec.

## This session

| Increment | State |
| --- | --- |
| Repo infrastructure (git, license, CI, deploy workflow, agent guide) | Done |
| W1 Skeleton and product pages | Done, except the GitHub Pages deploy itself (workflow written, not run) |
| W2 Content pipeline | Done, except the scheduled ref-bump PR and the weekly external link check |
| W3 Digital trust essay, How it works, playground | Done: playground runs `@dtp/trust-graph` / `@dtp/trust-query` (vendored, W-D9) on corpus scenarios, with drawing and CI guard. Open: `demo-chain` data (no such corpus case yet) |
| W4 Docs: API reference, server guides | Not started (the server specs are already rendered under `/docs`) |
| W5 Translations | Not started (i18n structure in place) |

## Decisions

| ID | Decision | Why |
| --- | --- | --- |
| W-D1 | **Open.** Placeholder: GitHub Pages project site `https://digitaltrustprotocol.github.io/Website/`. `SITE_ORIGIN` and `BASE_PATH` are build-time environment variables, so a custom domain is a workflow change. Contact stays `attention@trust.dance`. | Domain not chosen yet |
| W-D2 | **React Router v7 framework mode with `prerender`** (7.18.x), `ssr: false`, every route prerendered. React Router 8 exists; moving is a separate, later change. Its `v8_*` future flags change prerender request URLs (`v8_trailingSlashAwareDataRequests`, `v8_passThroughRequests`), so `routeFromPathname` must be adapted in that change; the build prints the future-flag notices until then. | Spec choice; it works |
| W-D4 | **Mermaid in the browser, lazily.** The build keeps the diagram source as text (readable without JavaScript). The enhance script loads Mermaid from a self-hosted chunk only on pages with diagrams, only when one scrolls into view, with `securityLevel: 'strict'`. | Build-time SVG needs a headless browser (Puppeteer/Playwright + Chromium) in every build; too heavy for a static site. Four pages have diagrams. |
| W-D5 | **oxlint** (`--deny-warnings`). | Same linter as the extension |
| W-D6 | **Static pages without router hydration.** Production pages ship prerendered HTML, CSS, a hashed theme bootstrap, and one small enhance script (theme toggle, diagrams, islands). The playground is a React island loaded on demand. `npm run dev` still hydrates. | A hydrated React Router page costs ≈ 130 KB gzip before any page code (React DOM 66 KB, React + router 42 KB, i18next 17 KB), over both budgets (100 KB marketing, 60 KB docs). Static pages load 2.4 KB. This matches tech.md's "React where it is needed". |
| W-D7 | **One ref per repo.** Every source of a repo is pinned to the same commit (validated). The TrustGraph, PersonalServer, and GlobalServer sources are pinned to their local `Import design specs` commits. | Blob links into a repo need one ref; one commit per repo is easier to review |
| W-D8 | **Unpublished repos render placeholder pages.** `content:sync --remote` skips a repo that is not on GitHub yet with a warning; its routes show "Not published yet" (noindex, left out of the sitemap) so links into them stay valid. | TrustGraph, PersonalServer, and GlobalServer are not on GitHub yet |
| W-D9 | **The playground engine is vendored.** `npm run engine:vendor` compiles `@dtp/trust-graph`, `@dtp/trust-protocol`, `@dtp/trust-query`, and `@dtp/conformance` from TrustGraph `src/` at one commit (read with `git show`, TrustGraph's own `tsconfig.base.json`) and copies `corpus/` into the committed `vendor/trust-graph/`, locked by `VENDOR.json` (sha256 per file, checked in CI). `@dtp/*` resolve there through `vite.aliases.ts` and tsconfig `paths`. `npm run content:pin` re-pins every repo to its sibling HEAD, re-syncs, and re-vendors at the new TrustGraph ref. Today the engine is vendored at TrustGraph `5fd8914` while the specs stay pinned at `8a4c43a` (that commit predates the packages; re-pinning is the orchestrator's step); `content:build` warns until they match. | The packages are unpublished and TrustGraph is not on GitHub, so CI can neither `npm install` them nor check out TrustGraph. `file:` dependencies would read a sibling's working tree (not a ref) and break in CI; vendoring TrustGraph's gitignored `dist/` would not be tied to a commit. Compiling the sources at a commit is reproducible, needs no network, and keeps the playground on the exact code the extension runs. |
| — | Sitemap additions: `/protocol/attention-nostr` (`nostr-protocol.md`), `/docs/resolver-api`, `/docs/library`, `/docs/telemetry`, `/docs/personal-server/<spec>`, `/docs/global-server/<spec>`. `/docs/api` stays reserved for the generated AsyncAPI reference (W4). Recorded in site.md. | Rendered specs need routes |
| — | TypeScript 6.0 (as the extension), Vite 8, Vitest 4, i18next 26. `public/locales/en.json` is bundled for prerendering; other locales fall back to English. | Match the extension's toolchain |
| — | Theme choice is kept in `localStorage` (`dtp-theme`); no cookies. The About page says so. | Privacy of the site |
| — | Attention's product status is shown as **beta** (proof of concept, store listing in preparation). | Assumption; adjust in `content/pages/en/home.mdx` and `code.mdx` |

## Increments

Each item has an acceptance check; `npm run check` (lint, typecheck, tests,
build with link check, CSP, and budgets) must pass before every commit.

### W1 — Skeleton, Home, Attention, privacy policy, Code, deploy

- [x] Git repo, MIT license (holder line from AttentionX), `.editorconfig`, `.gitignore`, `AGENTS.md`.
  *Check:* first commit contains only the imported specs.
- [x] Layout: header with navigation, footer (code, protocol, privacy, contact), skip link, light/dark theme with toggle, design tokens, CSS Modules.
  *Check:* `app/app.test.tsx` (navigation, toggle labels); theme toggle test (`app/enhance/theme-toggle.test.ts`); no flash of the wrong theme (hashed head script).
- [x] Routes per site.md: `/`, `/trust`, `/how-it-works`, `/protocol`, `/attention`, `/attention/privacy`, `/attention/support`, `/personal-server`, `/global-server`, `/docs`, `/code`, `/about`, plus a static `404.html`.
  *Check:* route test; build prerenders 36 pages.
- [x] Page copy per site.md page specs and copy rules; Website-authored MDX in `content/pages/en/`.
  *Check:* copy-rule test (no "score" of a person); every MDX page has a route.
- [x] Screenshots from the extension's `store/` folder at `ccd7c46`, converted to WebP (1280×800, 14–114 KB), with alt text; brand mark adapted from `AnimatedWotLogo` / `PulseLogo` / `TopoBg` (copied, not imported).
- [x] `/attention/privacy` rendered from `BrowserExtension/docs/privacy.html` at the pinned commit.
  *Check:* sources test; build renders it through the pipeline.
- [x] Site privacy: no cookies, no analytics, no third-party hosts; per-page CSP meta tag with hashes of the page's inline scripts.
  *Check:* `scripts/lib/html.test.ts`; postbuild fails if a page keeps the placeholder.
- [x] SEO: per-page title and description, canonical URL, Open Graph tags, `sitemap.xml`, `robots.txt`.
- [x] Budgets: JavaScript up front 2.4 KB gzip per page (budget 100 / 60 KB).
  *Check:* postbuild measures every page and fails over budget.
- [x] `npm run preview` serves `build/client` with GitHub Pages rules.
- [x] Deploy workflow for GitHub Pages (`.github/workflows/deploy.yml`) — written, **not run**.
- [ ] Deploy to GitHub Pages. *Blocked:* needs the `DigitalTrustProtocol/Website` repo and Pages enabled.
- [ ] Open Graph images generated at build time (only Attention has an image today).
- [ ] Playwright smoke test and Lighthouse CI (tech.md) — not set up; browser checks were manual this session.

### W2 — Content pipeline

- [x] `content.sources.json` (`id`, `repo`, `path`, `ref`, `route`, plus `section`, `title`, optional `status`, `kind`) for the NIPs, two questions, `nostr-protocol.md`, the privacy policy, the six TrustGraph specs, five PersonalServer and seven GlobalServer specs. Validated on load.
  *Check:* `app/content/sources.test.ts`.
- [x] `npm run content:sync` with `--local` (default: sibling checkouts at the pinned ref via `git show`; working tree with a warning when a sibling has no git) and `--remote` (GitHub raw at the ref; repo file list from the GitHub API; unpublished repos skipped with a warning).
  *Check:* `scripts/lib/sync.test.ts` (temporary git repo; fake GitHub).
- [x] Transform: remark + GFM, raw HTML sanitized with GitHub's allowlist, GitHub-compatible slugs, link rewriting (rendered source → route + anchor; other file → GitHub blob/tree URL at the ref; external unchanged with `rel="noopener"`; unknown relative path → build error), Shiki highlighting (light/dark), tables in scroll regions, heading anchors, Mermaid placeholders.
  *Check:* `scripts/lib/links.test.ts`, `scripts/lib/render.test.ts`; `content:build` checks 149 internal links and their anchors across the 24 sources.
- [x] Frame: title from the source, status badge, English-only notice, table of contents, source footer (`Source: <repo> · <path> @ <ref> · Edit on GitHub`), warning when a local build read an unpinned working tree.
- [x] `/protocol/*` and `/docs/*` spec pages rendered from sources.
- [x] "Rules at a glance" box on `/protocol/wot-model` with `modelVersion: dtp-wot/1`; `content:build` fails when it differs from the pinned `wot-model.md`.
  *Check:* `scripts/lib/pages.test.ts`.
- [x] Link checker over the built HTML (files, assets, anchors, base path).
  *Check:* `scripts/lib/link-check.test.ts`; runs in every build.
- [x] CI workflow: lint, typecheck, test, remote content sync (cached by `content.sources.json` hash), build.
- [ ] Scheduled workflow that opens a PR bumping refs with a diff of changed sources.
- [ ] Weekly external link check.
- [ ] Mermaid at build time — replaced by decision W-D4.

### W3 — Digital trust, How it works, playground

- [x] `/trust` essay (every key message from site.md, each linked to its spec section).
- [x] `/how-it-works` steps 1–7, including lenient and strict binding side by side.
- [x] Playground shell: controls (root, subject, green and red knobs, max degree, time, binding mode, statement toggles), results table as text alternative, demo-graph types shaped like model records, React island in a lazy chunk (84 KB gzip, budget 250 KB), no network calls.
  *Check:* `app/app.test.tsx` renders it with no engine and with a fake engine.
- [x] **Engine:** `trust-graph-engine.ts` builds the heap with the corpus runner (`buildState`) and answers with `runTrust` → `executeTrustQuery` → `IndexResolver`; `loadPlayground()` imports it on demand. Dependency by vendoring (decision W-D9).
  *Check:* `app/components/playground/corpus-guard.test.ts`; `scripts/lib/engine-vendor.test.ts`.
- [x] Scenarios from TrustGraph corpus model cases (15 cases, 33 presets: walk, threshold, path, bind), including one X account with two competing npub hints (`bind-03-own-bio-beats-friend-hint`). Controls, statement / claim / own-evidence toggles, and a corpus check per preset; gap cases show the proposed model rule beside the heap's answer.
- [ ] Demo graph from the corpus `demo-chain` cases and `AttentionX/docs/demo-wot.md`. *Blocked:* the corpus has no `demo-chain` case yet (TrustGraph conformance.md lists it as planned); add its id to `SCENARIO_IDS` when it exists.
- [x] Graph drawing with `react-force-graph-2d` (own lazy chunk) and path highlighting; the results table stays the text alternative.
- [x] CI guard: every preset through the page's engine and controls compared with its corpus case; vendored files checked against `VENDOR.json`. Playground budget measured as the island plus everything it imports: 160.7 KB gzip of 250 KB (island 86.4 KB, drawing 43.7 KB, shared d3 helpers 15.7 KB, engine with scenarios 13.2 KB).
  *Check:* postbuild fails over budget.

### W4 — Docs

- [ ] `/docs/api` generated from `TrustGraph/asyncapi/resolver.v1.yaml` (file does not exist yet).
- [ ] `/docs/library` usage guide once packages are published (the spec is rendered today).
- [ ] Website-authored install and operations guides for both servers until their repos have `docs/`.
- [ ] `/global-server/privacy` before a public endpoint opens.

### W5 — Translations

- [ ] `public/locales/{da,de,es,fr,it,pt}.json` for UI strings (i18next already lists the locales and falls back to English).
- [ ] `content/pages/<locale>/*.mdx`, locale-prefixed routes, `hreflang`, and the "missing translation" notice.
- [ ] Localized notice on rendered specs (the English one exists).

## Blockers and decisions for the user

1. **W-D1 domain and host.** Until decided, the deploy workflow targets `https://digitaltrustprotocol.github.io/Website/`.
2. **GitHub repo and Pages.** Create `DigitalTrustProtocol/Website`, push, and enable Pages (source: GitHub Actions). Nothing was pushed.
3. **Chrome Web Store URL.** No public listing exists; "Add Attention to Chrome" points to `/attention#install`. Set `CHROME_WEB_STORE_URL` in `app/lib/site.ts` when it does.
4. **Privacy URL continuity.** `https://digitaltrustprotocol.github.io/BrowserExtension/privacy.html` is served by the BrowserExtension repo's own Pages site from `docs/privacy.html`; this site does not replace it. After a domain move, the redirect page (site.md step 2) must be added in the BrowserExtension repo, which this project may not modify.
5. **Publishing TrustGraph, PersonalServer, GlobalServer.** Until they are on GitHub, CI renders placeholders for their 18 pages and cannot check `modelVersion`. Their pinned refs are local commits; keep those commits when pushing (or bump the refs).
6. **Re-pin (orchestrator).** `npm run content:pin` (preview with `npm run content:pin -- --dry-run`) pins TrustGraph, PersonalServer, GlobalServer, and BrowserExtension to their sibling HEADs, re-syncs, and re-vendors the playground engine at the new TrustGraph ref; then `npm run check` and commit. Until then the engine (TrustGraph `5fd8914`) and the TrustGraph specs (`8a4c43a`) come from different commits.
7. **Attention status label** (beta) and the **team line** on `/about` (Carsten Keutmann and contributors) are assumptions to confirm.

## Asset provenance

| Website file | Source |
| --- | --- |
| `public/screenshots/attention-*.webp` | `BrowserExtension/store/screenshot-0{1..6}-1280x800-*.png` @ `ccd7c46`, converted to WebP (quality 82) |
| `public/brand/attention-promo-1400x560.png` | `BrowserExtension/store/promo-marquee-1400x560.png` @ `ccd7c46` |
| `public/brand/attention-icon.svg` | `BrowserExtension/public/icons/icon-base.svg` @ `ccd7c46` |
| `public/brand/wot-mark.svg`, `app/components/brand/WotMark.tsx` | Geometry copied from `BrowserExtension/src/components/AnimatedWotLogo` |
| Hero background and pulse | Adapted from `TopoBg` and `PulseLogo` CSS |
