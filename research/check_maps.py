"""Check the chapter maps (_data/maps.yml, places.yml, regions.yml) against the fact base.

For every marker, route and region:
  - it has at least one fact code, and every code exists in facts.yml
  - none of its facts is one the site deliberately leaves out
  - every fact is cited in that chapter's text, in English AND Arabic,
    so a map never says more than the chapter does
  - every place it names exists in places.yml

Run from the repository root:  python3 research/check_maps.py
"""
import glob
import re
import sys

import yaml

EXCLUDED = {"F021", "F022", "F120", "F133", "F139"}  # not used on the site (see facts.yml notes)

facts = {f["id"]: f for f in yaml.safe_load(open("research/facts.yml"))}
places = yaml.safe_load(open("_data/places.yml"))
maps = yaml.safe_load(open("_data/maps.yml"))
regions = yaml.safe_load(open("_data/regions.yml"))


def cited(lang):
    """ref -> set of fact codes cited in that chapter's text."""
    out = {}
    for path in glob.glob(f"{lang}/chapters/*.md"):
        text = open(path, encoding="utf-8").read()
        ref = re.search(r"^ref:\s*(\S+)", text, re.M).group(1)
        codes = set()
        for block in re.findall(r"{%\s*comment\s*%}(.*?){%\s*endcomment\s*%}", text, re.S):
            codes |= set(re.findall(r"F\d{3}", block))
        out[ref] = codes
    return out


cited_en, cited_ar = cited("en"), cited("ar")
all_cited = set().union(*cited_en.values(), *cited_ar.values())
problems = []


def check_facts(where, codes, chapter=None):
    if not codes:
        problems.append(f"{where}: no fact codes")
    for c in codes or []:
        if c not in facts:
            problems.append(f"{where}: {c} is not in facts.yml")
        elif c in EXCLUDED:
            problems.append(f"{where}: {c} is a fact the site leaves out")
        elif chapter and (c not in cited_en.get(chapter, set()) or c not in cited_ar.get(chapter, set())):
            problems.append(f"{where}: {c} is not cited in the {chapter} chapter (EN and AR)")
        elif not chapter and c not in all_cited:
            problems.append(f"{where}: {c} is not cited anywhere on the site")


def check_place(where, pid):
    if pid not in places:
        problems.append(f"{where}: place '{pid}' is not in places.yml")


for pid, p in places.items():
    for key in ("en", "ar", "lat", "lon", "source"):
        if key not in p:
            problems.append(f"places.yml {pid}: missing {key}")
    if not (12 <= p.get("lat", 0) <= 32 and 34 <= p.get("lon", 0) <= 57):
        problems.append(f"places.yml {pid}: position outside the Arabian Peninsula")

for ref, m in maps.items():
    if m.get("overview") and set(m) == {"overview"}:
        continue  # overview maps show regions.yml only, checked below
    if ref not in cited_en or ref not in cited_ar:
        problems.append(f"maps.yml: '{ref}' is not a chapter ref")
        continue
    for i, p in enumerate(m.get("places", [])):
        where = f"{ref} place {p.get('id')}"
        check_place(where, p.get("id"))
        check_facts(where, p.get("facts"), ref)
    for e in m.get("events", []):
        where = f"{ref} event '{e.get('en')}'"
        check_place(where, e.get("place"))
        check_facts(where, e.get("facts"), ref)
        for key in ("kind", "en", "ar"):
            if not e.get(key):
                problems.append(f"{where}: missing {key}")
        if e.get("year") and e["year"] not in open(glob.glob(f"en/chapters/*-{ref}.md")[0], encoding="utf-8").read():
            problems.append(f"{where}: year {e['year']} does not appear in the chapter")
    for r in m.get("routes", []):
        where = f"{ref} route {'-'.join(r.get('path', []))}"
        for pid in r.get("path", []):
            check_place(where, pid)
        check_facts(where, r.get("facts"), ref)

for g in regions:
    check_facts(f"regions.yml {g['id']}", g.get("facts"))

for p in problems:
    print(p)
print(f"{len(problems)} problem(s).")
sys.exit(1 if problems else 0)
