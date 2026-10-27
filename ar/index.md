---
layout: default
lang: ar
ref: home
title: "الرئيسية"
---

<div class="hero" markdown="1">
# الملك عبدالعزيز: سيرة وتاريخ

سيرة الملك عبدالعزيز بن عبدالرحمن آل سعود وتأسيس الدولة السعودية الثالثة، من خروج الأسرة من الرياض إلى توحيد المملكة.

التواريخ بالتقويم الهجري. انظر أيضًا [الخط الزمني]({{ '/ar/timeline.html' | relative_url }}).
</div>

## الفصول

<ol class="chapter-list">
{%- assign chapters = site.pages | where: "lang", "ar" | where: "layout", "chapter" | sort: "order" -%}
{%- for c in chapters %}
  <li><a href="{{ c.url | relative_url }}">{{ c.title }}</a></li>
{%- endfor %}
</ol>
