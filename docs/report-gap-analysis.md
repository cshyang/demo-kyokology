# Gap analysis — Campus Mock Report vs. the admin platform

Source: `KYKOLOGY Campus Mock Report NurAin.pdf` (12pp, 6 sections, MRIC · Diploma in Science Y2).
Compared against: this repo at `a48846a` — `generator.ts` data model, `/students/profile`, `/overview`, `/fingerprint`, `/segments`, `/longitudinal`.

---

## 0. The headline

**These are two different products that share six words.**

The report is built on facets, capabilities, contribution families and pressure states. The platform is built on dimensions, archetypes, segments and waves. Neither construct appears in the other.

```
REPORT                          PLATFORM
──────────────────────────      ──────────────────────────
6 dims × 6 facets = 36          6 dims, no facets
1–7 scale, one decimal          1–5 Likert × 6 items → 0–100
Healthy/Shadow/Dynamic          one layer
natural + pressure radar        one radar
5 magnitude bands               raw number
blind spot per dimension        —
139 capabilities / 22 families  —
21 contribution families        —
4 pillars (Cog/Exe/Emo/Rel)     —
opportunity arenas              —
DEPTH reflection ×5             —
30-day plan + evidence tracker  —
—                               15 archetypes (top-2 dims)
—                               6 segment rules + attached actions
—                               waves, deltas, migration
—                               faculty & university norms
```

The overlap is the six dimension names. Everything the report leads with is absent from the platform; everything the platform leads with is absent from the report. Sections 1–7 below break that down; **section 8** sorts every item by what it actually costs to build.

---

## 1. Gaps in the report itself

These are the report's own holes, before any platform question.

### 1.1 The facet scores can't carry their own narrative

`questions.ts` is 36 items, 6 per dimension, on a **1–5** scale. The report shows facets on **1–7 with one decimal** (6.8, 5.5, 3.2) and the entire narrative rests on gaps between them: *"the 1.6-point gap between Analytical and Inspiring is the widest gap in this dimension"*, *"the 2.4-point gap … is the widest range of any dimension in the profile"*.

With 6 items per dimension and 6 facets per dimension, that is **one item per facet**. One 5-point item cannot produce 6.8, and the difference between two single items on a coarse scale is not a finding — it is noise wearing a decimal point.

Two ways out, both expensive:
- **Grow the instrument.** 3 items per facet = 108 items, a 3× jump from 36. The platform's own funnel already shows started → completed attrition; tripling the length will move it.
- **Drop the resolution.** Show bands only, no decimals, and never claim a "widest gap" unless the difference exceeds the measurement error.

Right now the report shows precision the instrument doesn't have. This is the single most damaging gap, because a psychometrician on the buying committee will find it in ninety seconds.

### 1.2 Section 3 uses a taxonomy that doesn't exist in Section 1

Section 3 says: *"Each contribution signal below traces back to a specific combination of a Behavioural Intelligence pillar (Section 1) and a Capability family (Section 2)."*

Then it shows **Cognitive, Execution, Emotional, Relational** as those pillars. Section 1's pillars are Self-Actualisation, Egocentricity, Sociocentricity, Security, Complexity, Spirituality. The traceability chain — the report's best trust device — points at a Section 1 that doesn't contain those four labels.

Either a mapping table is missing (6 dims → 4 pillars) or the wording is wrong. Fix before this goes in front of anyone; it is the one place a careful reader can catch the report contradicting itself.

### 1.3 The item bank measures different constructs than the facet names

Egocentricity is the worst case:

| Report facet | Nearest platform item |
|---|---|
| Persistence & Mental Toughness | *"I find it hard to let a slight go."* |
| Lead & Take Charge | *"I prefer arrangements that suit me, even if others adjust."* |
| Power & Authority | *"I keep track of what I am owed."* |
| Control | *"Criticism stays with me for a while afterwards."* |
| Dominance & Assertiveness | *"I notice quickly when something is unfair to me."* |
| Image, Status & Fame | *"I like being recognised by name for what I contribute."* |

The report's Egocentricity is **agency** — persistence, leadership, authority. The platform's is **grievance** — entitlement, thin skin, score-keeping. A student scoring high on one is not the same person as a student scoring high on the other.

This flips a live platform feature: the `Driven, Under-Regulated` segment fires on `SA > 80 && E < 40`. Under the report's definition, low E means *low persistence and reluctance to lead* — so the flag's meaning inverts.

