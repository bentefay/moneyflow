# Blank frames: what the captured evidence can and cannot say

Interrogation of `A-before-cd81290-r3.json` and `C-after-1d57eb8.json`. **No new capture was run and
no host time was used.** 80 route runs, 134 recorded blank frames.

Everything under MEASURED is computed from the artifacts. Everything under INFERRED is argument, and
is marked so it cannot later be quoted as measurement.

> **SCOPE: every arm C number here describes commit `1d57eb8`, not HEAD.** HEAD is three commits
> later and `ccac0e6` changed `ROW_HEIGHT` from 44 to 57 in
> `src/components/features/transactions/TransactionTable.tsx`. That constant is passed to the
> virtualizer as `estimateSize`, so it sets the scroll extent, the virtual range and therefore the
> blank-frame behaviour that is the whole subject of this document. **These figures do not describe
> HEAD and would have to be re-captured to do so.** The change itself is well supported — 57px is
> the row height measured in the running app and recorded in
> `src/components/features/transactions/cells/cell-hit-area.ts:11,15`, and both arms already report
> a 57px collapsed row in their seeding evidence. The defect was leaving the gap undeclared.
>
> **PROBE ARTIFACTS: `blank-probe/`.** Parts 2 and 3 originally cited `/tmp/mf-blank-probe/`. The
> files are now committed under `blank-probe/` and every citation below points there. See
> `blank-probe/README.md` for which file carries which field.
>
> Provenance is mixed and the split matters. The seven `.txt` files ARE byte-identical to the
> capture (`cmp`, 7 of 7), so byte provenance survives there. The six `.json` files are not: this
> repository's formatter re-indents JSON from two spaces to four, so committing them changed their
> bytes. What is verified for those six is that the parsed value of each equals the parsed value of
> its `/tmp` original — whitespace moved, data did not.
>
> `blank-probe/README.md` publishes SHA-256 of the **committed** JSON bytes, so `sha256sum *.json`
> in that directory reproduces them; they attest these copies rather than the capture. Two earlier
> claims were wrong in opposite directions and are corrected there: that README published the `/tmp`
> originals' hashes, so all six mismatched on verification and implied tampering when only the
> indentation had moved; and this note previously said the published hashes attest the committed
> copies, which was the reverse of what was actually printed.

---

## First: four of the six questions CANNOT be answered from these artifacts

The instrumented pass did take a semantic snapshot every frame — rectangles, scroll offset, rendered
offset, row indexes — and `classifyFrame` did compute `blankAreaRatio` and the `uncoveredBands`
geometry for every blank frame. **None of it was serialised.** The route report keeps counts,
percentiles and a reason histogram; the per-frame verdicts and the samples are computed, counted and
discarded. A structural scan of both artifacts finds no per-frame array of any kind.

So the following are **unanswerable from what was recorded**, and no amount of re-reading changes
that:

| question                                                  | why not                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Where in the viewport was the gap, and how large?         | `uncoveredBands` and `blankAreaRatio` not serialised                                          |
| Scroll offset and virtualizer range at the blank frame    | the sample's `scrollTop` / `renderedScrollTop` not serialised                                 |
| Where in the route do blanks fall; do they cluster?       | blank frames carry no timestamp or sequence in the artifact                                   |
| Do the SAME offsets blank across repeats and across arms? | same — per-frame offsets absent. **This is the highest-value question and it is unanswered.** |
| How long does each blank persist?                         | requires the frame sequence; only a count survives                                            |

Recording them is cheap — a handful of frames per run — and is the single change that would answer
all five. It has not been made.

---

## MEASURED

### 1. Every blank is a GAP, never an empty grid

Across both arms, all 80 runs, 134 blank frames:

| reason               | count   |
| -------------------- | ------- |
| `uncovered-viewport` | **134** |
| `empty-row-set`      | **0**   |

Rows were mounted on every single blank frame. The viewport was never empty of rows; it was always
partially uncovered. This answers your first question: it is **not** the "zero rows rendered"
defect.

### 2. Every blank falls inside the MOVING window

`uncovered-viewport` counted over all scored frames equals the count over the moving subset, for
every route and both arms (A ordinary 33/33, C ordinary 32/32, A free-spin 31/31, C free-spin
38/38). No blank occurred while the route was holding still or settling.

