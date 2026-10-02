# Does Insights lead with the right thing? An evidence-based review

2026-10-02. Grounded in competitor documentation, the peer-reviewed coaching
literature, and an audit of what the app actually renders today.

**Read this first.** The honest headline is uncomfortable: our *statistics* are
ahead of every competitor's entry tier, and our *page order* is wrong. We lead
with a verdict and bury the thing the research says coaches actually want. Two
of the fixes below are cheap and change the product materially.

A second, sharper point: the single strongest finding in the entire literature
is about **annotation**, and we have none.

---

## 1. What the evidence actually says

### Coaches want clips, not datasets

[Martin et al. 2018](https://arrow.tudublin.ie/cgi/viewcontent.cgi?article=1113&context=ittsciart)
surveyed 538 coaches — the largest stratum unpaid, club-level, Level 1. When an
analyst is added, **video clips for feedback jump 51% → 83%, while quantitative
match data moves only 44% → 57%.** Clips are what gets produced the moment
anyone has capacity.

[Mulvenna et al. 2024](https://journals.sagepub.com/doi/10.1177/17479541241270426)
interviewed eight full-time EFL/National League analysts. Coaches request
**specific clips, not datasets**, and hand over explicit lists. The analysts
describe themselves as *"glorified video editors."* One: *"there is no point in
me sitting there and doing something for 2 h if I know it isn't going to be
used."*

### Annotation, not video, is the active ingredient

[Smith, Rands, Bateman & Francis 2022](https://journals.indianapolis.iu.edu/index.php/sij/article/view/26317)
ran an RCT with 14 EFL Championship professionals: **telestrated video produced
84.0% ±3.7 recall against 52.6% ±5.4 for plain video** (p<0.001). Set pieces:
86.9% vs 48.0%. Small and elite, but the effect size is enormous and it is the
clearest actionable finding in the corpus.

### A confident verdict will contradict a lot of coaches

This is the one that should change our thinking.
[Furley et al. 2025](https://journals.sagepub.com/doi/10.1177/17479541241278603)
showed coaches identical 20-minute Bundesliga clips. Agreement, by Fleiss'
kappa, ranged from **−.036 to .236** across formation, space occupation,
opening play and group tactical behaviour. Coaches named **12+ different
formations**; only 6 of 15 said 4-2-3-1. Ten different players were named "most
striking."

There is no consensus ground truth for a tactical verdict to be right about.

[Aarons et al. 2024](https://journals.sagepub.com/doi/full/10.1177/17479541231206682)
points the same way from the other side: elite coaches wanted data that
**"confirm[s] what they are already seeing or thinking"** and wanted output to
**"spark conversation" rather than prescriptively direct changes.**

### Fewer points, repeated

[Januário et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5260567/) —
342 players aged 10–18, 1,728 feedback units. Retention averaged **57%**; only
**34.5% retained fully**; in **65.5% of cases athletes could not reproduce the
coach's ideas.** Coaches averaged 5.05 ideas per episode. **More ideas
predicted worse retention; repetition predicted better.** Age was not a factor.

The "two or three coaching points" rule is lore — no paper establishes a
number — but the dose-response direction is measured, and it points to fewer.

### The time budget is brutal

[Hansen et al. 2021](https://eprints.worc.ac.uk/11527/9/24748668.2021.pdf)
(200 Danish UEFA A/Pro coaches): without an analyst, **63% spend under 5 hours
per week** on all analysis. Martin et al.: coach-as-analysts spend a **median
under 1 hour** per analysis instance.

No measured figure exists for volunteer youth coaches anywhere in the
literature. Given licensed semi-pro coaches sit under five hours a week in
total, the defensible inference is **under one hour per match, often zero.**

### Why they quit

Martin et al., barriers by group — note the inversion:

| Barrier | No analysis | Coach-as-analyst |
|---|---|---|
| Knowledge needed | **32%** | 15% |
| Software cost | 23% | **58%** |
| Time to analyse | 12% | **31%** |
| Time to interpret | 17% | **30%** |

Non-starters are blocked by knowledge. Active users are ground down by cost and
time. Danish data agrees — 45% cost, 39% time, only 5% knowledge — and **66%
were worried about overloading players with data.**

Demand is not the problem: **86% rated analysis important-to-essential and 94%
wanted to use more.**

---

## 2. What competitors show

### The de-facto minimum, across Veo, Spiideo and Hudl

Goals · shots and shots on target · possession % · passes and completion ·
set pieces (corners, free kicks, throw-ins, goal kicks) · **cards and fouls** ·
a shot map and a heat map. Plus one structural fact: **every statistic is
click-to-video.**

### What sits behind the expensive tier

| Capability | Gated behind |
|---|---|
| Possession metrics, pass and game maps | Veo Analytics 2 **add-on** |
| Positional stats, heat maps, AI summaries | Hudl **Plus, $1,000/yr** |
| Analyst-supported breakdowns | Hudl **Premier, $2,500/yr** |
| Pressing intensity, pass chains, 3D shot maps | Spiideo **AutoData Advanced** |
| Automatic tracking at all | Metrica **€80–150/mo** |
| Player identification, per-player stats | Trace **sensor tier** — the computer-vision path explicitly ships without it |

### What nobody has

1. **xG or any probabilistic model** — absent from every amateur-tier product.
   Veo offers raw shot-conversion rate instead.
2. **Per-metric confidence in the interface.** Veo admits uncertainty only in a
   [support article](https://support.veo.com/hc/en-us/articles/49272029444241-How-to-get-the-best-results-with-Veo-Analytics-2),
   never as a figure on screen. Its narrative layer, Coach Assist, ships with
   **no accuracy caveat at all** — the generated prose is presented with more
   confidence than the numbers underneath it.
3. **Explicit "we could not measure this" states.** Products silently omit.
4. **Defensive shape and off-ball structure** at amateur tier.
5. **Youth-appropriate framing** — nobody reframes metrics for development
   rather than performance.

---

## 3. Where we actually stand

### Statistics: we are ahead, and it is not close

We render **31 metrics across 7 tabs**. Measured against the gated tiers above:

| Ours | Competitor equivalent | Their tier |
|---|---|---|
| Pressure inside 2 s, ball back inside 5 s, time to first pressure, team-mates near at 2 s, pressures applied, PPDA | "Pressing intensity" | Spiideo **Advanced** |
| Block length, block width, line height | Positional / shape stats | Hudl **Plus $1,000** |
| Possession %, sequences, passes per spell | Possession metrics | Veo **paid add-on** |
| Per-player distance, touches, passes, better options | Player stats | Trace **sensor tier only** |
| Better-option detection, lane completion, pass network | — | **No equivalent found at any tier** |

"Where were we open?" — a passing lane that was open and unused — has no
competitor equivalent I could find at any price. We are not short of statistics.

### The one minimum-set gap

**Cards and fouls.** Every competitor has them; we have no event type for
either. It is the only item on the de-facto minimum list we miss.

### The honesty position is a real, verifiable moat

Our withheld-with-reason treatment is the thing the whole category lacks, and
the research confirms it is not just unimplemented but *unclaimed*. This is
worth saying out loud in marketing, because it is checkable.

### What we lack that everyone else has

**Cross-match trend.** Veo has a Progression Chart, Hudl has trends, Trace has
weekly recaps. We are single-match only. A coach's real question is not "how
did we press on Saturday" but **"are we getting better at pressing?"** — and
that is the question that brings him back every week rather than once.

---

## 4. The verdict on our three questions

### Does Insights lead with the right information? Partly — the order is wrong.

What we do right: one headline finding rather than a dashboard. That matches
the sub-one-hour budget and the retention evidence precisely.

Three things are wrong:

**(a) The clips are not first.** Every piece of evidence says clips are the
deliverable. Today they are a secondary outline button and a link inside each
finding, below the fold. A coach with forty minutes on a Sunday wants: here is
the thing, here are the six clips that prove it, send to the staff group. We
make him navigate for the one thing he came for.

**(b) The verdict asserts where it cannot.** Furley's kappa of −.036 to .236
means a confidently-worded tactical claim will contradict a large share of
coaches reading it. We phrase it as a flat assertion in 58px italic caps. The
research says it should be a prompt that sparks a conversation, with its
evidence one tap away — not a ruling.

**(c) Five chapters sit above the verdict.** The chapter rail occupies the most
valuable space on the page and presents five ideas before the one that matters.
Januário measured the direction: more ideas, worse retention.

### Are there enough statistics? Yes — comfortably. Stop adding.

We exceed the paid tier of every competitor on pressing and shape. The gaps are
**cards and fouls** (one event type) and **cross-match trend** (a new view, not
new metrics). Adding a ninth tab would make the product worse.

### Are they visual enough? The cards are. The tables are not. And annotation is missing.

The question cards — pitch plots, dot plots, the flow line, target bars — are
genuinely strong and better than the category. But the Ball, Shape, Shooting
and Set-piece tabs render their metrics as **table rows**, which is where a
coach's attention goes to die.

And the biggest visual gap is not a chart at all. **84% recall versus 53%**
is the largest effect in the literature and it comes from drawing on the frame.
We have no telestration anywhere in the product.

---

## 5. Improvements, ranked by evidence against cost

### 1. Put the clips on the verdict — a filmstrip, not a link

The verdict block gains a row of 6–8 thumbnails, each opening the workspace at
that second, with one "send these" action. This converts Insights from a report
into the deliverable.

*Evidence:* Martin et al. (clips 51→83% vs stats 44→57%); Mulvenna et al.
(coaches request clips, hand over lists). *Cost:* low — the moments, their
timestamps and the routing all exist. *Risk:* none.

### 2. Telestration on a clip

Pause, draw an arrow or a circle, share that frame. Start with three tools —
arrow, circle, line — on the existing player overlay.

*Evidence:* Smith et al. 2022, 84.0% vs 52.6% recall, p<0.001. The single
largest measured effect available to us. *Cost:* medium — a canvas layer over
the paused frame plus an export. *Risk:* low.

### 3. Make the verdict checkable rather than declarative

Keep the sentence, add "Does that match what you saw?" with agree / disagree
underneath it. Agreement confirms; disagreement adjusts the threshold that
produced it and is recorded against the match.

This is the direct answer to Furley. It converts a claim we cannot
scientifically justify into a prompt — which is what Aarons' coaches said they
wanted — and it generates the one thing nobody else has: labelled ground truth
from the coach, which improves the thresholds over a season.

*Evidence:* Furley et al. 2025 (no consensus ground truth); Aarons et al.
(spark conversation, not prescribe). *Cost:* low. *Risk:* none — and it
compounds.

### 4. Cross-match trend: "are we getting better?"

One strip above the verdict: this metric across the last six matches, with the
target line. Nothing else changes.

*Evidence:* universal competitor feature we lack; repetition predicts retention
(Januário); it is the reason a coach returns weekly rather than once.
*Cost:* medium — needs a cross-match query. *Risk:* low.

### 5. Reorder the page

Verdict and clips first. Chapter rail second, as navigation rather than as the
opening statement. Match flow third.

*Evidence:* Januário (more ideas, worse retention); the sub-one-hour budget.
*Cost:* trivial — it is a reorder. *Risk:* none.

### 6. Cards and fouls

The one missing item from the category minimum. *Cost:* a pipeline event type
plus a row. Do it when the pipeline is next touched.

### 7. Turn the remaining tables into cards

Ball, Shape, Shooting and Set pieces still render rows. Give them the same
card treatment as Pressing. *Cost:* medium, mechanical. *Risk:* none.

### 8. The before/after split — still the highest-ceiling idea

Every headline figure is a ninety-minute average, and an average hides the
swing. "2.1s before 38 minutes, 3.4s after" is a story; "42%" is noise. Every
event already carries a timestamp, so this is computable today.

---

## 6. What not to build

**Do not build xG.** No amateur-tier competitor has it, so it wins nothing
competitively, and a shot-location model built on single-camera tracking would
produce a number we cannot stand behind. That directly contradicts the one
position the research shows is genuinely unoccupied — being the product that
says what it cannot measure. A bad xG would cost more than the feature is worth.

**Do not add more metrics.** We are already past every competitor's paid tier.
The constraint is attention, not supply.

**Do not make the verdict more confident.** Furley is unambiguous. Confidence
here is a liability dressed as polish.

---

## 7. Honest limits of this review

- **There is no peer-reviewed research on grassroots football coaches
  specifically.** The literature is elite and academy. Martin et al. (volunteer
  stratum) and Hansen et al. (semi-professional) are the closest proxies.
- **No study compares statistics against video head-to-head** for behaviour
  change in football. The clips-first recommendation rests on what coaches
  request and use, not on a measured behavioural outcome.
- **No measured analysis-time figure exists for volunteer youth coaches.** The
  sub-one-hour figure is inference from the semi-professional ceiling.
- Smith et al. (telestration) is n=14 elite adults measuring recall, not match
  behaviour. The effect is large and worth acting on; it is not proof.
- Trace's and Veo's own survey material is marketing, and is treated as such
  above.
