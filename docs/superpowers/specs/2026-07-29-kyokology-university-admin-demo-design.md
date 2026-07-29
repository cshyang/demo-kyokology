# Kyokology University Admin Platform — Demo Design

**Date:** 2026-07-29
**Status:** ⚠️ PARTIALLY SUPERSEDED — read this box before trusting anything below.

The design was subsequently built out in Claude Design (project
`206f5cd3-e319-4b67-a81b-8c3382f8ac66`, "Segments hero screen iterations") and moved past this
document in several places. **Where they disagree, the design project's `CLAUDE.md` wins** — it
is the spec the shipped prototype was actually measured against.

| Topic | This document says | Now authoritative |
|---|---|---|
| Brand | Kyokology | **KYKOLOGY** — settled by `assets/kykology-wordmark.png` |
| Instrument | KSP-5, five traits | **6D Profile** — six dimensions (SA, E, SO, SE, C, SP) |
| Archetypes | 10, from pairs of five | **15**, from pairs of six |
| Segments | 6 buckets | **7** — adds *Purpose Adrift*; *Silent Collaborators* → *Silent Contributors* |
| Counts | 42/26/31/18/170/82 (targets) | **44/25/28/17/21/139/95 = 369** (measured, exact) |
| Stack (§8) | Vite + React Router, static | **Next.js App Router** — see §8 addendum below |

Still accurate and still load-bearing: §1 (what this is and who it's for), §3 (the campaign
collapse), §4 (scope, cuts, privacy posture), §5 (information architecture), §7's determinism
requirement, §9 (build order), §10.

---

## 1. What this is

A **sales-pitch artifact**: a clickable, fully explorable web application backed by generated
data, shown in a meeting to a university administrator in order to win a deal.

It is not a pilot and not v1 of the product. There is no backend, no database, no
authentication, and no real email delivery. Every number on screen comes from a
deterministic seed generator. It is hosted on Cloudflare Workers as a static build (§8).

**Win condition:** the person in the room leans forward. Not "five features work."

### Audience

The buyer is not yet a named role. The pitch goes to whoever at the university picks up —
career services, student affairs, or admissions. These roles want different things from the
same data, so the demo is built around the one pain all three share:

> "I sent something to 400 students and I have no idea what happened."

### Non-goals

- Real email delivery, deliverability, SPF/DKIM
- Authentication, admin roles, permissions
- Multi-tenancy
- Persistence across sessions
- Test authoring
- Link token security and expiry

---

## 2. The instrument: KSP-5

The demo must not ship MBTI branding. MBTI is a trademark owned by a company that enforces
it, and Kyokology needs its own instrument regardless.

**Kyokology Student Profile (KSP-5)** — five continuous traits, each scored 0–100:

| Trait | Meaning |
|---|---|
| Drive | Persistence, self-motivation |
| Collaboration | How they operate with others |
| Adaptability | Response to change and pressure |
| Structure | Planning vs spontaneity |
| Curiosity | Openness, exploration |

An **archetype label** is derived from the student's two highest-scoring traits (e.g. *The
Architect*, *The Connector*, *The Navigator*). Order within the pair is ignored, giving ten
archetypes — one per unordered pair of five traits.

**Archetype labels are sticky.** A naive top-two ranking churns: a student at Drive 78 /
Structure 74 who drifts four points between waves flips to a different archetype, and the
longitudinal screen then shows hundreds of students "changing personality" in a year. That is
precisely the failure mode continuous traits were chosen to avoid, reintroduced at the label
layer.

The rule: a student's archetype changes between waves only if, in the new wave, their
second-highest trait leads their third-highest by **at least 8 points**. Otherwise the
previous wave's label is retained. On first assessment, ties inside the margin resolve by a
fixed trait precedence order so the result stays deterministic.

Target: **under 8% of students change archetype between Wave 1 and Wave 2.** This is an
assertion in the generator's test suite (§8), not an aspiration.