Other misses:
- **Self-Actualisation** — report has *Ethics, Morals & Integrity* and *Logical Reasoning & Right Thinking*. No item touches either.
- **Complexity** — report has *Inspiring & Influencing*. No item touches persuasion at all. The report then builds its Communications insight from *Sociocentricity-Empathy + Complexity-Inspiring* — a composite the platform structurally cannot compute.
- **Security** — report has *Meticulous, Precision & Accuracy* and *System Compliance*. No items.
- **Spirituality** — report has *Faith & Higher Power* and *Meaning, Existence & Afterlife*. The platform's items are deliberately secular. For institution-wide deployment at a Malaysian campus that is a consent and appropriateness call, not just a data gap. Flag it to the client explicitly rather than letting it appear in a rollout.

### 1.4 "Evidenced" is doing work the instrument can't do

The report says capabilities are *"evidenced against the KYKOLOGY™ Canonical Capability Library (139 capabilities across 22 families)"* and supplies concrete behavioural facts:

> *"peer-tutors coursemates in Chemistry ahead of exams"*
> *"active in the college's Science Society group projects"*
> *"independently pursues extra-credit research projects"*

A 36-item self-report questionnaire cannot produce any of these. There is either a **second input the platform has no surface for** — staff annotation, activity records, portfolio, tutor observation — or these lines are mock-only and the word *evidenced* is overclaiming.

Resolve this before designing anything. If the evidence is real, an **evidence-capture surface on the profile is the most valuable single addition in this entire document**, because it is what turns a test result into a living record that a counsellor reopens. If it isn't real, relabel every instance from *evidenced* to *inferred* and the whole capabilities section drops a tier in credibility.

Related: 36 items cannot evidence 139 capabilities. That is a 4× inference inflation with no stated derivation.

### 1.5 No norm reference anywhere

Every number in the report is absolute. The magnitude scale is *percentage of scale* — `STRONG 5.60–6.29 (80–89%)` — not a percentile. A student reading "6.1 — HIGH" has no idea whether that is common or rare, and neither does the counsellor.

The platform already computes university means (`uni`), faculty means (`FACULTIES[].mean`) and draws a dashed university-mean line on the profile sparkline. **This part already exists.** Put a cohort percentile next to every dimension and facet score and the report gains its most useful missing sentence — *"higher than 78% of Science students in your year"* — at close to zero cost.

### 1.6 No change axis — the report is behind the platform

The report is explicitly a snapshot and defers to the dashboard for movement. But the platform's profile already has per-dimension sparklines across waves, signed deltas, and a wave switcher. The report is the *less* capable artefact here.

Consequence for design: **any new layer — facets, pressure, capabilities, contribution ranks — has to be wave-aware from day one.** A construct that only exists at one point in time can never appear in Longitudinal, and Longitudinal is where the renewal case lives.

### 1.7 Shadow is named once, in fine print, and never shown

The magnitude-scale footnote says Healthy, Shadow and Dynamic *"remain separate interpretive layers and are never averaged into one score."* The radar shows two — Natural (solid) and Dynamic (dashed). **Shadow appears nowhere in twelve pages.**

Either it isn't measured, or it is measured and withheld. Both need a decision, and if it is real it is the most sensitive data in the product: consent, who-can-see-it, and duty-of-care all land on that layer. Do not ship a footnote that promises a third layer the report cannot show.

### 1.8 No signal of how much to trust this profile

Nothing on the page answers *"is this a good measurement?"* No completion time, no straight-lining check, no skipped items, no social-desirability flag, no re-assess-by date. `Report date · 18 Jul 2026` with no expiry.

The longer the instrument gets (see 1.1), the more this matters.

### 1.9 The report can't decide who it's for

Sections 1–4 are third-person *about* the student — *"she investigates thoroughly"*, *"her deep thinking"*. Sections 5–6 flip to first and second person *for* the student — *"Where in the last two weeks did I notice myself…"*, with **printed blank lines to write on**.

One document is trying to be a counsellor's briefing note and a student's reflective workbook. The blank lines settle it — the back half is a workbook and the front half isn't. Split into two artefacts, or commit to one voice.

Related: the pronouns are assumed. They need to come from a field the student sets.

### 1.10 The disclaimer is in the wrong place

*"reflects tendencies, not fixed traits, and is not a diagnosis"* sits on page 1 in 8pt grey. Pages 2–5 then make strong dispositional claims under a heading literally called **Blind spot**. To a 19-year-old, a boxed "Blind spot" callout in a different colour reads as a diagnosis regardless of what page 1 said.

