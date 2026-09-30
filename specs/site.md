# Website — audiences, sitemap, pages

Status: **draft** · 2026-09-30

## Purpose

The home of the Digital Trust Protocol. It introduces digital trust, explains
how trust (`32009`) and rating (`32014`) statements work and how the resolver
walks them, hosts documentation and specs, links to the code, and is the
public home page for the three products:

- **Attention** — the browser extension (trust people and rate posts on X);
- **Personal Server** — your own web-of-trust server on your machine or
  local network;
- **Global Server** — a public, high-performance resolver fed by Sync
  Servers.

Both servers speak the same protocol and hold only public Nostr trust events;
X identity and post data stays in the extension.

## Audiences

| Audience | Arrives from | Needs | Primary pages |
| --- | --- | --- | --- |
| X users | Chrome Web Store, shared links | What Attention does, is it safe, install | Home, Attention, Privacy |
| Nostr and app developers | GitHub, Nostr posts | The kinds, the rules, the API, the libraries | Protocol, Resolver rules, Docs, Code |
| Self-hosters | Docs, GitHub | Install and run a server | Personal Server, Global Server, Docs |
| Thinkers and researchers | Articles | Why this model of trust | Digital trust, How it works |

## Sitemap

```text
/                              Home
/trust                         Digital trust — the philosophy
/how-it-works                  The walk, step by step + playground
/protocol                      Protocol overview (kind map, layers)
/protocol/two-questions        Trust vs rating             ← AttentionX docs/wot-questions.md
/protocol/nip-32009            Trust statements            ← AttentionX docs/NIP-32009.md
/protocol/nip-32014            Ratings                     ← AttentionX docs/NIP-32014.md
/protocol/nip-39               X identity links (10011)    ← AttentionX docs/NIP-39.md
/protocol/wot-model            Resolver rules (dtp-wot/1)  ← TrustGraph specs/wot-model.md
/protocol/identity-binding     X account ↔ npub binding    ← TrustGraph specs/identity-binding.md
/protocol/conformance          Corpus and known gaps       ← TrustGraph specs/conformance.md
/protocol/attention-nostr      How Attention uses Nostr    ← AttentionX docs/nostr-protocol.md
/attention                     Extension product page
/attention/privacy             Extension privacy policy    ← AttentionX docs/privacy.html
/attention/support             FAQ and contact
/personal-server               Product page
/global-server                 Product page, public endpoint status
/global-server/privacy         Global Server privacy policy
/docs                          Documentation home
/docs/api                      Resolver protocol reference ← TrustGraph asyncapi/resolver.v1.yaml
/docs/resolver-api             Resolver protocol v1        ← TrustGraph specs/resolver-api.md
/docs/library                  Using the TrustGraph packages ← TrustGraph specs/library.md (+ guide later)
/docs/telemetry                Admin telemetry pages       ← TrustGraph specs/telemetry.md
/docs/personal-server/<spec>   Install, pair, CLI, sync    ← PersonalServer specs/<spec>.md + guides
/docs/global-server/<spec>     Self-host, configure        ← GlobalServer specs/<spec>.md + guides
/code                          Repositories, license, contributing
/about                         Contact, team, license
```

`←` marks pages rendered from a source file in another repo
([content-pipeline.md](content-pipeline.md)). Everything else is written for
the Website.

## Page specs

### Home `/`

1. **Hero.** One line in the spirit of the store listing: "Let the people
   you trust decide what deserves your attention." Primary action: *Add
   Attention to Chrome*. Secondary: *How it works*.
2. **Two questions.** "Is this identity worth my trust?" (32009) and "Is this
   artifact worth my time?" (32014), with a short diagram of
   trust → walk → one scroll score.
3. **Three products.** Cards for Attention, Personal Server, Global Server:
   one sentence each, who it is for, status badge (available / beta / in
   design).
4. **Principles strip.** Your judgments are signed and portable; results are
   relative to you; no central scorer; servers are optional and verifiable.
5. **Footer.** Code, protocol, privacy, contact (`attention@trust.dance`).

### Digital trust `/trust`

Website-authored essay. Key messages, all traceable to the specs:

| Message | Source |
| --- | --- |
| A follow is not trust; a like is not a rating | NIP-32009 motivation, wot-questions |
| Trust is directed, contextual (`c`), and can expire (`x` / `y`) | NIP-32009 |
| Trust results are subjective evidence for *your* root, never a universal score | model §1, extension architecture |
| Nearest evidence wins: farther opinions never dilute nearer ones | model §6 |
| Only trust opens doors; a rating never expands whose judgments you read | NIP-32014, wot-questions |
| Distrust and Neutral are evidence, not hops | model §6 |
| Bounded walks resist Sybils | model §6, ingest admission |
| A server is an optimization, not an oracle | extension design § 8 |
| Privacy: what each part learns about you | extension privacy policy, server privacy docs |

