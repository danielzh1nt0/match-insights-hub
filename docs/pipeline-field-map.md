# What the UI reads, and what we'd like to read next

2026-10-02. Extracted from the code, not from memory — every key below is one
the app actually looks up at runtime.

**Part 1** is the contract: every field the current UI reads, where it reads it
from, which tile uses it, and what the screen does when it's absent. Map each
row to an export field and mark the empties.

**Part 2** is the wish list: stats worth adding, each with a definition precise
enough to implement and a note on what it needs from the pipeline.

Throughout, `A` is the home side and `B` the away side, and distances are
metres with the pitch assumed 105 × 68 unless `pitch.length` / `pitch.width`
say otherwise.

---

## Part 1 — The current contract

### 1.1 Top-level file shapes

Two files per match.

**The stats file** (`StatsFile`):

| Key | Type | Notes |
|---|---|---|
| `teams[]` | array of team rows | One per side, each carrying `team: "A" \| "B"` |
| `players[]` | array of player rows | Per-player totals |
| `metrics{}` | object | Keyed buckets, listed in 1.4 |
| `passes[]` | array of pass records | One per pass attempt |
| `sequences[]` | array | Read for counts only |
| `pitch` | `{ length, width }` | Metres. Defaults to 105 × 68 if absent |
| `grid` | `[number, number]` | Not currently read |

**The match data file** (`MatchDataFile`): `events[]`, `frames[]`,
`attack_right`, `pitch`.

### 1.2 Team row — `stats.teams[]`

The largest single block. Every key is read as a finite number; anything
missing, null or non-numeric renders as **Withheld** or a dash, never as zero.

| Field | Unit | Where it appears | If empty |
|---|---|---|---|
| `possession_pct` | % | Insights "Field possession"; Ball tab; head-to-head | Withheld, with the confirmed-moment count as the reason |
| `possession_s` | s | Ball head-to-head | Row shows a dash, no bar |
| `sequences` | count | Ball head-to-head | Dash |
| `passes` | count | Ball + Passes head-to-head | Dash |
| `pass_completion_pct` | % | Insights possession sentence; Ball tab | Sentence drops the clause |
| `passes_per_sequence` | count | Ball tab "How long did we keep it?" | Card shows 0.5-style figure; dash in band |
| `pressed_within_2s_pct` | % | **Insights headline figure**; Pressing tab; the primary finding | Withheld — "No loss carries a time to first pressure" |
| `regained_within_5s_pct` | % | Pressing tab, head-to-head | Dash |
| `time_to_press_median_s` | s | Pressing tab "How fast did we react?" | Dash |
| `near_at_2s_median` | count | Pressing head-to-head | Dash |
| `pressures_applied` | count | Pressing head-to-head | Dash |
| `ppda_opp_passes_per_def_action` | count | Pressing head-to-head | Dash |
| `block_length_median_m` | m | Insights "Block length"; Shape tab | Withheld — "Shape is not tracked for this match" |
| `block_width_median_m` | m | Shape head-to-head | Dash |
| `def_line_height_median_m` | m | Shape head-to-head | Dash |
| `distance_m_total_visible` | m | Shape head-to-head | Dash |
| `forward_pass_share_pct` | % | Passes head-to-head | Dash |
| `progressive_passes` | count | Passes head-to-head | Dash |
| `better_option_count` | count | Insights "A better pass was open" | Withheld |
| `summary.ball_grade` | `{ possession_ok, events_ok }` | Gates the Shape tab and the possession figure | Treated as "allowed" when absent |
| `summary.ball_reliable` | bool | Same gate, older files | Ignored when absent |
| `duration_s` | s | Period splitting (1st/2nd half) | Falls back to the library's duration |
| `attack_right` | `{ A: bool, B: bool }` | Which way each side attacks | Defaults A right, B left |

### 1.3 Player row — `stats.players[]`

| Field | Unit | Notes |
|---|---|---|
| `id` | number | Treated as the shirt number throughout. **We never show names.** |
| `team` | `"A" \| "B"` | |
| `touches` | count | Also the sort order for the player list |
| `passes` | count | |
| `passes_completed` | count | |
| `better_option_count` | count | |
| `distance_m` | m | |
| `time_visible_s` | s | Shown as "visible minutes", not minutes played |
| `risky_passes` *or* `passes_risky` | count | Either spelling is accepted |

### 1.4 Metric buckets — `stats.metrics{}`

| Bucket | Shape | Used by |
|---|---|---|
| `shots` | array of `{ team, x, y, goal, on_target }` | Shot map, shot summary, goal counts |
| `field.{A,B}.field_tilt_pct` | % | Shooting tab |
| `field.{A,B}.entries_count` | count | Shooting tab, final-third entries |
| `high_turnover_counts.{A,B}` | count | Shooting tab, balls won high |
| `shape_timeline.{A,B}[]` | array of `{ t, length, width }` | Phases ribbon, shape over time |

