#!/usr/bin/env python3
"""Normalized-block checker: verify each human-scratch SCOPE block byte-matches
the frozen sourceTextLines after canonicalizing the checkbox token, so an
authorized [x] (or rolled-back []) flip still matches SCOPE. Prints mismatches."""
import json, re, sys

SCOPE = "specs/007-human-scratch-completion/SCOPE.json"
SCRATCH = "specs/human-scratch.md"
CANON = re.compile(r"^(\s*)- \[[ xX]?\] ")

def canon(line: str) -> str:
    return CANON.sub(r"\1- [] ", line)

def parse_range(r):
    r = str(r).strip()
    if "-" in r:
        a, b = r.split("-", 1)
        return int(a), int(b)
    return int(r), int(r)  # single line: start == end (NOT slice-to-EOF)

def main():
    scope = json.load(open(SCOPE))
    scratch = open(SCRATCH).read().split("\n")
    checked = 0
    mismatches = 0
    for req in scope["requirements"]:
        src = req.get("sourceId", "")
        stl = req.get("sourceTextLines")
        rng = req.get("sourceLineRange")
        # only human-scratch blocks carry markers + sourceTextLines
        if stl is None or rng is None:
            print(f"SKIP {req['id']} (no sourceTextLines/range; sourceId={src})")
            continue
        if "human-scratch" not in src and src != "SRC-HUMAN-SCRATCH":
            print(f"SKIP {req['id']} (non-scratch source {src})")
            continue
        start, end = parse_range(rng)
        actual = scratch[start - 1:end]  # 1-indexed inclusive
        exp_c = [canon(l) for l in stl]
        act_c = [canon(l) for l in actual]
        checked += 1
        if exp_c != act_c:
            mismatches += 1
            print(f"MISMATCH {req['id']} range {rng}")
            print(f"  expected(canon): {exp_c}")
            print(f"  actual(canon):   {act_c}")
    print(f"\nBLOCKS CHECKED: {checked}  MISMATCHES: {mismatches}")
    sys.exit(1 if mismatches else 0)

if __name__ == "__main__":
    main()
