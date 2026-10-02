# Stitch prompt — Ipanema landing page, sign in, sign up

Paste the blocks below into a **fresh Stitch project**. Block A is the system and
must go first; it replaces any palette or type instruction from an earlier
project. Blocks B, C and D are the three screens. Block E is the rule set that
stops the output drifting.

Everything here matches what is already built in the app, so whatever Stitch
returns can be ported without re-deciding colours or type.

---

## Block A — the design system

```
DESIGN SYSTEM — Ipanema Match Analytics. This replaces every colour, type and
shape instruction from any previous project.

GROUND. The page background is a gradient, applied to the page only and never
to a card:
  linear-gradient(165deg, #15121F 0%, #110F1C 45%, #0C1018 100%)
Deep purple at the top bleeding into navy at the bottom. One atmospheric effect
is allowed on the whole page and no more: a single soft violet glow behind the
hero, rgba(124,92,255,0.12), about 900px wide, heavily blurred, centred at the
top. Nothing else glows. No other gradients, no glassmorphism, no blurred
translucent panels, no neon.

SURFACES sit flat on that ground:
  --surface      #1A1726   cards and panels
  --surface-2    #221E30   inset areas, chart grounds, input fields
  --surface-3    #2A2539   hover and pressed states
  --wire         #332C45   borders, 1px
  --wire-2       #251F33   inner dividers

TEXT:
  --text         #ECE7F2   body
  --text-bright  #F6F3FA   headings and figures
  --text-dim     #A39DB8   secondary lines
  --text-faint   #8982A0   captions and units

FOUR COLOURS, each with exactly one job. Colour encodes state; it never
decorates. Never use a colour outside its job:
  --cream     #EFE8DA  ONE focal point per screen — the single primary button,
                       or the single number the screen is about. Text on cream
                       is #15121F. If two things are cream, one of them is wrong.
  --accent    #6FA8FF  interaction and structure: links, section labels, card
                       icons, form focus rings, the secondary figure in a pair.
  --positive  #46D894  measured and met: a target reached, a completed step, a
                       confirmed count.
  --alarm     #FF6B6B  breached: a failed state, an error, a missed target.

SHAPE. Zero border radius. Corners are square on every card, panel, input,
chip, tag and button. The only exceptions are true circles: status dots, avatar
images and club crests. No pills, no rounded buttons.

DEPTH. No shadows anywhere. No floating elevation. Separation comes from a 1px
#332C45 hairline and a step in surface brightness. Modules divide with
hairlines rather than wide gaps.

TYPE. Two voices and never mix them up:
  Barlow Condensed, italic, 700–800, uppercase — the scoreboard voice. Page
  titles, big figures, anything meant to be read from across a room.
  Hanken Grotesk, 400–700 — everything else: body copy, labels, buttons, form
  fields, captions. Never set Hanken in italic.
  Micro-labels are 10–11px, 600–700, uppercase, letter-spacing 0.08em–0.1em.
  Figures use tabular numerals.

LAYOUT. Max container width 1440px. Desktop at 1440 and mobile at 390. On
mobile every layout is a single column with a 16px side gutter and no
horizontal scroll.
```

---

## Block B — the landing page

The thing to understand before writing it: the visitor is a **youth football
coach**, not a buyer of analytics software. He films matches on a tripod or a
club camera, he has about forty minutes on a Sunday evening, and on Tuesday he
has to run a session. He is not interested in a platform. He wants to know what
to work on and to show his players the clip that proves it.

So the page sells one promise: **you give us the video, we give you Tuesday.**