### 1.5 Pass records — `stats.passes[]`

Several key spellings are accepted because the exports have varied. Please
tell us which one the current export actually writes so we can drop the rest.

| Meaning | Keys accepted |
|---|---|
| Team | `team` |
| Time | `t`, `time`, `start_t` |
| Passer | `from`, `player_id` |
| Receiver | `to`, `receiver_id` |
| Start point | `start`, `from_m` |
| End point | `end`, `to_m` |
| Completed | `outcome` in {`complete`, `completed`, `success`}, or `quality` not in {`bad_lost`, `incomplete`} |
| Quality band | `quality` in {`risky_completed`, `bad_lost`, …} |

### 1.6 Events — `data.events[]`

Shape: `{ id, t, type, team, title, subtitle, payload }`.

Types the UI filters on: `goal`, `shot`, `shot_blocked`, `turnover_lost`,
`turnover_won`, `high_turnover`, `pass_bad`, `pass_risky`, `better_option`,
`set_piece`, `sequence_end`, `interception`, `pass_intercepted`.

Payload keys read, by event type:

| Event | Payload keys |
|---|---|
| any | `shirt` \| `shirt_number` \| `player_shirt`; `x`/`y` or `px`/`py` or `start_x`/`start_y` |
| `turnover_lost` | **`time_to_press`** (s) — this one field drives the headline finding; `regained_within_5s` (bool) |
| `set_piece` | the kind, as `corner` / `free` / `throw` somewhere in the payload |
| `better_option` | `carrier` \| `from` \| `player_id`; `receiver` \| `to` \| `receiver_id`; `better_to` \| `best_to` \| `better_receiver` \| `target_player`; `from_m`, `to_m`; `played_x`/`played_y` \| `end_x`/`end_y`; `better_x`/`better_y` \| `target_x`/`target_y`; `best_gain_m`, `best_bypassed`, `best_space_m` |
| `shot` | `on_target` (bool) |

### 1.6b Why these per-event fields matter more than the percentages

Every finding we show is a claim about a **subset** of moments. "Only 35% of
losses got pressure inside two seconds" is a claim about the other 65%, and the
clips we attach to it have to be *those* losses. If we cannot tell which ones
failed, a coach checking the evidence can open a loss that was pressed
immediately — a clip that disproves the headline it is filed under.

A team-level percentage cannot do this. It tells us how many failed, never
which. So for each finding we need the per-event field that marks the instance:

| Finding | Needs, per event | Have it? | Without it |
|---|---|---|---|
| Press faster when we lose the ball | `time_to_press` (s) on `turnover_lost` | ✅ | — |
| Win it back before they settle | `regained_within_5s` (bool) on `turnover_lost` | ✅ | — |
| Support the first presser | **`near_at_2s`** (count) on `turnover_lost` | ❌ only the match median `near_at_2s_median` | We show all losses and say so |
| Play forward after we win it | **`forward_within_3s`** (bool) on `turnover_won` | ❌ only `forward_within_3s_pct` | We show all regains and say so |
| Secure the first pass after regaining | **`lost_back_5s`** (bool) on `turnover_won` | ❌ only `lost_back_5s_pct` | We show all regains and say so |

The three missing ones are each a single boolean or integer you already compute
in order to produce the percentage — the denominator is being thrown away. The
UI currently prints a caveat under those clip strips admitting the moments are
not the faulty ones, which is honest but is not the product we want to demo.

**Ask:** emit the per-event value alongside each percentage, not instead of it.


### 1.7 Frames — `data.frames[]`

```
{ t, possession, phase, carrier, pressure_m, near_opps, lanes,
  ball: { m: [x, y], px, state },
  players: [{ id, team, gk, state, conf, m: [x, y], px }],
  shape: { A: { hull_m, n, length, width }, B: {...} },
  pitch_lines }
```

`state` must be one of `observed` / `predicted` / `stale` — **everything marked
`stale` is excluded from every aggregate**, including the heat map and the
average-shape plots. If the export marks nothing stale, we draw predicted
positions as if observed, which is worse than drawing nothing.

### 1.8 The four fields that carry the most weight

If anything is empty, check these first — between them they decide whether the
product has anything to say:

1. **`time_to_press` on `turnover_lost` events.** Without it there is no
   headline finding, no Insights verdict, and the Pressing tab is empty.
2. **`players[].state` on frames.** Without `stale` marking, every positional
   figure silently includes guesses.
3. **`block_length_median_m`.** The whole Shape tab hangs off it.
4. **`summary.ball_grade`.** Decides whether possession is trustworthy enough
   to show at all.

---

## Part 2 — Stats worth adding

Ordered by value against what the pipeline would have to supply. Everything in
tier 1 is computable from data the export already produces.