### 3. Blanking does not track jank — the obvious explanation is refuted

| route          | arm | blank/run | dropped/run  | p95       | FPS   |
| -------------- | --- | --------- | ------------ | --------- | ----- |
| ordinary       | A   | 3.3       | 59.1         | 16.7ms    | 55.02 |
| ordinary       | C   | **3.2**   | **12.2**     | 16.7ms    | 58.98 |
| free-spin      | A   | 3.1       | 47.2         | 30.0ms    | 47.99 |
| free-spin      | C   | **3.8**   | **11.4**     | 21.7ms    | 57.08 |
| fast-reversal  | A/C | **0 / 0** | 39.0 / 11.5  | 31.7ms    | 54/58 |
| large-movement | A/C | **0 / 0** | 104.8 / 22.9 | 368/665ms | 26/48 |

The port cut dropped frames 4-5x on both blanking routes and the blank rate did not move. The route
with by far the worst cadence — `large-movement`, 665ms p95, 23 dropped frames per run — **never
blanks**. The cleanest route — `ordinary`, 16.7ms p95 — blanks 3.2 times per run.

Within-route, run-to-run, blank count does not correlate with dropped frames either (Pearson r over
10 runs): A ordinary +0.14, C ordinary −0.02, C free-spin +0.20. The one larger value, A free-spin
**−0.70**, has the sign OPPOSITE to the naive story — more blanks in the runs with FEWER drops. With
n=10 that is weak, and it is reported rather than interpreted.

### 4. The blanking routes are exactly the two confined to the top of the list

Scroll range actually traversed, from `minScrollTop` / `maxScrollTop`:

| route          | scroll range traversed | blank/run |
| -------------- | ---------------------- | --------- |
| ordinary       | **0 → 11,450**         | 3.2 – 3.3 |
| free-spin      | **0 → 12,667**         | 3.1 – 3.8 |
| fast-reversal  | 98,856 → 107,365       | **0**     |
| large-movement | 249,719 → 270,466      | **0**     |

Identical on both arms. The two routes that blank operate entirely within the first ~12,700px —
about 220 rows of a 440,000–515,000px list. The two that never blank never enter that region.

### 5. Both arms blank at the same rate on the same routes

Arm A and arm C are different rendering paths — a paginated array that grows to 10,000 entries,
versus a sliding block window over a cursor. Blank rates: ordinary 3.3 → 3.2, free-spin 3.1 → 3.8.

---

## INFERRED — argument, not measurement

- **The cause is in something the two rendering paths SHARE.** A defect in pagination or in the
  block window would not survive their replacement at an unchanged rate. What they share includes
  the scroller and its sticky header, the row components and their measurement, and the harness's
  own coverage geometry.
- **Two candidate explanations remain, and this data cannot separate them.** The blanking routes are
  both (a) confined to the top ~12,700px and (b) the slowest-moving pair — `ordinary` is the slowest
  route in the set and `free-spin` decays to near zero. Start offset and velocity are perfectly
  confounded in the current route set.
- **A blank here may be small.** The threshold is 2% of the viewport, ~18px of 900px. At
  `ordinary`'s 600px/s that is about two frames of travel. So these may be brief edge bands rather
  than a dramatically empty grid — or they may not be. **The recorded data cannot distinguish an
  18px seam from a 600px hole, because `blankAreaRatio` was not kept.**
- **An instrument explanation is NOT excluded.** The detector masks sticky overlays; a mask whose
  geometry is wrong in the top region would produce exactly this signature — uncovered bands, only
  near the top, on both arms, indifferent to jank. Against that: `stickyMaskDrift` was false in all
  80 runs, so the mask element set was stable. But stability is not correctness, and the harness has
  produced a confident wrong signal before.

---

## What would settle it, cheapest first

1. **Serialise blank-frame detail** — sequence number, route-relative time, `scrollTop`,
   `renderedScrollTop`, band rectangles, area ratio. A handful of frames per run. Answers all five
   open questions on the next capture, and would immediately distinguish a real gap from a masking
   artifact.