**Why traits underneath and a label on top.** The label is instantly readable in a meeting;
the continuous scores are what make the longitudinal chart move and what let segments be
defined as honest rules rather than vibes. In a seeded demo the extra cost is one derivation
function.

These five traits map onto things a university already reports on — employability, wellbeing,
retention — which four-letter type codes do not.

---

## 3. Domain model

The five requested features collapse into two nouns. Build the objects, not the features.

```
  TEST LIBRARY          CAMPAIGN                    RESULTS
  ┌──────────┐          ┌─────────────────┐         ┌──────────────┐
  │ KSP-5    │────────▶ │ which test      │         │ 5 trait      │
  │ + 2 more │          │ which audience  │────────▶│ scores       │
  └──────────┘          │ which emails    │         │ + archetype  │
                        │ which nudge rule│         └──────────────┘
       ┌─────────┐      └─────────────────┘                │
       │ PEOPLE  │───────────▲    │                        │
       └─────────┘                ▼                        ▼
                        ┌─────────────────┐         ┌──────────────┐
                        │ INVITATIONS     │         │  SEGMENTS    │
                        │ per person:     │         │  trait rules │
                        │ status, progress│         │  + action    │
                        └─────────────────┘         └──────────────┘
```

### Entities

**Student** — `id, name, email, faculty, intakeYear, cohortTags[]`

**Test** — `id, name, dimensions[], questions[]`. Library of three; only KSP-5 is fully
built out with questions.

**Campaign** — `id, testId, name, audienceRef, emailTemplateIds, nudgeRule, createdAt, status`.
One send. This is the central object.

**Invitation** — `campaignId, studentId, status, progressPct, lastActivityAt`.
Status is one of: `sent · opened · started · completed · bounced`.

**Result** — `campaignId, studentId, scores{5 traits}, archetype, completedAt, consentedAt`

**Segment** — `id, name, rule, description, recommendedAction`. Rule is a trait predicate.

**EmailTemplate** — `id, kind (invite|reminder|thanks), subject, body`

### Two consequences of this model

**Four of the five requested features are one object viewed from different angles.**
Feature 1 creates a Campaign. Feature 2 is its Invitation list. Feature 3 is the
EmailTemplates attached to it. Feature 4 is its `nudgeRule`. Build one thing.

**Longitudinal is a query, not a feature.** Running the same test as a second campaign a year
later means "compare Campaign A to Campaign B" *is* the longitudinal view.

---

## 4. Scope

### Requested features — all in scope

1. Select a test and send it, to people in the database or to people who aren't
2. See who received the test and their progress
3. Control the email messages recipients receive
4. Follow up with anyone who hasn't made progress
5. Analytics dashboard showing aggregated results

### Added to scope

| Addition | Rationale |
|---|---|
| Student-facing test flow | The first question a prospect asks is "what does the student see?" Without it, features 2 and 5 have no source of truth. |
| Cohorts / tags on people | You need something to send *to*. Hand-picking 400 students is not a demo. |
| `bounced` as a real status | A tracker that silently drops failed sends makes features 2 and 4 lie. |
| CSV export | Universities ask every time. A button that downloads a genuinely valid file is a disproportionate trust signal. |
| Consent line on profiles | Defuses the data-protection question before it is asked in the room. |

### Cut, with re-entry conditions

| Cut | Add back when |
|---|---|
| Test builder / authoring | A prospect asks to author their own instrument |
| Admin roles, login, permissions | Pilot |
| Link tokens, expiry, security | Pilot |
| Send scheduling | Pilot |
| Guided-tour overlay | After the demo has been given once and the winning scenes are known |
| Separate Home dashboard | Never — folded into Campaigns (see §5) |

### Privacy posture

Admins see **full individual results**. This was a deliberate choice: the actionable-segments
hero screen requires naming individuals, and a flag-only model weakens it.

The mitigation is a visible consent line on every student profile —
*"Shared with your institution · 14 Jan 2026"* — which turns the inevitable privacy question
in the meeting into a prepared answer.

---

## 5. Information architecture

Single left sidebar, two labelled groups. **Not** top-level mode tabs.