### How it works `/how-it-works`

A guided walk with the playground beside it:

1. You sign statements: trust, Neutral, distrust, Delete; ratings 0–100.
2. Relays carry them; anyone can verify the signatures.
3. Your walk: from you, level by level, through people you trust. A person is
   a hop only when their trust share meets your green knob (default 75 %).
4. The nearest hitting degree gives the answer: trusted, mixed, distrusted,
   or none, with the evidence and the path.
5. Ratings: the average score at the nearest trusted degree becomes one
   scroll indicator.
6. Identity: on X, trust points at an X account; it becomes a hop only when
   your web of trust links that account to a Nostr key. Show the two modes
   side by side: **lenient** (believe the link your web of trust reports;
   routes can differ per person) and **strict** (the key must also claim the
   account in `10011`; unverified and false links are cut). Link to
   `/protocol/identity-binding`.
7. Where it runs: in the extension, on your Personal Server, or on a Global
   Server — same rules, verifiable results.

**Playground** (full spec in [tech.md](tech.md#playground)): a small demo
graph; pick a root and a subject; move the green knob and max degree; switch
the binding mode; see degree, counts, resolution, the highlighted path, and
which X accounts are bound or cut. Uses the real
`@dtp/trust-graph` code in the browser, with no network calls.

### Protocol pages `/protocol/*`

Rendered from source. Each page shows the source repo, file, and pinned
commit, a status badge (`draft`), and an *Edit on GitHub* link. The overview
page `/protocol` is Website-authored: kind map (`32009`, `32014`, `10011`),
the layers table from the model, and links.

### Resolver rules `/protocol/wot-model`

Rendered `wot-model.md` plus a Website-authored **rules at a glance** box at
the top (7–10 bullets that link to spec sections). The box declares the
model version it summarizes; the build fails when that version differs from
the pinned spec, so the summary is reviewed on every model change.

### Attention `/attention`

- What it does on X: trust people, rate posts, see your circle's judgment
  in place, hide posts that miss your bar.
- Screenshots from the extension repo.
- Privacy summary (what it reads, what it never does: no posting, liking,
  following, or messaging) and a link to the full policy.
- Install (Chrome Web Store), demo mode, FAQ, changelog.

### Personal Server `/personal-server`

Why (warm heap, continuous sync, one server for all local apps and browser
profiles), what it holds (public trust events only), what it is not (no keys,
no X data: Attention keeps both), local-network access without login by
default and optional Nostr (NIP-42) authentication, install
(`npx @dtp/personal-server init`), connecting Attention, links to docs and
the protocol.

### Global Server `/global-server`

Why (scale, many users), what it holds (only kinds `32009`, `32014`,
`10011`; never profiles or X data), how it is fed (Sync Servers pushing as
whitelisted writers), access (open reads by default; members-only with a
NIP-43 whitelist when enabled; later a whitelist from the operator's web of
trust), the privacy trade-off and the three client modes (query, field,
frontier), public endpoint and status, self-hosting, privacy policy.

### Docs `/docs`

Getting started per audience, the API reference, library usage, server
guides. Guides are Website-authored until each server repo has its own
`docs/`.

### Code `/code`

Cards for each repository in the `DigitalTrustProtocol` GitHub organization:
`BrowserExtension`, `TrustGraph` (or `Trust`), `PersonalServer`,
`GlobalServer`, `Website`. Each card: purpose, language, license, status,
link. Contribution guide and license (MIT, as the extension).

## Privacy policy URL continuity

The Chrome Web Store listing links to
`https://digitaltrustprotocol.github.io/BrowserExtension/privacy.html`
(AttentionX `docs/chrome-web-store.md`). That URL must keep working:

1. `/attention/privacy` renders from the same source file (`docs/privacy.html`).
   The old URL itself is served by the BrowserExtension repo's own GitHub
   Pages site; the Website does not replace it.
2. When the Website moves to its own domain, update the store listing, then
   turn the old URL into a redirect page (meta refresh + canonical link).
3. Never remove the old URL while any published extension version links to it.

## Copy rules

- Plain language first; protocol terms once, with the plain word beside them.
- Never call a result a "score" of a person. Say "your circle's evidence" or
  "trusted / mixed / distrusted / none".
- Do not copy spec text into pages. Link to the rendered spec section.