2. **Run `ordinary` from a deep start offset** (e.g. 250,000px), unchanged otherwise. If blanks
   vanish it is positional; if they persist it is velocity. This separates the one confound the
   current route set cannot.
3. Only then a CPU sampling profile, pointed at whatever 1 and 2 identify.

---

# Part 2 — with blank-frame detail recorded, and the discriminator run

Step 1 (persist band geometry) and step 2 (deep start offset) both done. Five diagnostic runs with
data, one session and one repeat each, `ordinary` only, full 480-row fixture. Artifacts in
`blank-probe/`. These are DIAGNOSTICS, not scored results — their measurement-core digest differs
from the scored campaign's, and they are one run apiece.

## MEASURED

`visible` below is the artifact's `visibleRowCount` field. **It is not a mount count.** In
`tests/perf/grid-sampler.ts` the two are computed separately: `rowGeometry` collects every
`[data-index]` element unconditionally, while `visibleRowCount` counts only those whose rect
intersects the scroller's rect. An earlier revision of this section read the second as the first and
drew a conclusion from it that the data refutes; that conclusion is retracted in § 2 below.

| run                      | file                     | blanks | scrollTop at blank          | visible    | mounted  | band                  | placement   |
| ------------------------ | ------------------------ | ------ | --------------------------- | ---------- | -------- | --------------------- | ----------- |
| arm C, start 0           | `C-top-offset0.json`     | 3      | 5,245 / 9,570 / 9,570       | 7 / 8 / 8  | not kept | 265px / 208px / 208px | bottom-edge |
| **arm A, start 0**       | `A-top-offset0.json`     | 2      | **5,245 / 9,570**           | **7 / 8**  | not kept | **265px / 208px**     | bottom-edge |
| arm C, start **250,000** | `C-deep-offset250k.json` | 3      | 253,035 / 254,919 / 254,919 | 10 / 8 / 8 | not kept | 48px / 208px / 208px  | bottom-edge |
| arm C, start 0, masks    | `C-masks.json`           | 3      | 5,245 / 5,245 / 9,570       | 7 / 7 / 8  | not kept | 265px / 265px / 208px | bottom-edge |
| arm C, start 0, geometry | `C-geom.json`            | 1      | 5,245                       | 7          | **21**   | 265px                 | bottom-edge |

Two things this table now shows that the earlier one did not:

- **`rowGeometry` exists for exactly one blank frame in the whole probe set** — the 5,245 frame in
  `C-geom.json`. Every mount-count statement in this document rests on that one frame, and **nothing
  reproduces it on arm A.**
- **The blank COUNT is not reproducible run to run**, even at a fixed arm, commit and start offset:
  three arm C runs from offset 0 recorded 3, 3 and 1 blank frames. What reproduces is the set of
  OFFSETS ({5,245, 9,570}) and the band geometry at each, not how many frames land on them.

A `lag` column was dropped from this table. It reported `scrollTop − renderedScrollTop`, which was
always 0.0 — and it could not have been anything else. See § 2.

### 1. The two arms blank at the SAME OFFSETS with the SAME GEOMETRY

Arm A and arm C — a paginated growing array versus a sliding block window over a cursor — both blank
at scrollTop **5,245** and **9,570**, with bands of **265px** and **208px**, at the bottom edge, and
the same `visibleRowCount` of 7 and 8. Not similar: identical. This was the highest-value question
and the answer is that the blanking is tied to the CONTENT AT THOSE OFFSETS, not to either rendering
path.

Two supports for this specific comparison, neither previously stated:

- `A-top-offset0` and `C-top-offset0` carry **identical `measurementCore`, `orchestration` and
  `seedingPath` digests** (`ad886576…` / `1c39fd71…` / `a7638fa2…`). `tests/perf/harness-digest.ts`
  makes a matching measurement digest the precondition for comparing two arms, and here it holds —
  which is more than the ten-run campaign comparison can say.
- The reproducible quantity is the offset set, not the count (see the table note above). The word
  "deterministic" was too strong and is withdrawn.

### 2. RETRACTED: it is not a trailing shortfall, and the desync check could not have failed

