# King Abdulaziz: A History · الملك عبدالعزيز: سيرة وتاريخ

A bilingual (English / Arabic) history website, published free with Cloudflare Pages .

## How to edit the text 

Every chapter is a plain Markdown file:

- English: `en/chapters/`
- Arabic: `ar/chapters/`

To edit on GitHub: open the file, click the pencil icon, change the text, then click **Commit changes**. The site updates by itself within a minute or two.

The block at the top of each file (between the `---` lines) holds settings:

| Field | Meaning |
|---|---|
| `title` | Chapter title shown on the site |
| `order` | Position in the chapter list |
| `ref` | Links the English and Arabic versions of the same chapter. Keep it identical in both. |
| `period` | Optional dates shown under the title, e.g. `1319–1320 AH` |

Markdown basics: `## Heading`, `**bold**`, `*italic*`, `> quotation`, a blank line starts a new paragraph.

### The main title

The King's name and the honorific (رحمه الله / may Allah have mercy on him) are set once in `_config.yml` under `king:`. They appear on the landing page, the home pages and the header. `title_en` and `title_ar` in the same file set the browser tab and footer text.

### Chapter maps

Every chapter and the timeline page has a 3D map, driven by three files in `_data/`:

| File | What it holds |
| --- | --- |
| `places.yml` | Each place's English and Arabic name, its position, and where the position comes from. `approximate: true` draws it as an area, not a point. `city: true` gives a major city a larger marker. `reference: true` shows the city faintly in grey on every map, so close-ups show where they sit in the country (these are today's cities, for orientation only). |
| `maps.yml` | For each chapter: the places, events (battles, sieges and so on, with captions in both languages) and routes to show. Every item lists the fact codes it rests on. |
| `regions.yml` | The historical regions and the year each joined, for the overview map. |

Close-up maps also get a small inset of the whole peninsula with the area shown outlined, and markers keep the same size on screen at any zoom, so a small town never looks as big as a city.

After editing them, run `python3 research/check_maps.py`. It checks that every item has fact codes, that those facts are cited in the chapter text in both languages, that no left-out fact is used, and that every place exists.

### Adding a chapter

Copy an existing chapter file in both `en/chapters/` and `ar/chapters/`, give both copies the same new `ref`, and set `order`.

## Sources (internal, not shown on the site)

The `research/` folder is kept in the repository but is not published on the website.

- `research/sources.yml`: every source, with an id (S1, S2, ...).
- `research/facts.yml`: one entry per claim, each with the source, timestamp, an exact quote, and a status (`from-source`, `check`, `disputed`, `opinion`, `verified`).
- `research/names.yml`: English and Arabic spellings of names and places, with the ones to check.
- `research/transcripts/`: source transcripts.

Each paragraph in a chapter ends with a hidden note such as `{% comment %}F058 F059{% endcomment %}` listing the facts it is based on. The website strips these out, so visitors never see them. If you rewrite a paragraph, keep the note (or update it).

See `research/README.md` for how to add a new source and how to run the checks.

Note: if this repository is public, anyone can still read the `research/` folder on GitHub. Cloudflare Pages works with private repositories on the free plan, so you can make the repository private if that matters.

## Hosting (Cloudflare Pages, free)

The site is built by Cloudflare Pages from the `main` branch. Every commit to `main`, including edits made on GitHub in the browser, republishes the site within a minute or two.

Settings used in Cloudflare (Workers & Pages → the project → Settings → Build):

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | Jekyll |
| Build command | `jekyll build` |
| Build output directory | `_site` |

## Preview locally (optional)

```bash
bundle install
bundle exec jekyll serve
```