```
SCREEN: LANDING PAGE. Desktop 1440 and mobile 390. Use the design system above.

The reader is a youth football coach who films his own matches and has forty
minutes on a Sunday evening. He is not buying software; he wants to know what
to coach on Tuesday. Write every line to him, in plain English, as another
coach would speak. No marketing register.

SECTION 1 — HERO
Left column, about 60% width on desktop; stacked on mobile.
  Micro-label: "For youth football coaches"
  Headline, Barlow Condensed italic uppercase, 72px desktop / 40px mobile, in
  two lines:
      "FROM FINAL WHISTLE
       TO TUESDAY'S SESSION"
  One paragraph beneath, 17px, max 55 characters per line:
      "Upload the match. Get back the three things that decided it, the clips
      that prove each one, and a session plan built from them."
  Two actions on one row: a cream primary button "Start free with one match",
  and a hairline-outlined secondary button "See a real match report".
  Under them, one faint line: "No card. One match, free, start to finish."

Right column: a single screenshot-style panel of the product, square corners,
1px #332C45 border, no shadow and no perspective tilt. Inside it, draw a
simplified Insights screen: a short uppercase italic quote headline, three
figures in a row (one white, one #6FA8FF, one #46D894), and beneath them a
wide territory chart — one chalk line across the panel with the area below it
filled #6FA8FF at 50% opacity. Do not add a browser chrome frame.

SECTION 2 — THE THREE THINGS IT GIVES BACK
A band of three cards divided by 1px hairlines, edge to edge, no gaps.
Each card: an outlined 36px square icon in #6FA8FF, a title, two lines of copy.
  1. "The one thing to fix"
     "Every match returns a single headline finding, with the number behind it
     and the target you set. Not a dashboard of forty metrics."
  2. "The clips that prove it"
     "Each finding carries its moments. Tap one and the video is already at
     the right second, ready to share to your staff group."
  3. "Tuesday's session"
     "The finding becomes a session plan with drills, durations and pitch
     diagrams you can print and take out with you."

SECTION 3 — HOW IT WORKS
Four numbered steps in a row on desktop, stacked on mobile, divided by
hairlines. Each is a large italic numeral in #8982A0, a short title and one
line:
  01 Upload — "One video file from any fixed camera. MP4 or MOV."
  02 We watch it — "Players, ball and every turnover, tracked. About thirty
     minutes for a half."
  03 You read it — "Three findings, the clips behind them, and the numbers
     each one rests on."
  04 You coach it — "Build Tuesday's session from the finding and print it."

SECTION 4 — HONESTY
A single full-width panel, surface #1A1726, 1px border, generous padding.
  Micro-label in #6FA8FF: "What we will not do"
  Headline, Barlow Condensed italic, 36px: "WE DON'T INVENT NUMBERS"
  Body, max 70 characters per line:
      "When the camera loses the ball, we say so. A figure we can't stand
      behind is marked withheld, with the reason next to it. You will never
      take a number into a dressing room that we made up."
  Beneath, a small inset example on #221E30: the label "Block length", the
  word "Withheld" in #A39DB8, and under it in #8982A0: "Ball tracking below
  threshold in the second half."

SECTION 5 — WHO IT IS FOR
Three short lines, each with a 6px #46D894 dot:
  "Youth and academy coaches, from U13 up"
  "Clubs filming on a tripod, a club camera or a phone"
  "Anyone who runs the session as well as the analysis"

SECTION 6 — CLOSING
Centred. Headline, Barlow Condensed italic, 48px: "YOUR NEXT MATCH IS
TUESDAY'S SESSION". One cream button: "Start free with one match". One faint
line beneath: "One match, free. No card."

FOOTER
One hairline rule, then a single row: the IPANEMA wordmark on the left, and on
the right four plain text links — Sign in · Privacy · Terms · Contact. No
newsletter box, no social icons, no column stacks of links.
```

---

## Block C — sign in

```
SCREEN: SIGN IN. Desktop 1440 and mobile 390. Use the design system above.

A single centred column, 560px wide on desktop, full width with a 16px gutter
on mobile. The page ground still carries its gradient; the column has no card
around it.

Top bar: the IPANEMA wordmark, left. Nothing else in the bar.

In the column, top to bottom:
  A 1px hairline rule across the column.
  A row above it: micro-label "Ipanema" on the left, micro-label "Season
  2026/27" on the right, both #8982A0.
  Headline, Barlow Condensed italic uppercase, 56px desktop / 40px mobile:
  "SIGN IN"
  One line beneath in #A39DB8: "Your matches, findings and sessions."

  Field 1. Label row: "Email" on the left in micro-label caps. The input is
  56px tall, background #221E30, 1px #332C45 border, square, 16px text. On
  focus the border becomes #6FA8FF.
  Field 2. Label row: "Password" on the left, and on the right a plain text
  link "Forgot password" in #6FA8FF at 12px. Same input treatment, with an eye
  icon at the right edge to reveal.

  Primary button, full width, 56px tall, cream fill #EFE8DA with #15121F text,
  uppercase 13px bold, label "Sign in", with a small arrow at the right edge.

  A 1px hairline, then one row: "New club?" in #8982A0 on the left and
  "Create an account" in #6FA8FF on the right.

Do NOT include: social sign-in buttons, a "remember me" checkbox, a decorative
illustration, or a split-screen photo panel.
```

---

## Block D — sign up