Put the framing next to the claims, not before them.

### 1.11 Section 4 recommends actions with nothing to attach them to

*"lab attachment, undergraduate research symposium, mentorship"*, *"campus coding club, data-analysis mini-project"*, *"structured tutoring programme, teaching-assistant role"* — all generic.

The `/segments` screen already carries **attached institutional actions with owners** for each flagged pattern. Salvage that exact pattern: every readiness note should name a programme the institution actually runs, with an owner and a status. That is the difference between a horoscope and an intervention.

---

## 2. Student / People detail screen

Ranked by leverage. `S` = student-facing, `A` = admin/staff-facing.

| # | Addition | Who | Note |
|---|---|---|---|
| 1 | **Facet drill-down** — 6 bars per dimension, band chip, intra-dimension spread callout | S+A | ✅ Built. 1.1 resolved by banding instead of scoring; 1.3 disclosed on the panel, not solved — see §9 |
| 2 | **Pressure / Dynamic series** on the radar + per-dimension swing number | S+A | ✅ Built. The report's most distinctive idea. Platform had nothing like it |
| 3 | **Norm rail** — percentile vs faculty and vs university on every score | S+A | ✅ Built. Data already existed. Cheapest high-value item here |
| 4 | **Watch-outs** — rule-fired, replacing the report's per-dimension "Blind spot" | A first | ✅ Built. Renamed and rule-keyed per 1.4 and 1.10 — see §9 |
| 5 | **Response-quality strip** — completion time, straight-line index, items skipped | A only | ✅ Built. Answers "should I act on this?" |
| 6 | **Capability panel** — family, band, top capabilities, **evidence source per line** | S+A | Blocked on 1.4 |
| 7 | **Contribution ranks** with the visible traceability chain | S+A | Keep the chain — it is the report's best trust device. Blocked on 1.2 |
| 8 | **Opportunity arenas with attached institutional programmes** | S+A | Salvage the Segments action pattern |
| 9 | **DEPTH reflection state** — staff sees *whether* and *when*, never *what* | split | ✅ Built. The written answers are private. This is a consent boundary, not a permission toggle |
| 10 | **30-day plan + milestone evidence tracker** — week status, evidence logged, overdue | split | ✅ Built. **The only thing on the profile that changes weekly.** It is the reason a counsellor opens the screen a second time |
| 11 | **Report artefact panel** — generate this PDF from the profile, version history, shared-with log | A | ✅ Built. The PDF and the platform were disconnected worlds |
| 12 | Pronoun / preferred-name field | S | Feeds every generated sentence |

Item 10 deserves emphasis. Everything else on the profile is static between assessments. The action plan and evidence tracker are the only weekly-changing surface, which makes them the difference between a screen that gets visited once and a screen that gets visited every fortnight.

---

## 3. Insights tabs

Current: Fingerprint · Segments · Longitudinal.

### 3.1 New: Pressure

Which dimensions swing most under pressure, cohort-wide, split by faculty and intake. **No counterpart today.**

This is the strongest new insight surface because it is the only one that predicts *when* students struggle rather than *who* is struggling. "Second-year Science students' Security rises 14 points under pressure, concentrated in the four weeks before finals" is an operational sentence — it tells a Dean when to staff up.

### 3.2 New: Capabilities

Heatmap of 22 families × cohort, band distribution per family.

*"Leadership & Mobilisation is EMERGING for 68% of Year 2"* is the sentence a Dean pays for. This tab is employability-facing, which makes it the one that justifies licence renewal to a budget holder who doesn't care about psychometrics.

### 3.3 New: Contribution

Distribution of ranked contribution families across the cohort, set against the programme mix the institution offers and regional industry demand. A supply/demand gap chart — where the cohort's motivation to create value points, versus where the institution has capacity to send them.

### 3.4 Fingerprint — add facet resolution

Faculty means currently separate by roughly 10 points across six axes, which is a blunt picture and makes faculties look more alike than they are. **The real separation lives at facet level.** Add a facet toggle to the existing radar.

### 3.5 Segments — sharpen and extend

- Segment rules currently fire on raw dimension scores. Facet-level rules would cut false positives — `Driven, Under-Regulated` on a raw E score is exactly the construct problem in 1.3.
- Add **blind-spot frequency across the cohort**. The most common blind spot in a faculty is a curriculum design input, not just a pastoral one.

### 3.6 Longitudinal — extend to every new layer

