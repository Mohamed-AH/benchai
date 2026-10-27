---
layout: default
lang: en
ref: home
title: "Home"
---

<div class="hero" markdown="1">
# King Abdulaziz: A History

The story of King Abdulaziz bin Abdulrahman Al Saud and the founding of the Third Saudi State, from the family's departure from Riyadh to the unification of the Kingdom.

Dates are given in the Hijri calendar (AH). See also the [timeline]({{ '/en/timeline.html' | relative_url }}).
</div>

## Chapters

<ol class="chapter-list">
{%- assign chapters = site.pages | where: "lang", "en" | where: "layout", "chapter" | sort: "order" -%}
{%- for c in chapters %}
  <li><a href="{{ c.url | relative_url }}">{{ c.title }}</a></li>
{%- endfor %}
</ol>
