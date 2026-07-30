# KYKOLOGY™ Campus — admin demo

A clickable, fully explorable sales-pitch artifact for KYKOLOGY's 6D Profile, aimed at
campus administrators. Every number on screen is generated from a fixed seed. Nothing is
sent, stored, or persisted.

**Live: <https://kykology-admin-demo.cshyang-chng.workers.dev>**

![Segments](docs/screens/segments.png)

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # the generator gate — see below
npm run build   # static export to out/
```

**To work on the Ask drawer** you need the Worker too, because `output: 'export'` forbids
route handlers, so `/api/ask` does not exist under `npm run dev`:

```bash
echo "ZAI_API_KEY=..." > .dev.vars                          # gitignored
echo "NEXT_PUBLIC_ASK_API=http://localhost:8788/api/ask" > .env.development.local
npx wrangler dev --port 8788                                # alongside npm run dev
```

`.env.development.local`, never `.env.local` — `NEXT_PUBLIC_*` is inlined at build time and
`next build` reads `.env.local`, so a stray localhost value there ships a demo that calls the
presenter's own laptop. Or skip both and run `npm run build && npx wrangler dev`, which serves
the export and the Worker on one origin exactly as production does.

## The one rule

**Do not refactor `buildData()` in `src/lib/data/generator.ts`.**

It is a verbatim transliteration of the Claude Design prototype. Every published figure —
the seven segment counts, the career-motivation churn, the funnel quotas — is a function of the
mulberry32 stream seeded at `0x4B59A71D` *and the exact order `rnd()` is called in*.
Extracting a helper or reordering a loop silently changes every number on the hero screen
while the code still looks correct.

`npm test` asserts the counts exactly. If it fails after an edit, the edit is wrong.

```
  44 Silent Contributors          churn 0.3% (ceiling 8%)
  25 Driven, Under-Regulated      840 students · 4 faculties · 3 intakes
  28 Under-stretched Explorers    291 assessed twice
  17 Transition Fragile
  21 Purpose Adrift
 139 Steady Core
  95 Unflagged
  --
 369 assessed
```

## Screens

| Route | What it is |
|---|---|
| `/overview` | KPIs, five October checkpoints, the post-assessment funnel, fingerprint bars, activity, population waffle |
| `/fingerprint` | Six-axis radar, faculty separation, career motivation distribution |
| `/segments` | **The hero.** Six flagged patterns with attached actions, plus the roster |
| `/readiness` | The educator view — five cohort reads (leadership, team, resilience, workplace, pressure) as band distributions, each drilling through to a ranked roster |
| `/longitudinal` | Dimension movement, the "22 of 55 moved out" headline, pattern migration |
| `/students/profile?id=` | The individual profile — facets, bands, pressure, watch-outs, reflection state, calibration scatter. Reached from People |
| `/campaigns` · `/campaigns/[id]` | Funnel tracking and the nudge flow |
| `/campaigns/new` | Four-step wizard: Test → Audience → Emails → Review |
| `/people` | Directory with CSV import and email dedupe |
| `/templates` | The three messages, with a live preview |
| `/t?id=&status=&from=` | **Student link.** The row's state beside what that student sees — consent, 36 items, live scoring |

**Ask** is not a screen. It is a drawer available from every header, and it docks rather than
floats — the answer is only worth trusting next to the figures it came from, so covering them
would defeat the point.

## Architecture

```
 src/lib/data/generator.ts   seeded generator — DO NOT REFACTOR
 src/lib/data/derive.ts      aggregates: funnels, migration, waffle, radar inputs
 src/lib/data/layers.ts      facets, bands, pressure, watch-outs, engagement — all downstream
 src/lib/data/readiness.ts   five educator reads over the facet layer, and the one band cut they share
 src/lib/data/questions.ts   the 36-item bank, 6 per dimension
 src/lib/data/query-schema.ts  the Ask contract — closed vocabulary + validator, zero imports
 src/lib/data/query.ts       runs a validated query against the cohort, in the browser
 src/lib/demo-state.tsx      React context — every mutation the demo allows
 src/lib/ask-state.tsx       the Ask transcript — the one thing that survives a reload
 src/app/(admin)/            every screen, including the student link at /t
 worker/index.ts             the only server: holds the API key, holds nothing else
