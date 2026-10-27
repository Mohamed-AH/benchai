"""Cross-check the chapters against the fact base.

Run from the repository root:  python3 research/check_chapters.py
Lists fact ids cited in a page but missing from facts.yml, paragraphs with no
fact ids, facts not used anywhere, and facts marked `check` or `disputed`
that the site uses.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
facts = {f["id"]: f for f in yaml.safe_load((ROOT / "research" / "facts.yml").read_text(encoding="utf-8"))}
pages = sorted(ROOT.glob("en/chapters/*.md")) + sorted(ROOT.glob("ar/chapters/*.md")) + [ROOT / "en/timeline.md", ROOT / "ar/timeline.md"]
cite = re.compile(r"\{% comment %\}([^{]*)\{% endcomment %\}")
problems = 0
used = {"en": set(), "ar": set()}
for page in pages:
    if not page.exists():
        continue
    lang = page.relative_to(ROOT).parts[0]
    body = page.read_text(encoding="utf-8").split("---", 2)[2]
    for para in re.split(r"\n\s*\n", body):
        text = para.strip()
        if not text or text.startswith("#") or text.startswith("|---") or text.startswith("| Year") or text.startswith("| السنة"):
            continue
        rows = text.splitlines() if text.startswith("|") else [text]
        for row in rows:
            if row.startswith("|---") or row.startswith("| Year") or row.startswith("| السنة"):
                continue
            ids = re.findall(r"F\d{3}", " ".join(cite.findall(row)))
            if not ids and not row.startswith("Dates are") and not row.startswith("التواريخ"):
                print(f"{page.relative_to(ROOT)}: no fact ids: {row[:70]}..."); problems += 1
            for i in ids:
                used[lang].add(i)
                if i not in facts:
                    print(f"{page.relative_to(ROOT)}: unknown fact {i}"); problems += 1
for lang in ("en", "ar"):
    if not used[lang]:
        continue
    unused = sorted(set(facts) - used[lang])
    print(f"[{lang}] facts not used: {' '.join(unused) or 'none'}")
    flagged = sorted(i for i in used[lang] if facts[i]["status"] in ("check", "disputed"))
    print(f"[{lang}] used facts marked check/disputed: {' '.join(flagged) or 'none'}")
if used["en"] and used["ar"] and used["en"] != used["ar"]:
    print("English and Arabic cite different facts:")
    print("  only en:", " ".join(sorted(used["en"] - used["ar"])))
    print("  only ar:", " ".join(sorted(used["ar"] - used["en"])))
    problems += 1
print(f"{problems} problem(s).")
sys.exit(1 if problems else 0)
