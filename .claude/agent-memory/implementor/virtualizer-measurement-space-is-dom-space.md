---
name: virtualizer-measurement-space-is-dom-space
description:
    react-virtual positions rows at their measurement offsets, so under-estimating row height mounts
    MORE rows and makes them overlap - a trailing gap requires measurements LARGER than rendered
    heights, never smaller
metadata:
    type: reference
---

Rows are painted at `translateY(virtualRow.start)`, and `virtualRow.start` is the cumulative
measurement offset. `calculateRangeImpl` picks `endIndex` by walking
`while (measurements[endIndex].end < scrollOffset + outerSize)`. Both sides of that comparison live
in the same coordinate space the rows are painted in, so **the range covers the viewport by
construction** — the only way it fails to is if a measurement disagrees with the height the row
actually renders at.

The two directions are not symmetric and it is easy to get backwards:

- **measurement too small** (a constant `estimateSize` under real heights): the walk needs _more_
  rows to reach the limit, and they are painted closer together than they are tall → rows **overlap
  and overflow**, and _more_ elements mount.
- **measurement too large** (a stale `itemSizeCache` entry, e.g. a height cached while a row was
  expanded): a few rows appear to span the viewport, the walk stops early → **trailing gap**, and
  _fewer_ elements mount.

A useful floor when a report says "too few rows mounted": `defaultRangeExtractor` adds `overscan` on
each side, so mid-list the mount count cannot go below `2 × overscan`. A count below that is not an
estimate problem at all — suspect `outerSize` (`getSize()` returns `scrollRect ?? initialRect`, fed
by `observeElementRect`), because a viewport measured shorter than it paints produces a trailing gap
of exactly `clientHeight − outerSize` while leaving positioning perfectly correct.

Also: `getItemKey` defaults to `(index) => index` and this repo never overrides it, so
`itemSizeCache` is keyed **positionally** while React keys are transaction ids. Under filtering the
same index holds a different row, and a cached height then belongs to the wrong one.

This killed a plausible hypothesis before anyone wrote the fix for it: the arithmetic, not the
argument about direction, is what settles these. See [[rigour-on-the-wrong-object]] and
[[causal-claims-in-measured-voice]].