### Tier 1 — computable from today's export, no pipeline change

**1. Every headline figure, split before and after the turning point.**
Each of `pressed_within_2s_pct`, `time_to_press_median_s`, `possession_pct`
and `block_length_median_m`, computed twice: once over the first window, once
over the second, where the split is the busiest fourteen minutes of losses.
Needs nothing new — events already carry `t`. This is the single highest-value
item on the list, because every current figure is a ninety-minute average and
an average hides the swing that decided the match.

**2. Time to first pressure, as a distribution rather than a median.**
Export the full array of `time_to_press` values, not just the median. A median
of 3.4s tells you nothing about whether the team is consistently slow or mostly
fine with five disasters. We already draw the dot plot; we just need the values.

**3. Where losses cluster — the turnover map by zone.**
Count of `turnover_lost` per pitch sixth, as a 3 × 2 grid. We have the
coordinates; this is an aggregation we could do client-side but would rather
have as `metrics.turnover_zones.{A,B}[6]`.

**4. Turnover-to-shot conversion, both ways.**
For each `turnover_lost`, whether a shot by the opponent followed within 15
seconds, and for each `turnover_won`, whether we shot within 15. Export as
`turnovers_conceding_shot` / `turnovers_creating_shot`. This is the number that
turns "we lost it 31 times" into "9 of those became chances".

**5. Set-piece outcome, not just count.**
We count corners, free kicks and throws. We never say what happened. For each
`set_piece`, whether possession was retained 5 seconds later, and whether a
shot followed within 15. Youth matches are decided on set pieces more than
anything else in the list, and we currently say nothing about them.

**6. Rest defence.**
At the moment of each `turnover_lost`, how many of our players were goal-side
of the ball. Frames carry positions and the ball, so this is computable today.
Exported as `rest_defence_median` plus the count of losses with fewer than two
goal-side.

**7. Build-up exit rate.**
Of sequences starting in our own third, the share that reached the middle third.
`sequences` and frames have everything needed. This is the single most-asked
youth coaching question — "can we play out?" — and no competitor at our tier
answers it.

**8. Shot quality without xG.**
Distance from goal and angle for every shot, which `metrics.shots` already has
in `x`/`y`. Report median shot distance and the share taken inside the box.
Deliberately *not* xG — see the evaluation doc for why a modelled figure would
cost us more than it gains.

**9. Possession-ladder: sequences by length.**
Count of possessions of 1–2, 3–5, 6–9 and 10+ passes. We compute
`passes_per_sequence` as a mean, which collapses the only interesting thing
about it.

### Tier 2 — small pipeline additions

**10. Line-break passes.** Count of passes whose start and end straddle an
opponent line, using the shape hulls we already compute per frame. Needs
opponent line positions at pass time — `shape` is already on every frame.

**11. Pressing in sustained blocks.** Longest run of consecutive minutes with
pressure inside 2s above target. Rewards consistency rather than a flattering
total.

**12. Recovery height.** Median distance from our own goal of each
`turnover_won`. One number that says whether the team wins it high or deep.

**13. Opponent-adjusted everything.** Each figure as a difference against the
opponent's same figure, not just side by side. 54% possession against a side
that usually has 70% is a different story.

**14. Width in and out of possession.** We export `block_width_median_m` once;
splitting it by `possession` (already on every frame) says whether the team
actually stretches when it has the ball.

### Tier 3 — needs new detection

**15. Cards and fouls.** The one item on the category minimum set we miss
entirely. Every competitor shows them. Needs a new event type.

**16. Aerial duels.** Count and win rate. Needs ball height, which single-camera
tracking may not support — tell us if it's out of reach and we'll drop it.

**17. Goalkeeper distribution.** Short versus long, and retention rate after
each. Needs the keeper flagged, which `gk` on frames already gives us, plus
goal-kick detection.

**18. Substitution-aware minutes.** `time_visible_s` is camera time, not
playing time. If the export can emit on/off events we can report real minutes,
which also fixes every per-90 figure.

### Explicitly not wanted

- **xG or any probabilistic model.** No amateur-tier competitor has it, and a
  single-camera model would produce a number we can't stand behind — which
  contradicts the only position in this category that is actually unoccupied.
- **Player names.** Shirt numbers only. The pipeline doesn't know who wears
  what and we will not guess.
- **Positions or formations.** Coaches shown identical footage agree on
  formation barely above chance; we won't assert one.
- **Per-player physical scores or ratings out of ten.** No defensible basis.

---

## What we need back

For each row in Part 1: the export field it maps to, or **empty**. The four in
§1.8 first, if the list is long — those decide whether the product has a
headline at all.

For Part 2 tier 1: which are already in the export under a different name, and
which would need work. Several may exist already and simply not be surfaced.

---

## Part 3 — The visual each stat needs, and what that changes in the ask