```
┌──────────────────┬──────────────────────────────────┐
│ KYOKOLOGY        │                                  │
│                  │                                  │
│ ANALYSE          │                                  │
│ ★ Insights       │                                  │
│     Fingerprint  │                                  │
│     Segments     │                                  │
│     Longitudinal │                                  │
│   Students       │                                  │
│                  │                                  │
│ OPERATE          │                                  │
│   Campaigns      │                                  │
│   People         │                                  │
│   Templates      │                                  │
└──────────────────┴──────────────────────────────────┘
```

**Why not top tabs.** They hide half the product at all times, add a hidden "which mode am I
in" state, and cost a click to reach anywhere. In a pitch, the prospect should see the full
shape of the product from screen one. Six routes do not need two levels of navigation.

The one legitimate case for mode tabs is Operate and Insights being used by different people
(a coordinator who only sends, a director who only reads). That is unknown until a buyer is
named. A sidebar converts to mode tabs cheaply later; the reverse is not true.

**Insights sub-views are sidebar children, not in-page tabs.** Each gets its own URL, so the
demo can open directly on `/insights/segments` and that link can be sent in a follow-up email.

**Insights is the default route.** Opening the app lands on the cohort fingerprint, not an
empty operations dashboard. The funnel strip and alerts that would have lived on a Home
screen move to the top of Campaigns, where they are actionable.

### Routes

```
ADMIN                                        STUDENT
/insights/fingerprint   (default)            /t/:token
/insights/segments      ★ hero                  step 1  welcome + consent
/insights/longitudinal                          step 2  questions (paged)
/students                                       step 3  done
/students/:id
/campaigns
/campaigns/new          (4-step wizard)
/campaigns/:id
/templates
```

Nine admin routes, one student flow.

---

## 6. Screen specifications

### 6.1 Insights → Fingerprint (default route)

Cohort radar across the five KSP-5 traits, overlaid against the university-wide average.
Archetype distribution bar chart below. Filters: faculty, intake year, campaign.

This is the "oh, that's us" moment. Trait generation (§7) ensures faculties genuinely differ,
so the radar shows real separation rather than four identical shapes.

### 6.2 Insights → Segments ★ (the hero screen)

Five cards. Each is a trait rule with a headcount and an attached recommended action.

```
┌─────────────────────────────────────────────────┐
│ Silent Collaborators              42 students   │
│ Collaboration < 35  ·  Structure > 65           │
│                                                 │
│ Capable individually, go quiet in group work.   │
│ Grades hold; participation marks don't.         │
│                                                 │
│ → Structured role assignment in team projects   │
│                          [View list] [Export]   │
└─────────────────────────────────────────────────┘
```

Segments are computed over each student's **most recent completed result**, across all
campaigns. Students with no completed result do not appear here at all.

| Segment | Rule | Action | Target |
|---|---|---|---|
| Silent Collaborators | Collaboration < 35 AND Structure > 65 | Structured role assignment in team projects | 42 |
| Burnout Risk | Drive > 80 AND Adaptability < 40 | Early check-in; workload pacing | 26 |
| Under-stretched Explorers | Curiosity > 80 AND Structure < 35 | Elective breadth; research placement | 31 |
| Transition Fragile | Adaptability < 35 AND intake year is current | Orientation follow-up in week 4 | 18 |
| Steady Core | All five traits within 35–70 | No action needed | 170 |
| Unflagged | Matches none of the above | — | 82 |

**The six buckets must sum to the assessed population** (369 students — see §7). A prospect
will add the headcounts. Silent Collaborators through Steady Core are the five cards; Unflagged
renders as a muted footer line — *"82 students match no segment"* — not a card. It exists so
the arithmetic closes.

Rules are evaluated in table order; a student lands in the first bucket they match, so the
buckets are disjoint by construction.

**Steady Core is load-bearing.** A system that flags everyone is crying wolf. Showing 46% of
the assessed cohort as needing no action is what makes a buyer trust the other four cards.

