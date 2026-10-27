"""Check the fact base against the transcripts.

Run from the repository root:  python3 research/check_facts.py
Every fact's `quote` must appear in its source transcript at the given
timestamp (or run on into the next line). Prints any problems found.
"""
import re
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).parent
TRANSCRIPTS = {"S1": HERE / "transcripts" / "S1-fnjan-en.txt"}


def norm(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("…", "...")
    return re.sub(r"\s+", " ", s).strip().lower()


def load(path):
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\[(\d+:\d\d:\d\d)\] (.*)", line)
        if m:
            lines.append((m.group(1), m.group(2)))
    return lines


def main():
    facts = yaml.safe_load((HERE / "facts.yml").read_text(encoding="utf-8")) or []
    transcripts = {k: load(v) for k, v in TRANSCRIPTS.items()}
    problems, ids = 0, set()
    for f in facts:
        fid = f.get("id")
        if fid in ids:
            print(f"{fid}: duplicate id"); problems += 1
        ids.add(fid)
        src, _, ts = f["source"].partition("@")
        lines = transcripts.get(src)
        if lines is None:
            print(f"{fid}: unknown source {src}"); problems += 1; continue
        idx = [i for i, (t, _) in enumerate(lines) if t == ts]
        if not idx:
            print(f"{fid}: no transcript line at {ts}"); problems += 1; continue
        i = idx[0]
        window = norm(" ".join(text for _, text in lines[i:i + 2]))
        if norm(f["quote"]) not in window:
            print(f"{fid}: quote not found at {ts}: {f['quote']!r}"); problems += 1
    print(f"{len(facts)} facts checked, {problems} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