**Read this part before exporting anything in Part 2.** The visual is not a
decision we can take afterwards: it decides the shape of the data. A median
cannot make a dot plot, a mean cannot make a histogram, and a single total
cannot make a funnel. Four of the asks in Part 2 change materially once the
visual is settled, and those are flagged **⚠ changes the ask** below.

Three rules govern all of them, and they are already how the app works:

- **One hue for magnitude.** Anything shaded by "more or less" uses a single
  hue, light to dark — and in this product that hue is the kit colour, because
  the kit is what says whose number it is. Never a rainbow.
- **Two hues and a neutral middle for polarity.** Anything measured against a
  target or an opponent runs accent blue one way, coral the other, with the
  page ground as the midpoint. That is the match-flow chart's idiom already.
- **Green and coral are reserved** for target-met and target-breached. They are
  never used to tell two series apart, or we lose the one meaning the whole
  product leans on.

And one product rule: **every mark is a way into the video.** A dot, a bar
segment or a cell that represents moments must carry the timestamps of those
moments, or it is a dead end.

### Tier 1

| # | Stat | Visual | What the export must carry |
|---|---|---|---|
| 1 | Before/after split | **Dumbbell** — one row per metric, two dots joined by a rule, before on the left, after on the right | Two values per metric plus the split timestamp. Not a delta — the reader needs both ends |
| 2 | Time to first pressure | **Strip plot**, every loss as its own dot, with a target tick and a median rule | ⚠ **changes the ask.** The full array of `{ t, seconds }`, not `time_to_press_median_s`. A median cannot be plotted as a distribution, and each dot must open its own clip |
| 3 | Turnover zones | **Pitch heatmap**, 3 × 2 cells, single hue | Six counts, plus the timestamps behind each cell |
| 4 | Turnover → shot | **Meter** — one bar against the total, "9 of 31" stated as a figure beside it | Two counts each way. Not a percentage: the raw pair is the point |
| 5 | Set-piece outcome | **Stacked horizontal bar per type** — corner, free kick, throw — segmented shot / retained / lost | ⚠ **changes the ask.** Counts broken down by type *and* outcome, a 3 × 3 matrix. A total per type cannot be stacked |
| 6 | Rest defence | **Histogram** over 0, 1, 2, 3, 4+ goal-side players | ⚠ **changes the ask.** Bucket counts or the raw array, not `rest_defence_median`. The question is how often it was below two, which a median hides |
| 7 | Build-up exit | **Funnel** — three steps, started in our third → reached middle → reached final, each labelled with its share of the step before | Three counts in sequence |
| 8 | Shot quality | **Shot map** on the pitch, goals filled and the rest outlined, with a stat tile for median distance and the in-box share | Already exported. Needs `x`, `y`, `goal`, `on_target` per shot — all present |
| 9 | Possession ladder | **Column chart**, four ordered buckets: 1–2, 3–5, 6–9, 10+ passes | ⚠ **changes the ask.** Four counts, not `passes_per_sequence`. A mean collapses the only interesting thing about the distribution |

### Tier 2

| # | Stat | Visual | What the export must carry |
|---|---|---|---|
| 10 | Line-break passes | **Pitch with arrows**, the broken line drawn behind them, plus a count | Per pass: start, end, and which line it crossed |
| 11 | Pressing in blocks | **Line against a target baseline**, shaded above and below | Per-minute values, not a total |
| 12 | Recovery height | **Strip plot along the pitch length**, median marked, drawn over a vertical pitch | Array of distances with timestamps |
| 13 | Opponent-adjusted | **Diverging bar** from a zero centre, one row per metric | Both sides' values; we compute the difference |
| 14 | Width in and out | **Two hulls on one pitch**, in-possession filled and out-of-possession outlined, with a dumbbell for the two numbers | Width split by possession state, plus both hulls |
| 15 | Cards and fouls | **Head-to-head rows** in the existing band. No chart | Counts per side, by type |
| 16 | Aerial duels | **Meter** with the win rate as a figure | Won and contested counts |
| 17 | Keeper distribution | **Stacked bar** short against long, with retention labelled under each | Counts by length band and whether possession was retained |
| 18 | Minutes played | **No visual.** It corrects every per-90 figure in the product | On and off events per player |

### What this means in practice

Five of the nine tier-1 stats want **the underlying values rather than a summary
of them**: the press-time array, the set-piece matrix, the rest-defence
distribution, the sequence-length buckets and the turnover pair. That is the
single most useful change to make to the export, and it applies to figures we
already receive — `time_to_press_median_s` and `passes_per_sequence` both exist
today as a single number where the array would be worth far more.

If raw arrays are expensive, pre-bucketed counts are an acceptable substitute
for 6 and 9. They are not a substitute for 2 and 12, where each value has to
stay attached to its timestamp so the coach can open the clip behind it.