Today it moves dimension means and segment membership. It needs to also track: facet movement, pressure-swing change, capability band progression, and DEPTH / action-plan completion over time. See 1.6 — this is why new layers must be wave-aware from the start.

---

## 4. Overview

### 4.1 The missing half of the funnel

Overview currently tracks `sent → opened → started → completed` and stops dead at completion.

Everything the report is *for* happens after that point and is invisible:

```
CURRENT                              MISSING
sent → opened → started → completed  │ → report opened
                                     │ → DEPTH questions answered
                                     │ → 30-day plan started
                                     │ → milestones evidenced
                                     │ → re-assessed
```

This is the strongest single Overview addition. It is the "did it actually do anything" chain, and it is the retention story — a client renewing a licence wants the right-hand column, not the left.

### 4.2 A trust tile

Median completion time, straight-line rate, share of profiles meeting a response-quality bar. Currently the platform reports 369 assessed with no statement about how many of those 369 are worth acting on.

### 4.3 A delivery tile

Reports generated / delivered / opened / downloaded. Right now nobody can tell whether a single student has ever read their report.

---

## 5. Who sees what

The report is student-facing (*"not a diagnosis"*, *"non-clinical"*). The profile screen is staff-facing and already carries `results visible to staff with support role` plus a consent record block.

Every item added needs an explicit audience. Three are genuinely sensitive:

- **DEPTH written answers** — the student's private reflection space, with printed blank lines. Surfacing her text to staff is a consent problem, not a feature. Staff see completion state only.
- **Shadow layer** (if it exists, per 1.7) — the most sensitive data in the product.
- **Blind spots** — reads as diagnosis. Staff-first, student-facing only with framing beside the claim.

---

## 6. Hard constraint on how any of this gets built

`buildData()` in `generator.ts` is frozen. Every published figure — the seven segment counts, churn, funnel quotas — is a function of the mulberry32 stream seeded at `0x4B59A71D` *and the exact order `rnd()` is called in*. `generator.test.ts` asserts the counts exactly.

So: **no new per-student data can be born inside `buildData()`.** Facets, pressure scores, capability bands, contribution ranks — all of it derives downstream in `derive.ts`, seeded off `st.id` with its own stream, and collapses back to the existing 0–100 dimension value so every existing number stays byte-identical.

That is a constraint, not a problem. It is also what makes the phasing below possible.

---

## 7. Four decisions that block design

None is a build question. All four need KYKOLOGY to answer.

1. **Is the evidence real?** (§1.4) — if yes, the platform needs an evidence-capture surface and that changes the profile's information architecture. If no, the capabilities section is inference and must be labelled as such.
2. **Does Shadow exist?** (§1.7) — if yes, it is a third data layer with its own consent model. If no, delete the footnote.
3. **Whose facet taxonomy wins?** (§1.3, §9) — either the item bank gets rewritten to the report's 36 facet names, or the report adopts the constructs the bank actually measures. Until one happens, every facet band on Egocentricity is a label the instrument cannot support.
4. **Is the pressure model directional or regressive?** (§9) — does Security rise for everyone under pressure, or does each profile compress toward its own centre? The two disagree for about half the cohort.

---

## 8. What it costs — four buckets

**Bucket 1 · Derivable today, no new instrument, no new taxonomy — BUILT**
Magnitude bands over existing 0–100 scores · norm percentiles vs faculty and university · band language in place of raw numbers · post-assessment funnel · report artefact panel · response quality.

**Bucket 2 · New synthetic layer, downstream of frozen `buildData()`, seeded off `st.id` — BUILT**
36 facets · pressure series · watch-outs · DEPTH completion state · 30-day plan and milestone state. All of it in `src/lib/data/layers.ts`, all pure, all collapsing back to existing dimension values — `npm test` still asserts the same seven segment counts. See §9 for what changed against the original recommendation.

**Bucket 3 · Blocked on taxonomies that don't exist in this repo**
22 capability families / 139 capabilities · 21 contribution families · the 4 pillars (§1.2) · opportunity domains. Nothing can be built until KYKOLOGY supplies the actual libraries and the mapping rules between them.

**Bucket 4 · Blocked on a data source that doesn't exist**
Evidence lines (§1.4). Needs a capture surface — staff annotation, activity feed, or student portfolio — and a decision about who can write to it.

Buckets 1 and 2 are a demo-week's work and cover most of the visual gap. Bucket 3 is a content dependency. Bucket 4 is a product decision.

---

## 9. What building it changed about the analysis

