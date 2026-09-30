# Website — content pipeline

Status: **draft** · 2026-09-30

## Rule

Specs have one source of truth: the repo that owns them. The Website renders
them at a pinned commit and never keeps a hand-edited copy.

| Owner repo | Files rendered |
| --- | --- |
| `DigitalTrustProtocol/BrowserExtension` (AttentionX) | `docs/NIP-32009.md`, `NIP-32014.md`, `NIP-39.md`, `wot-questions.md`, `nostr-protocol.md`, `privacy.html`, screenshots |
| `TrustGraph` | `specs/wot-model.md`, `identity-binding.md`, `conformance.md`, `library.md`, `resolver-api.md`, `asyncapi/resolver.v1.yaml` |
| `PersonalServer` | `specs/*.md`, later `docs/*.md` |
| `GlobalServer` | `specs/*.md`, later `docs/*.md` |

If the NIP documents later move to a dedicated protocol repo, only the source
table changes.

## Pinning

`content.sources.json` in the Website repo:

```json
{
  "sources": [
    {
      "id": "nip-32009",
      "repo": "DigitalTrustProtocol/BrowserExtension",
      "path": "docs/NIP-32009.md",
      "ref": "ccd7c46…",
      "route": "/protocol/nip-32009"
    }
  ]
}
```

- `npm run content:sync` fetches every source at its `ref` into
  `content/_imported/` (not committed; CI caches it).
- A scheduled workflow opens a pull request that bumps refs and shows the diff
  of every changed source, so spec changes reach the site through review.

## Transform

Build-time only, so readers download HTML, not a Markdown engine.

| Step | Tool | Notes |
| --- | --- | --- |
| Parse | remark + `remark-gfm` | Tables, task lists |
| Diagrams | Mermaid rendered to SVG at build time | Specs already use Mermaid (for example `wot-questions.md`) |
| Code | Shiki | Build-time highlighting |
| Headings | GitHub-compatible slugs | Existing anchors like `architecture.md#scope-policy-attention-on-xcom` keep working |
| Links | Rewrite table (below) | |
| Frame | Page layout | Title, status badge, source footer |

Link rewriting:

| Link in source | Becomes |
| --- | --- |
| Another rendered source (`NIP-32014.md`, `../../TrustGraph/specs/wot-model.md`) | Its Website route, keeping the anchor |
| A file that is not rendered (`../src/graph/trust/IndexResolver.ts`) | GitHub blob URL at the pinned ref |
| External URL | Unchanged, `rel="noopener"` |
| Unknown relative path | **Build error** |

The sibling-folder links the specs use today (`../../AttentionX/docs/…`) work
in a local checkout but not on GitHub; the rewrite table makes them work on
the site.

Source footer on every rendered page:
`Source: BrowserExtension · docs/NIP-32009.md @ ccd7c46 · Edit on GitHub`.

## Website-authored content

MDX in `content/pages/<locale>/*.mdx` with frontmatter:

```yaml
title: Digital trust
description: Why a follow is not trust and a like is not a rating.
route: /trust
modelVersion: dtp-wot/1   # only for pages that summarize the model
```

`modelVersion` must equal the version declared by the pinned
`wot-model.md`, or the build fails.

## Languages

- Website-authored pages: the extension's seven locales (`da`, `de`, `en`,
  `es`, `fr`, `it`, `pt`), English first. A missing translation falls back to
  English with a notice.
- Rendered specs: English only, with a short localized notice.

## API reference

`/docs/api` is generated at build time from
`TrustGraph/asyncapi/resolver.v1.yaml`: the WebSocket messages (`DTP`
operations, pushes, `EVENT` / `OK`, `AUTH`), request and response schemas,
guardrails, and examples. It is built from the same JSON Schemas that drive
the Rust server's schema tests, so the reference cannot drift from the
servers. Both servers share one reference; the page notes only the
different ingest and auth defaults.

## Checks in CI

- Every internal link resolves; external links are checked weekly.
- Every source in `content.sources.json` fetched at its ref.
- `modelVersion` consistency.
- The playground's demo results match their corpus cases
  ([tech.md](tech.md#playground)).