`View list` opens the named students. `Export` downloads a real CSV.

### 6.3 Insights → Longitudinal

Wave 1 (2025 intake campaign) against Wave 2 (2026 retest campaign), same student population.

- Trait delta chart per faculty
- Segment migration: *"Of the 42 in Silent Collaborators last year, 31 moved out."*

Segment membership here is computed by applying the §6.2 rules to Wave 1 results and Wave 2
results separately, then diffing. The rules are a pure function of a result, so they apply to
any wave — §6.2's "most recent completed result" is only the default view.

This closes the loop the pitch depends on: **find → intervene → prove**.

### 6.4 Campaigns (list)

Funnel strip across the top (sent → opened → started → completed) plus alerts, then the
campaign table. One campaign is mid-flight so there is live tension to point at.

### 6.5 Campaigns → New (4-step wizard)

**Step 1 — Test.** Pick from the library of three. Shows the instrument's dimensions and
question count.

**Step 2 — Audience.** Two tabs:
- *From cohorts* — pick saved cohorts ("Engineering Y1 · 214 people")
- *Add people not in the database* — paste emails or drop a CSV

The second tab must handle dedupe explicitly: *"3 of these already exist — skip or update?"*
This detail is worth building properly; it is what makes the demo feel like real software
rather than a mockup.

**Step 3 — Emails.** Choose and edit invite / reminder / thank-you templates. Set the nudge
rule: "no progress after N days → send reminder."

**Step 4 — Review.** Summary, then Send.

### 6.6 Campaigns → Detail

Funnel strip, then a table: name, cohort, status, progress bar, last activity.

Filtering to `no progress` reveals a button — **Nudge 38 students** — which opens the reminder
template pre-filled. This is requested feature 4, implemented as one button on an existing
screen rather than a separate follow-up system.

### 6.7 People

Student list with filters (faculty, intake year, cohort tag, completion status). Import via
CSV. Row click → student profile.

### 6.8 Students → Profile

Full KSP-5 result: radar, archetype, per-trait bars. Campaign history (which waves they took).
Segment memberships. Consent line.

### 6.9 Templates

Three editable templates — invite, reminder, thank-you — with variable tokens
(`{{student_name}}`, `{{test_name}}`, `{{deadline}}`) and a live preview pane.

### 6.10 Student test flow (`/t/:token`)

Three screens, mobile-first:
1. **Welcome + consent** — who's asking, why, what happens to the data, explicit consent
2. **Questions** — paged, with a progress bar
3. **Done** — thank-you and, optionally, the student's own result

Resume is **not** implemented. A token belonging to a seeded partial-completion student opens
at the matching question with the bar pre-filled, which reads as resume; a reload restarts
from that same seeded position rather than from wherever the viewer left off. Real resume
needs persistence, which arrives at pilot.

Kept deliberately minimal. Its job is to answer "what does the student see?" convincingly.

---

## 7. Data generation

This is where most of the real work is, and it is what makes the explorable-sandbox approach
viable: the expensive part of a demo is screens, not data. Generate a rich dataset once and
every screen works as a side effect.

### Determinism

**Fixed RNG seed, non-negotiable.** A demo whose numbers shift on page refresh reads as
broken, and it will be refreshed in front of a prospect. Use a seeded PRNG; no `Math.random()`
anywhere in the generator.

### Shape

```
 840 students · 4 faculties · 3 intake years (280 per year: 2024, 2025, 2026)

   Campaign A  Oct 2025  KSP-5  → 2024 + 2025 intakes   560 sent   complete
   Campaign B  Oct 2026  KSP-5  → same 560 students     560 sent   complete   (retest)
   Campaign C  Oct 2026  KSP-5  → 2026 intake           280 sent   MID-FLIGHT
```

**A and B cover an identical student population.** That is what makes §6.3's longitudinal
comparison honest — it is the same people twice, not two different cohorts.

Funnel, as a percentage of *sent*:

