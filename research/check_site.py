"""Check the built website (run after `jekyll build`): python3 research/check_site.py _site

- no fact codes (F001...) or Liquid tags left in any page
- no inline style="" or on...="" attributes (the security policy in _headers blocks them)
- every page has a title of at most 70 characters and a description
- the map data on each map page is valid JSON
- every link and file reference inside the site points to something that exists
"""
import html
import json
import re
import sys
from pathlib import Path

site = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
problems = []
pages = sorted(site.rglob("*.html"))


def exists(url):
    path = url.split("#")[0].split("?")[0]
    if not path or path == "/":
        return (site / "index.html").exists()
    target = site / path.lstrip("/")
    return target.is_file() or (target / "index.html").is_file() or target.with_name(target.name + ".html").is_file()


for page in pages:
    rel = page.relative_to(site)
    text = page.read_text(encoding="utf-8")
    body = re.sub(r"<script\b.*?</script>", "", text, flags=re.S)
    if re.search(r"\bF\d{3}\b", re.sub(r"<[^>]+>", " ", body)):
        problems.append(f"{rel}: fact code in the page text")
    if "{%" in text or "{{" in text:
        problems.append(f"{rel}: Liquid tag left in the page")
    if re.search(r"<[^>]+\sstyle=", text):
        problems.append(f"{rel}: inline style attribute")
    if re.search(r"<[^>]+\son[a-z]+=", text):
        problems.append(f"{rel}: inline event handler")
    title = re.search(r"<title>(.*?)</title>", text, re.S)
    if not title:
        problems.append(f"{rel}: no title")
    elif len(html.unescape(title.group(1))) > 70:
        problems.append(f"{rel}: title over 70 characters")
    if not re.search(r'<meta name="description" content="[^"]{10,}"', text):
        problems.append(f"{rel}: no description")
    for data in re.findall(r'<script type="application/json" class="map-data">(.*?)</script>', text, re.S):
        try:
            json.loads(data)
        except ValueError as e:
            problems.append(f"{rel}: map data is not valid JSON ({e})")
    for url in re.findall(r'(?:href|src|srcset)="(/[^"]*)"', text):
        if url.startswith("/api/"):
            continue
        if not exists(url):
            problems.append(f"{rel}: broken link {url}")

for p in problems:
    print(p)
print(f"{len(pages)} pages checked, {len(problems)} problem(s).")
sys.exit(1 if problems else 0)