```

**Ask answers two kinds of question, and only two.** Ask about *this cohort* and the model
returns a `QuerySpec` over a closed vocabulary, which the browser runs through the same
`derive.ts` and `readiness.ts` functions the screens render from. Ask about *the instrument* —
the six dimensions, the DEPTH pathway, what the report may not be used for — and it answers in
prose from `PRODUCT_BRIEF`, transcribed from the product fact sheet. Anything else is refused.

**The two halves have different safety properties, and the fence between them is the design.**
On the cohort side the model never sees a student and never emits a figure, so an invented name
or count is structurally impossible; the framing sentence it writes is stripped if it contains
a digit, because it is composed *before* the query runs and cannot know the count. On the
explain side the prose is the model's own, held to the truth only by the briefing being its
sole permitted source — which is why explain answers are barred from mentioning the cohort at
all. Every question about *who* or *how many* routes to a query.

Three consequences worth knowing. Z.ai's `response_format` enforces JSON but not shape, so
`parseAsk` is load-bearing: it rejects outright and never partially applies. The model can
still map an intent to the wrong *valid* filter, which is why every answer prints the resolved
rule (`BUSINESS · TOP 20 BY LEADERSHIP POTENTIAL`) — that line is the only thing making a
mis-read visible mid-demo. And failures show one graceful message with the technical reason on
hover, because `not valid JSON` reached the screen once during testing, which is exactly where
it must never appear.

**The current screen is sent as orientation, not as a filter.** It resolves "who needs support
*here*?" against the page you are on. It does not restrict the answer — any faculty, intake or
wave is still reachable from anywhere. Live filter *values* are not sent yet: those sit in each
page's own `useState`, so passing them needs the filter lifted into shared state.

**The transcript persists, deliberately breaking the reset-on-reload rule below.**
`sessionStorage` is what makes both true: the thread survives a refresh and a page change and
dies with the tab. It stores the question and the spec, never the rendered rows, so a
rehydrated answer re-runs against the live cohort instead of going stale.

**Mutations live in React context, never module scope.** Client components render on the
server too, so a module-level mutable store would be shared across every viewer of the
deployed demo — two people clicking at once would see each other's imports and campaigns.
State resets on reload, which is correct for a pitch demo: the next meeting starts clean
without anyone remembering to reset it.

**Design tokens.** The prototype used `rgba(20,40,60,α)` at twelve alphas. Those are not
twelve colours, they are one colour at twelve opacities — so there is a single `--color-ink`
and the alpha is expressed at the call site (`text-ink/45`, `border-ink/10`). Light mode
only, by design.

The `@theme` block is `@theme static`, and that word is load-bearing. Tailwind only emits
custom properties for theme values a utility class referenced, and half this palette is read
by `token()` inside inline styles instead — a colour arriving from data cannot be a class
name. Without it `--color-sky` and `--color-stone` were never emitted, so every band drawn
in them rendered transparent, including the DEVELOPING band holding 62% of the cohort.

IBM Plex Mono appears at four distinct settings and they are not interchangeable — each
marks a different rank of label. They are four utilities (`eyebrow`, `nav-group`,
`seed-line`, `rule-mono`), not one utility plus tracking overrides at the call site.

Element defaults live in `@layer base`. Unlayered CSS outranks every layered utility
regardless of specificity, so an unlayered `a { color: teal }` silently beats
`text-white/62` on a link.

## Deploying

```bash
npm run build
npx wrangler secret put ZAI_API_KEY   # once, per environment
npx wrangler deploy
```

**Before the demo URL is public, cap the spend.** The endpoint is unauthenticated by
definition, so the URL *is* the credential — a Worker secret hides the key but does not stop
anyone from spending it. `ratelimits` in `wrangler.jsonc` bounds the rate; only a provider-side
spend limit bounds the bill.

Static export to Cloudflare Workers static assets — free plan, no adapter. See the comment
in `next.config.ts` for the constraint this imposes and the one-line change that lifts it
when the demo graduates to a pilot.

**Give it a minute before demoing.** For roughly a minute after `wrangler deploy`, routes
flap between 200 and 404 as assets propagate — `/overview` 404s while `/segments` works,
then they swap. It settles on its own. Don't go chasing a build problem that isn't there,
and don't deploy five minutes before a meeting.

## What this is not

No backend, no database, no authentication, no real email. Deliberately. See
`docs/superpowers/specs/` for the reasoning, including why D1 was considered and cut, and
which parts of that spec have since been superseded by the design project.