```
                  A & B (mature)      C (day 3, mid-flight)
  sent                    100%                        100%
  opened                   78%                         64%
  started                  61%                         41%
  completed                52%                         28%
  bounced                   2%                          2%
```

Completed is a subset of started throughout — 85% of starters finish, so ~9% abandon
mid-test, and ~17% open without ever starting.

**Assessed population = 369 students** with at least one completed result:
291 from Campaign B (560 × 52%) plus 78 from Campaign C (280 × 28%). This is the denominator
for every §6.2 segment headcount.

The imperfections are the point. A 100% completion rate looks fake, and worse, it makes
features 2 and 4 pointless — there would be nobody to chase.

### Trait generation

Each faculty has a mean vector across the five traits, plus per-student Gaussian noise.
Engineering skews toward Structure; Arts toward Curiosity; Business toward Drive; Health
toward Collaboration. This makes the fingerprint radar show genuine separation rather than
four overlapping blobs.

**The §6.2 segment headcounts are generator constraints, not observations.** Faculty means and
σ must be tuned until the segments land within ±20% of their targets. Nothing about "faculty
mean plus noise" naturally produces 42 Silent Collaborators; if left untuned, the hero screen
can come out with a segment of six students, which is limp. Tune, then assert (§8).

### Wave 2 drift

Wave 2 applies a small per-student drift to Wave 1 scores, with a larger positive drift
applied to students who were in a flagged segment in Wave 1. This is what produces the
segment-migration number that makes the longitudinal story land.

---

## 8. Technical approach

> **§8 ADDENDUM 2 — as built.**
>
> Shipped on **Next.js 16 App Router + Tailwind v4**, exported statically
> (`output: 'export'`) to **Cloudflare Workers static assets** on the free plan.
>
> This refines Addendum 1 rather than reversing it. That note conflated two separate
> decisions: *which framework* and *which output mode*. The framework choice is what
> preserves the ceiling and the agent-maintainability argument, and it stands. The output
> mode is a deploy detail — every route in the finished app prerenders, so exporting costs
> nothing today and saves the OpenNext adapter, the 3 MiB Worker-script limit, and the
> $5/mo. The day a server is needed, deleting one line from `next.config.ts` and adding
> `@opennextjs/cloudflare` restores the original plan. That is a deploy change, not a
> migration, precisely *because* the app is full App Router rather than a Vite SPA.
>
> The constraint this imposes is documented at the top of `next.config.ts`, where anyone
> about to write a route handler will actually read it.

> **§8 ADDENDUM — the stack decision changed. Read this first.**
>
> The analysis below argued for Vite + React Router on the criterion "smallest thing that works
> today." The criterion was then changed to **"easiest for an AI agent to maintain, highest
> ceiling"**, and under those criteria the answer is different:
>
> **Next.js App Router.** Reasoning: agents have far more Next.js training data than anything
> else, and — the decisive point — Next's `output: 'export'` static mode is a *trap* for agents,
> because all that training data points at server components, route handlers and `next/image`,
> which static export forbids. Running full Next.js makes the training data correct rather than
> actively misleading. It also keeps the ceiling high: adding D1, real email, or auth needs no
> migration.
>
> Deployment via `@opennextjs/cloudflare` when a server is actually needed. Until then the app
> prerenders static, so Workers Static Assets serves it and the 3 MiB Worker limit never applies.
> Budget Workers Paid ($5/mo) at the point OpenNext enters the picture.
>
> **The rejections of Astro and of static export below still hold.** Only the positive
> recommendation changed.

**Vite + React + TypeScript + React Router (client-side) + Tailwind + shadcn/ui + Recharts.**

Static build, deployed to **Cloudflare Workers Static Assets**. No server code, no database,
no auth.

```jsonc
// wrangler.jsonc
{
  "name": "kyokology-demo",
  "compatibility_date": "2026-07-01",
  "assets": {
    "not_found_handling": "single-page-application"
  }
}
```

`not_found_handling: "single-page-application"` returns `index.html` with a 200 for any path
that isn't a static asset, which is what makes client-side routes like `/insights/segments`
survive a hard refresh. Without it they 404, and the "open the laptop straight on the segments
screen" plan in §5 breaks.