```
SCREEN: SIGN UP, step 1 of 3. Desktop 1440 and mobile 390. Use the design
system above. Same centred 560px column as sign in.

At the top of the column, a three-segment progress rule: three 4px bars in a
row with small gaps. The first is #EFE8DA, the other two #332C45.

Beneath it, a row: "Step 1 of 3" on the left and "Your club" on the right,
both micro-label caps in #8982A0.

Headline, Barlow Condensed italic uppercase, 56px: "YOUR CLUB"
One line beneath in #A39DB8: "This is what appears on every report and session
sheet you print."

  Field: "Club name", placeholder "Sollentuna FK".
  Field: "Home ground", placeholder "Norrviken IP 1".
  Crest block: a panel on #221E30 with a 1px border, containing a 72px dashed
  square outline with a + in the middle on the left, and on the right the line
  "Upload your crest" in #ECE7F2 with "SVG or PNG. A transparent background
  works best." beneath it in #8982A0.
  Field: "Kit colour" — a row of six square swatches, 40px, with the selected
  one carrying a 2px #EFE8DA outline.

Primary cream button, full width, 56px: "Continue to your team".
A plain text link beneath, centred, #8982A0: "I already have an account".

Steps 2 and 3 use the identical layout, with the progress rule advanced:
  Step 2 "Your team" — age group, team name, and the season.
  Step 3 "Your targets" — three numeric fields with the labels "Press within
  two seconds (%)", "Ball back within five seconds (%)" and "Block length
  ceiling (m)", each with a short line beneath explaining that this is the
  standard his own findings will be measured against, and that he can change
  it later.
```

---

## Block E — house rules

```
HOUSE RULES. These override anything above if they conflict.

VOCABULARY. Write as a coach speaks. Banned outright, in copy, labels and
decoration: "SYS.AUTH", "SECURE NODE", "NODE.08", "REQ.01", "SPEC.V4",
"ENCRYPTED", "PROTOCOL", "MATCH CONTROL HUB", "TACTICAL ENTITY", "UNREGISTERED
PITCH", and every other piece of military or sci-fi dressing. No serial
numbers, no fake system readouts, no coordinates in the chrome. The product is
a clipboard, not a missile console.
Also banned: "AI-powered", "leverage", "unlock", "revolutionise", "game-
changing", "insights at your fingertips", "seamless", "empower".

SENTENCE CASE. Buttons and micro-labels are uppercase. Everything else —
headings, field labels, body copy, links — is sentence case. Never put a
sentence in capitals.

NO INVENTED DATA. Any figure shown in a mock-up must be one the product could
actually produce: a percentage with a target, a count of moments, a scoreline,
a duration. Never invent player names, positions, per-player averages, xG, or
ratings out of ten. Shirt numbers are fine; names are not.

CRESTS. Where a club crest appears and you have no image, draw a square plate
with a 1px border in the team's kit colour containing the three or four letter
code — SFK, DIF — never a coloured blob and never a generic shield icon.

ICONS. Outlined, 1.75px stroke, square 36px bounding box with a 1px #332C45
border around it. Use only: upload, play, calendar, scissors, target, timer,
chart, map pin, printer, check, chevron. No filled icons, no emoji, no
illustrations of people.

TEXT DENSITY. At most five text elements per card: label, title, figure, one
sentence, one link. If a card needs more, it is two cards.

TYPE SIZES. Four only on any screen: the headline, the section title, the body
size, and the micro-label. Do not introduce intermediate sizes.

PITCH DIAGRAMS. If any pitch appears, it is drawn at exactly 105:68 — that is
1.544 to 1, so 660 x 428 landscape. Any other ratio makes every distance on it
wrong. Chalk lines on dark green turf.

RESPONSIVE. Deliver both a 1440 desktop and a 390 mobile artboard for every
screen. Mobile is a single column; nothing scrolls sideways; tap targets are at
least 44px.

NO FOOTER BAR inside the app screens, and no fake copyright line like "© 2026
SFK Youth Football Academy. All debriefs confidential."
```

---

## What to check when it comes back

Fast pass, in this order — these are the four things that went wrong in
previous rounds:

1. **Corners.** Any radius anywhere except a status dot, an avatar or a crest
   means Block A was dropped. Reject and re-run rather than patching.
2. **Cream count.** More than one cream element per screen means the focal rule
   was ignored, and the page will have no centre.
3. **Vocabulary.** Search the output for "PROTOCOL", "NODE", "SYS" and "REQ".
   One hit means Block E was skipped.
4. **Invented data.** Player names, positions or an xG figure anywhere means
   the output cannot be ported, because the pipeline cannot produce them.

Then the slower pass: sentence case outside buttons, four type sizes, five
elements per card, and a mobile artboard for each screen.
