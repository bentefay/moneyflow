# Blank-frame diagnostic probe artifacts

These are the raw artifacts behind Parts 2 and 3 of `../BLANK-FRAME-ANALYSIS.md`. They were
originally written to `/tmp/mf-blank-probe/` and cited from there; a `/tmp` clear would have made
every claim in those two sections unverifiable, so they are copied here.

Provenance is **mixed, and the split matters**. The seven `.txt` files are byte-identical to the
capture — verified with `cmp`, 7 of 7 — so their byte provenance runs unbroken back to the run. The
six `.json` files are **not**: this repository's formatter re-indents JSON from two spaces to four,
so committing them changed their bytes. What is verified for those six is that the **parsed value**
of each equals the parsed value of its `/tmp` original — whitespace moved, data did not.

An earlier revision of this file claimed `md5sum -c` gave "13 of 13 files OK". That was true when
the copies were made and false the moment they were formatted, and it reported a mixed result as
uniform.

**These are DIAGNOSTICS, not scored results.** One session, one repeat, `ordinary` only. They are
not comparable to the ten-run campaign figures in `../ARM-C-AND-COMPARISON.md`, and their
measurement core differs from the campaign's — see the digest table below.

## What each file is

| file                  | arm | commit    | start offset | blank frames | carries `rowGeometry` | carries `masks` |
| --------------------- | --- | --------- | ------------ | ------------ | --------------------- | --------------- |
| `A-top-offset0`       | A   | `cd81290` | 0            | 2            | no                    | no              |
| `C-top-offset0`       | C   | `1d57eb8` | 0            | 3            | no                    | no              |
| `C-deep-offset250k`   | C   | `1d57eb8` | 250,000      | 3            | no                    | no              |
| `C-masks`             | C   | `1d57eb8` | 0            | 3            | no                    | **yes**         |
| `C-geom`              | C   | `1d57eb8` | 0            | 1            | **yes**               | **yes**         |
| `A-count` / `C-count` | —   | —         | —            | —            | —                     | —               |

`A-count.json` and `C-count.txt` are **empty aborted runs** — zero sessions captured, zero rows
seeded, no per-run table. They record only their digests and are kept because they were in the
directory, not because they say anything. `C-count` has no `.json` at all.

The probe was built incrementally, so the fields arrive in different files. **Exactly one blank
frame anywhere in this set carries `rowGeometry`** — the `scrollTop` 5,245 frame in `C-geom.json`.
Every geometry statement in Part 2 § 2 rests on that single frame, and nothing here reproduces it on
arm A.

## Digests

`measurementCore` differs from the scored campaign's (`9ce7b2a6…` in `../C-after-1d57eb8.json`)
because the probe added blank-frame serialisation to the measurement path — the instrumentation
committed as `0f7e989` (`tests/perf/grid-sampler.ts`, `frame-report.ts`, `measure-grid.ts`,
`baseline.measure.ts`), plus the further per-row-geometry and mask additions visible in the digest
spread below. That is why these are diagnostics and not comparable to scored figures.

| file                | measurementCore | orchestration | seedingPath |
| ------------------- | --------------- | ------------- | ----------- |
| `A-top-offset0`     | `ad886576…`     | `1c39fd71…`   | `a7638fa2…` |
| `C-top-offset0`     | `ad886576…`     | `1c39fd71…`   | `a7638fa2…` |
| `C-deep-offset250k` | `ad886576…`     | `1c39fd71…`   | `a7638fa2…` |
| `C-masks`           | `48ab49e5…`     | `1c39fd71…`   | `a7638fa2…` |
| `C-geom`            | `0572d69b…`     | `0213f9fe…`   | `a7638fa2…` |

**`A-top-offset0` and `C-top-offset0` share all three digests.** `tests/perf/harness-digest.ts`
requires the measurement digests to match before two arms may be compared, and here they do — so the
cross-arm identity claim in Part 2 § 1 is digest-valid, which the ten-run campaign comparison is
not.

## SHA-256

These are hashes of the **committed bytes**, so `sha256sum *.json` in this directory reproduces
them. They therefore attest these copies, not the capture; for the capture, the `.txt` byte-identity
above is the surviving link. A previous revision published the `/tmp` originals' hashes here, which
made every one of the six mismatch on verification and pointed at the data when only the whitespace
had moved. The committed JSON is now four-space and formatter-stable, so this block will not drift
again.

```
53c3700b0275319a…  A-count.json
2fdecb264a2ddfb3…  A-top-offset0.json
3d599a8e6763950a…  C-deep-offset250k.json
5d2a5d6efacef6fb…  C-geom.json
0ff47cdba9f57506…  C-masks.json
9bd0b56848761f2c…  C-top-offset0.json
```