Generated data lives in a TypeScript module. Interactions that "send" or "nudge" mutate
in-memory state, so the demo responds to clicks — statuses change, funnels move — and feels
alive for the length of a meeting. State resets on reload, which is acceptable and, given the
fixed seed, predictable.

### Frameworks considered and rejected

**Astro.** Cloudflare acquired the Astro Technology Company in January 2026, so it is now the
first-party framework with a genuine runtime match rather than an emulation layer. It is still
wrong here. Astro's value is shipping less JavaScript by keeping pages static with islands of
interactivity — but every screen in §6 is interactive (charts with live filters, a sortable
tracking table, a four-step wizard, a paged form). When everything is an island, islands
architecture returns nothing, and the result is a React SPA wearing Astro conventions. Astro
is the right choice for Kyokology's marketing site, not for this.

**Next.js via OpenNext.** Runs Next through a translation layer onto Workers, in exchange for
features this app does not use: no ISR, no image optimization, no server-component
requirement, nine routes. Framework plus adapter, for an admin dashboard.

**React Router v8 in framework mode.** The right answer *if* there were a server — Cloudflare
maintains the template directly (`npm create cloudflare@latest -- --framework=react-router`),
loaders run in the Worker, and a D1 binding is one line of `wrangler.jsonc`. There is no
server, so framework mode is unused machinery. React Router is still the router; it just runs
client-side.

Note for whoever revisits this: v8 **removed** `@react-router/dev/vite/cloudflare`, the old
dev proxy. Any v7-era tutorial will instruct you to install a plugin that no longer exists.
Use `@cloudflare/vite-plugin` alone.

### Why no D1

D1 was considered and cut. Two failure modes are specific to demos and do not exist with
in-memory state:

- **Shared state** — one database means two salespeople demoing simultaneously watch each
  other's clicks. In-memory state is isolated per browser for free.
- **Dirty state** — after three demos the nudge has been sent and the funnel has moved.
  Someone must remember to reset before the next meeting, and the meeting where they forget is
  the one that matters. In-memory resets on reload.

Both are solvable, but the work never appears on screen and buys nothing a prospect can see.

**Add D1 when a prospect says yes.** The upgrade path is: switch React Router to framework
mode, move the seed module behind loaders, add the binding. The component layer, the charts,
and the entire scoring and segmentation logic carry over untouched — they are pure functions
over a result object, not coupled to where the data came from.

Charting work should follow the project's data-visualisation conventions rather than
per-chart ad-hoc styling — one palette, consistent axes, light and dark both handled.

### Testing

Minimal and targeted. The seed generator is the only component with logic worth testing:
one assertion suite confirming:

- Same seed produces byte-identical output
- Funnel percentages land within tolerance of §7's table, and completed ≤ started ≤ opened ≤ sent
- Each segment lands within ±20% of its §6.2 target headcount
- The six buckets sum exactly to the assessed population (369)
- Fewer than 8% of students change archetype between Wave 1 and Wave 2
- Campaigns A and B cover an identical student set

No component tests, no E2E — this is a demo, and UI tests here would be ceremony.

---

## 9. Build order

Hero first, because it is the part that can fail.

```
 1. Seed generator + KSP-5 scoring     ← everything reads from this
 2. Insights (all three sub-views)     ← if this doesn't land, stop
 3. Campaign detail + nudge
 4. Wizard + People
 5. Student test flow
 6. Templates, export, polish
```

If step 2 does not produce a lean-forward reaction, nothing downstream rescues it — and that
will have cost two days rather than two weeks to discover.

---

## 10. Open questions for after the first demo

Deliberately deferred, not forgotten:

- Which buyer role actually responded? That answer may justify splitting Operate and Insights
  into separate modes, and will sharpen the segment definitions.
- Which of the six scenes landed? That determines whether the guided-tour overlay is worth
  building.
- Did anyone ask to author their own instrument? That is the trigger for a test builder.