The previous § 2 read: _"`scrollTop` equals `renderedScrollTop` to 0.0px on every blank frame. The
rendered window is positioned correctly; there are simply not enough rows below it. Only 7-10 rows
are mounted where the ~693px viewport needs about 12."_ **Both halves are wrong, and the file cited
for them refutes them.**

**The desync check is a tautology.** `tests/perf/grid-sampler.ts:319` (line number at HEAD) computes
`renderedScrollTop = translateY + parentTop + scrollTop − rect.top`. The rows are
`absolute top-0 left-0` inside the row container with `transform: translateY(start)`
(`TransactionVirtualRows.tsx`), so `rect.top === parentTop + translateY` identically and the whole
expression reduces to `scrollTop`. A `lag` of 0.0 is what that formula prints on every frame ever
sampled. It is not evidence that the window is positioned correctly, and no value of it could have
been evidence that it was not.

**The window is skewed high, not short.** From `blank-probe/C-geom.json`, the one frame with
geometry — scrollTop 5,245, scroller rect 182→875 in page coordinates, 693px tall, one 37px sticky
header at 182→219:

| quantity                                            | value                                        |
| --------------------------------------------------- | -------------------------------------------- |
| rows mounted                                        | **21**, indexes **71…91**, fully consecutive |
| `visibleRowCount`                                   | 7 (indexes 85…91)                            |
| mounted content span                                | translateY 4,257 → 5,636 = **1,379px**       |
| scroller height                                     | 693px (656px of it below the sticky header)  |
| rows entirely ABOVE the scroller rect               | **14** (indexes 71…84), spanning **898px**   |
| mounted content above the scroller's top edge       | **951px**                                    |
| rows below the scroller rect                        | **0**                                        |
| mounted content short of the scroller's bottom edge | **265px** — exactly the blank band           |

Roughly twice enough row content is mounted to fill the viewport; it is in the wrong place.
`OVERSCAN` is 5 (`TransactionTable.tsx:719` at HEAD, `:707` at `1d57eb8` — same value at both), so
at most 5 rows are licensed above the first visible row: indexes 80…84, 349px. **Nine more (71…79)
are mounted above that.**

Three further checks on the same frame, all of which the earlier reading would have failed:

- **The measurements are self-consistent.** `translateY[i] + offsetHeight[i] === translateY[i+1]`
  for all 20 consecutive pairs, exactly, including the 75px and 103px rows. The virtualizer's
  cumulative offsets and what the rows actually rendered as agree to the pixel. This kills the
  "estimate-versus-measured mismatch" reading of § 5 below as well.
- **The range is not clipped.** Highest mounted index 91 against a virtualizer `count` of 10,000 and
  a loaded row window of 600 anchored at 0 — neither boundary is anywhere near.
- **The mounted set is what `defaultRangeExtractor` produces from an un-overscanned range of
  76…86.** 21 = 11 + 2×5, contiguous, no pinned outlier.

**DERIVED (arithmetic, not a mechanism):** feeding the recorded `translateY`/`offsetHeight` values
into `calculateRangeImpl` from the installed `@tanstack/virtual-core@3.17.7` — start = greatest
index whose `start ≤ scrollOffset`, end = first index whose `end ≥ scrollOffset + outerSize`,
`outerSize` 693 — the range 76…86 is produced by, and only by, a `scrollOffset` between **4,560 and
4,594**. The scroller's own `scrollTop` at that frame was **5,245**. The mounted window therefore
corresponds to a scroll position **651–685px behind** the container's.