Three recommendations above did not survive contact with the data. Corrected here rather than quietly.

**The report's bands cannot be used as-is — and this is worse than §1.5 said.** §1.5 called the absence of a norm reference a missing feature. It is closer to a defect. Applying the report's own thresholds (`STRONG = 5.60–6.29`, i.e. 80–89% of the scale maximum) to the 2,214 dimension scores in this cohort:

```
LOW          236  10.7%
DEVELOPING  1143  51.6%   ← half the cohort in one bucket
MODERATE     669  30.2%
STRONG       105   4.7%
VERY STRONG   61   2.8%
```

The median student is told they are DEVELOPING on most dimensions, and fewer than one in thirteen scores ever reaches STRONG. The report's own footnote warns that a lower magnitude "is not automatically a weakness, deficit, or dysfunction" — and then the band names do exactly that work anyway. Percentage-of-scale-maximum is not a norm, and treating it as one makes an ordinary student read as deficient.

Bands are now cut on cohort percentile instead. This also collapses two recommendations into one mechanism: a band *is* a norm reference, so "STRONG" now means "higher than most of this university" rather than "80% of the way up a scale nobody calibrated." `layers.test.ts` fails if any band ever swallows more than 40% of the cohort again.

**Facets get bands, not scores.** §1.1 says the per-facet decimals are unsupportable, so shipping facet bars labelled `6.8 / 7` would have made the demo evidence against its own critique. Facets carry a bar and a band chip and no number; the dimension score stays printed, because six items stand behind it. The expanded panel says so on screen.

**"Blind spot" is now "worth watching," and it fires on rules.** The report prints one under every dimension whether or not there is anything to say. Generating that prose from the derived facet split would have reproduced §1.4's overclaiming in code — a clinical-sounding sentence whose provenance is a hash of the student ID. Each watch-out is now keyed to something measured: a percentile spread, a pressure swing, a change between two sittings. When no rule fires the panel says so, because an empty panel is a result. The rename is §1.10: a boxed callout headed "Blind spot" reads as a diagnosis no matter what the footer says.

**§1.3 is disclosed on the screen, not solved — and it cannot be solved here.** The facet drill-down puts the report's facet names over this platform's item bank, which §1.3 established are different constructs. Rendered, that produced an S0119 Egocentricity panel reading `Power & Authority — VERY STRONG`, `Image, Status & Fame — VERY STRONG`, off items asking *"I keep track of what I am owed"* and *"Criticism stays with me for a while afterwards."* A band is a claim about a named person, and that one is not supportable.

Rewriting the item bank is out of scope for a demo, so the panel now names the mismatch wherever it exists — on Egocentricity, and on the four facets across Complexity, Self-Actualisation and Spirituality that have no item behind them at all. **This is the item on the list that most needs KYKOLOGY to decide something**, and the disclosure is a holding position, not a fix.

One thing also changed on the way in. Re-assessment is **not** the last stage of the post-assessment funnel, though it was planned as one: 291 students hold two assessments, which is *more* than have opened a report, because re-assessment is something the university scheduled rather than something a student chose. As a funnel stage it drew a bar longer than the ones above it and read as a bug. It sits beside the funnel instead.

### An open question the PDF cannot settle

The pressure series is implemented as regression toward the student's own centre — tall signals compress, quiet ones reach up. That reproduces NurAin's profile exactly: her Security is low and rises sharply, her Spirituality barely moves.

But the report's stated *mechanism* is directional, not regressive — *"she looks for more structure and certainty in a less controlled situation."* Under a directional rule, Security rises for everyone. Under the regressive one, a student who is already high on Security sees it **fall** under pressure. S0119 is exactly that case: −11 points, and the watch-out tells staff they have less security available than the natural pattern suggests.

NurAin's single profile is consistent with both theories, so the PDF cannot discriminate them. Roughly half the cohort currently gets the opposite of what a directional model would predict. **Ask KYKOLOGY which one they mean** — it is a one-line change either way, and it is a question about their model, not about this code.

---

## 10. If only three things get done

1. **Fix §1.1 and §1.2.** False precision and a self-contradicting traceability chain are the two things a sceptical evaluator will find, and both undermine the report's core credibility claim.
2. **Add the norm rail (§1.5) and the post-assessment funnel (§4.1).** Highest value per unit of work in the document — the data for both already exists in this repo.
3. **Answer the evidence question (§1.4).** It determines whether this product is a questionnaire that prints a PDF, or a living record of a student across three years. Those are different companies.