**The mechanism is UNDETERMINED and this document does not propose one.** Five successive mechanisms
have now been advanced here and refuted (jank, start offset, header coordinate origin,
`scrollMargin`, and this section's own "too few rows"). A sixth would be guessing.

What would settle it, and nothing weaker will:

- `virtualizer.getVirtualItems()` and `virtualizer.range` as the instance itself holds them;
- the instance's own `scrollOffset` — the number `calculateRange` is actually called with, which is
  the quantity `renderedScrollTop` was supposed to check and never did;
- `virtualizer.scrollAdjustments`, which exists in virtual-core precisely to hold a deliberate
  offset between the element's `scrollTop` and the offset the virtualizer uses, and is therefore the
  first thing that could make 651–685px a correct number rather than a bug;

logged from the `notify`/`onChange` callback, so the value is the one the range was computed with,
rather than whatever a rAF sample happens to catch afterwards.

One structural fact worth recording while it is in front of us, because it is arithmetic rather than
a hypothesis: the virtualizer is created with **no `scrollMargin`** (`TransactionVirtualRows.tsx`),
yet the row container's origin sits 37px below the scroller's content origin — the sticky header
occupies that strip in flow. That is a constant 37px of bias between the virtualizer's coordinate
space and the scroller's. It is real, it should be fixed, and at 37px it accounts for about 5% of
the 651–685px displacement. **It does not explain the band.**

### 3. The gaps are large, not seams

208-265px of a 693px viewport — **30-38% uncovered**, at the bottom edge. One smaller instance of
48px (6.9%) also appears. So this is not an 18px sub-threshold artifact; a third of the transaction
list area is empty on those frames.

### 4. Position is NOT the cause — the discriminator is decisive

Running the identical route from **250,000px** produces the same defect: 3 blanks, bottom-edge,
trailing, 208px bands. The blanking is not a top-of-list effect. (The "zero lag" that this section
previously also cited is withdrawn — see § 2. No mount geometry was recorded for the deep-offset
run, so whether its window is displaced the same way as the 5,245 one is **unknown**.)

### 5. The `scrollMargin` hypothesis is DEAD

It predicted a band at one edge of about the header's height (~40-56px). Observed: bands at the
**bottom** edge of **208-265px**, and they occur at 250,000px, far from the coordinate origin.
Killed, as requested, rather than left hanging.

Reinforced rather than weakened by § 2: the missing `scrollMargin` is now confirmed present as a
37px coordinate-space bias, and 37px is still nothing like 265px.

## What the three-way confound now looks like

The lead correctly noted it was three-way. Resolved:

| candidate                  | status                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| start offset / top of list | **eliminated** — reproduces identically at 250,000px                |
| header coordinate origin   | **eliminated** — same, and the geometry is wrong for it             |
| low velocity               | **still live** — `ordinary` at 600px/s blanks; 4,000px/s never does |

## INFERRED — argument, not measurement

> **The paragraph that stood here is WITHDRAWN.** It read: _"The signature is a virtualiser mounting
> too few rows to fill the viewport at particular offsets, with its window correctly positioned. The
> fixture's 480 expanded rows are 103px against a 57px collapsed row and are spread 1-in-20, so a
> region whose real heights differ from the virtualiser's estimate would produce exactly this."_
>
> `blank-probe/C-geom.json` contradicts both premises. 21 rows are mounted spanning 1,379px against
> a 693px viewport, so the window is not too short; and `translateY[i] + offsetHeight[i]` equals
> `translateY[i+1]` exactly for all 20 pairs at that frame, including the 75px and 103px rows, so
> the virtualizer's offsets and the rendered heights do not disagree at all. An
> estimate-versus-measured mismatch is the one thing this frame rules out.

What survives as argument rather than measurement:

- **The cause is in something the two rendering paths SHARE**, unchanged from Part 1. Both drive
  `@tanstack/react-virtual` with `measureElement` and dynamic sizes — the one component the port did
  not replace — and both sit in the same scroller under the same sticky header.
- **Nothing here identifies which shared thing.** The measured facts are the signature, the offsets,
  the band geometry, the cross-arm identity, and — at one frame only — a mounted window whose range
  corresponds to a scroll offset 651–685px behind the container's. Why the two disagree is
  **undetermined**, and the list of refuted mechanisms is now five long.

## Cheapest next step, if this is pursued

Record, from the virtualizer instance itself and inside its `notify`/`onChange` callback:
`getVirtualItems()`, `range`, `scrollOffset`, `scrollAdjustments`, and `getTotalSize()`. Then re-run
this same 5-minute diagnostic. The offsets are known and reproduce, so the question is narrow: does
the instance's own `scrollOffset` match the element's `scrollTop` at the blank frame, and if not,
does `scrollAdjustments` account for the difference. Also record `rowGeometry` on **every** blank
frame and on **both** arms — the current probe has it for one frame on one arm, which is the weakest
part of this analysis.

A CPU profile is still not indicated: nothing here says the grid was too slow, and at 59 FPS it
plainly was not. (The earlier form of this sentence leaned on "with zero lag", which meant nothing —
see § 2.)

---

# Part 3 — is it a masking artifact? Measured: no

The detector masks sticky overlays, so a mask whose geometry was wrong would invent an uncovered
band. Recording the masks beside the bands settles whether that happened.

## MEASURED — the bands are nowhere near the mask

| blank @ scrollTop | viewport  | MASK (sticky header) | BAND                  |
| ----------------- | --------- | -------------------- | --------------------- |
| 5,245             | 182 → 875 | **182 → 219 (37px)** | **610 → 875 (265px)** |
| 5,245             | 182 → 875 | 182 → 219 (37px)     | 610 → 875 (265px)     |
| 9,570             | 182 → 875 | 182 → 219 (37px)     | 667 → 875 (208px)     |

There is exactly **one** mask, the sticky header, **37px tall at the TOP** of the viewport. The
bands are at the **BOTTOM**, starting 391px and 448px BELOW the mask's lower edge, and they are 5.6
to 7.2× taller than the mask. They do not abut it, overlap it, or touch it.

**A mask-geometry error cannot produce these bands.** The masking hypothesis is eliminated.

## An independent arithmetic cross-check, from recorded numbers only

> **REPLACED.** The previous version of this check read: _"7 rows were mounted, and collapsed rows
> are 57px. 7 × 57 = 399px … those agree to within a row's rounding."_ It was invalid twice over. 7
> is `visibleRowCount`, not a mount count (21 rows were mounted); and the seven visible rows are not
> seven collapsed rows — `blank-probe/C-geom.json` records them as 57, 75, 57, 75, 57, 103, 57 =
> **481px**, three different height classes. 399 and 391 were two unrelated quantities that happened
> to land near each other.

Redone from the recorded per-row geometry at the 5,245 blank, and it closes exactly rather than
approximately. The seven rows intersecting the scroller are indexes 85…91:

| step                                                      | from the artifact         | value     |
| --------------------------------------------------------- | ------------------------- | --------- |
| heights of rows 85…91                                     | `offsetHeight`            | 481px     |
| of row 85, the part above the scroller's top edge         | 5,208 − 5,155             | 53px      |
| covered, measured from the scroller's top edge (page 182) | 481 − 53                  | **428px** |
| the sticky header sits over the first 37px of that        | 428 − 37                  | **391px** |
| band top, measured from the mask's bottom edge (page 219) | 610 − 219                 | **391px** |
| band height                                               | 875 − 610                 | **265px** |
| independently: 693 − 428                                  | scroller height − covered | **265px** |

Two exact agreements, no rounding. The rows that reach the viewport really do cover only 391px below
the header, and the remaining 265px really does contain no row. What this does **not** show — and
the earlier version implied it did — is that too few rows were mounted. Twenty-one were; fourteen of
them are above the viewport entirely. See Part 2 § 2.

## What this does and does not close

**Closed:** the gap is not an artifact of masking. The blanking finding stands as a product
observation, and the correction the lead was preparing is not needed.

**Not closed:** this rules out the MASK as the source. It does not independently verify the
rectangle algebra in `findUncoveredBands`, nor that `rowRectangles` collected every mounted row. The
arithmetic cross-check above is reassuring on both, but it uses the same recorded rectangles. A
SCREENSHOT at a blank frame would be independent of all of it, and remains the one check that could
still overturn this. It was NOT taken — see below.

## Screenshots: not captured, and why

Capturing at the exact blank frame is not achievable in this architecture, and I did not want to
silently substitute something else. Blankness is classified OFFLINE, after the run, by joining trace
frames to samples — the harness does not know a frame is blank while it is on screen, so there is no
moment at which to trigger a capture. A `Page.captureScreenshot` round trip also costs 50-200ms,
which would perturb the frame being measured.

The workable route, not taken here for want of time: add the
`disabled-by-default-devtools.screenshot` trace category, which embeds frame images in the trace the
harness already captures with no extra round trip, then extract the image nearest each blank
timestamp offline. That is how the DevTools filmstrip works and it costs one flag plus an extraction
pass.
